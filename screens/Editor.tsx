import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, Image,
  Platform, Animated, Easing, TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { VideoView, useVideoPlayer } from 'expo-video';
import { SafeScreen } from '../components/SafeScreen';
// Use legacy API to avoid deprecation warnings on SDK 54
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Alert } from 'react-native';

// --- (optional) pull userId/API from AuthCtx if your app provides it ---
let AuthCtx: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AuthCtx = require('../state/AuthContext').AuthCtx;
} catch { /* not using context yet */ }

// --- try to use SecureStore if installed, but don't crash if missing ---
let SecureStore: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SecureStore = require('expo-secure-store');
} catch { /* ok to run without */ }

const STYLES = ['Anime','Pixar','Cyberpunk','Watercolor','Lego','Sketch','Oil Paint','Cinematic'];

/** ============ API Base Detection (device/emulator friendly) ============ */
const OVERRIDE_LAN_IP = ''; //'192.168.1.248'; // e.g. '192.168.1.23' if using a real phone with Windows PC

function inferLanIpFromExpo(): string | null {
  const hostUri =
    (Constants as any)?.expoConfig?.hostUri ||
    (Constants as any)?.manifest2?.extra?.expoGo?.developer?.host;
  if (!hostUri || typeof hostUri !== 'string') return null;
  const host = hostUri.split(':')[0].replace(/^https?:\/\//, '');
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ? host : null;
}

function computeApiBase(): string {
  if (OVERRIDE_LAN_IP) return `http://${OVERRIDE_LAN_IP}:4000`;
  if (Platform.OS === 'android') return 'http://10.0.2.2:4000'; // Android emulator
  const fromExpo = inferLanIpFromExpo();
  if (fromExpo) return `http://${fromExpo}:4000`;               // Real device over LAN
  return 'http://127.0.0.1:4000';                           // iOS sim on Mac / fallback
}

/** ===================== Progress Bar (indeterminate/determinate) ===================== */
function ProgressBar({
  progress, indeterminate, label,
}: { progress: number; indeterminate?: boolean; label?: string }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (indeterminate) {
      anim.setValue(0);
      const loop = Animated.loop(
        Animated.timing(anim, {
          toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true,
        })
      );
      loop.start();
      return () => loop.stop();
    } else {
      anim.stopAnimation();
    }
  }, [indeterminate]);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [-60, 260] });
  const widthPct = Math.min(100, Math.max(0, progress));

  return (
    <View style={{ marginTop: 12 }}>
      <View
        style={{
          height: 12, borderRadius: 999, backgroundColor: '#111827',
          borderWidth: 1, borderColor: '#1f2937', overflow: 'hidden',
        }}
      >
        {indeterminate ? (
          <Animated.View
            style={{
              width: 60, height: '100%', borderRadius: 999, backgroundColor: '#6366f1',
              transform: [{ translateX }],
            }}
          />
        ) : (
          <View style={{ width: `${widthPct}%`, height: '100%', borderRadius: 999, backgroundColor: '#6366f1' }} />
        )}
      </View>
      <Text style={{ color: '#cbd5e1', marginTop: 6 }}>{label ?? 'Processing'} — {Math.round(widthPct)}%</Text>
    </View>
  );
}

/** ===================== Main Screen ===================== */
export default function Editor() {
  const ctx = AuthCtx ? useContext(AuthCtx) : { userId: null, API: null };
  const API = useMemo(() => ctx?.API || computeApiBase(), [ctx?.API]);

  // Auth/user
  const [userId, setUserId] = useState<string | null>(ctx?.userId || null);

  // Style + local media
  const [pickedStyle, setPickedStyle] = useState<string | null>(null);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState<boolean>(false);

  // Uploaded URL for the job
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  // Job state
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobState, setJobState] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  // Result URL (final render or fallback to uploaded file)
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // Share
  const [caption, setCaption] = useState<string>('');

  // Video players
  const localPlayer = useVideoPlayer(mediaUri || '', (player) => { player.loop = true; }, [mediaUri]);
  const resultPlayer = useVideoPlayer(resultUrl || '', (player) => { player.loop = false; }, [resultUrl]);

  /** ---------- Ensure we can reach API & have a user id (guest) ---------- */
  useEffect(() => {
    (async () => {
      // reach API
      try {
        const r = await fetch(`${API}/api/healthz`);
        await r.json();
      } catch (e) {
        console.warn('Cannot reach API at', API, e);
      }

      // hydrate userId: prefer AuthCtx, else SecureStore guest
      if (!userId) {
        try {
          let id: string | null = null;
          if (SecureStore?.getItemAsync) id = await SecureStore.getItemAsync('userId');
          if (!id) {
            const resp = await fetch(`${API}/api/auth/guest`, { method: 'POST' });
            const j = await resp.json();
            if (j?.userId) {
              id = j.userId;
              if (SecureStore?.setItemAsync) await SecureStore.setItemAsync('userId', id);
            }
          }
          if (id) setUserId(id);
        } catch (e) {
          console.warn('guest auth failed', e);
        }
      }
    })();
  }, [API]);

  /** ---------- Helpers ---------- */
  function looksLikeVideoFromUri(uri: string, type?: string | null) {
    const ext = uri.split('?')[0].split('.').pop()?.toLowerCase();
    return type === 'video' || ['mp4','mov','m4v','webm'].includes(ext || '');
  }

  async function uploadMedia(localUri: string): Promise<string> {
    const form = new FormData();
    const name = localUri.split('/').pop() || 'upload.bin';
    const ext = name.split('.').pop()?.toLowerCase();
    const mime =
      ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
      ext === 'png' ? 'image/png' :
      ext === 'mp4' ? 'video/mp4' :
      ext === 'mov' ? 'video/quicktime' :
      'application/octet-stream';
    // @ts-ignore RN FormData file
    form.append('file', { uri: localUri, name, type: mime });

    const r = await fetch(`${API}/api/media/upload`, { method: 'POST', headers: { Accept: 'application/json' }, body: form });
    if (!r.ok) throw new Error(`Upload failed: ${r.status}`);
    const j = await r.json();
    if (!j?.url) throw new Error('No url returned');
    return j.url;
  }

  /** ---------- Picker ---------- */
  async function pickMedia() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { alert('Please allow Photo Library access.'); return; }

      const hasNew = !!(ImagePicker as any).MediaType; // SDK 54+
      const opts: ImagePicker.ImagePickerOptions = hasNew
        ? { mediaTypes: [(ImagePicker as any).MediaType.image, (ImagePicker as any).MediaType.video], allowsMultipleSelection: false, selectionLimit: 1, quality: 1 }
        : { mediaTypes: ImagePicker.MediaTypeOptions.All as any, allowsMultipleSelection: false, selectionLimit: 1, quality: 1 };

      const res = await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled) return;

      const asset = res.assets?.[0];
      if (!asset) return;

      setMediaUri(asset.uri);
      setIsVideo(looksLikeVideoFromUri(asset.uri, asset.type));

      setUploadedUrl(null);
      const url = await uploadMedia(asset.uri);
      setUploadedUrl(url);
      setResultUrl(null);
      setJobId(null);
      setProgress(0);
      setJobState(null);
      console.log('Uploaded to', url);
    } catch (e) {
      console.warn('pickMedia error', e);
      alert('Could not open picker or upload: ' + String(e));
    }
  }

  /** ---------- Jobs ---------- */
  async function enqueueJob() {
    if (!pickedStyle) return alert('Choose a style first.');
    if (!uploadedUrl) return alert('Upload a file first.');

    setResultUrl(null);
    setJobId(null);
    setProgress(0);
    setJobState('queued');

    try {
      const body = { style: pickedStyle, mediaUrl: uploadedUrl };
      const r = await fetch(`${API}/api/jobs`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const j = await r.json();
      if (j?.id) { setJobId(String(j.id)); pollStatus(String(j.id)); }
      else alert('Failed to enqueue job');
    } catch (e) {
      alert('Network error: ' + String(e));
    }
  }

  function pollStatus(id: string) {
    setProgress(0);
    setJobState('queued');

    const t = setInterval(async () => {
      try {
        const r = await fetch(`${API}/api/jobs/${id}`);
        const j = await r.json();

        if (typeof j.state === 'string') setJobState(j.state);
        if (typeof j.progress === 'number') setProgress(j.progress);

        if (j.state === 'completed') {
          setProgress(100);
          // Use server output if available; otherwise fallback to uploadedUrl so you always see a result
          const out = j?.returnvalue?.outputUrl || uploadedUrl || null;
          setResultUrl(out);
          clearInterval(t);
        }
        if (j.state === 'failed') {
          clearInterval(t);
          alert('Job failed');
        }
      } catch {
        /* ignore transient errors */
      }
    }, 1000);
  }

  /** ---------- Share to feed ---------- */
  async function ensureUserId(): Promise<string | null> {
    if (userId) return userId;
    // try SecureStore or create guest
    try {
      let id: string | null = null;
      if (SecureStore?.getItemAsync) id = await SecureStore.getItemAsync('userId');
      if (!id) {
        const resp = await fetch(`${API}/api/auth/guest`, { method: 'POST' });
        const j = await resp.json();
        if (j?.userId) {
          id = j.userId;
          if (SecureStore?.setItemAsync) await SecureStore.setItemAsync('userId', id);
        }
      }
      if (id) setUserId(id);
      return id;
    } catch {
      return null;
    }
  }

  async function shareToFeed() {
    if (!resultUrl) { alert('No result to share yet.'); return; }
    const id = await ensureUserId();
    if (!id) { alert('Cannot sign in as guest.'); return; }

    try {
      const r = await fetch(`${API}/api/posts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorId: id, mediaUrl: resultUrl, caption }),
      });
      if (!r.ok) throw new Error('Create post failed');
      setCaption('');
      alert('Shared to feed!');
    } catch (e) {
      alert(String(e));
    }
  }

  /* -------- Save To Photos --------*/
  async function saveToGallery(remoteUrl: string) {
  try {
    // Ask permission first
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to save media.');
      return;
    }

    // Pick a filename (fallback to timestamp if URL has no name)
    const urlPath = remoteUrl.split('?')[0];
    const baseName = urlPath.split('/').pop() || `dreamlens-${Date.now()}`;
    const fileUri = FileSystem.cacheDirectory + baseName;

    // Download to temp file
    const dl = FileSystem.createDownloadResumable(remoteUrl, fileUri);
    const { uri } = await dl.downloadAsync();
    if (!uri) throw new Error('Download failed');

    // Save to Photos and album
    const asset = await MediaLibrary.createAssetAsync(uri);
    await ensureAlbumAndAdd('DreamLens AI', asset);

    Alert.alert('Saved', 'Your creation has been saved to Photos.');
  } catch (err: any) {
    console.warn('saveToGallery error', err);
    Alert.alert('Save failed', String(err?.message || err));
  }
}

async function ensureAlbumAndAdd(albumName: string, asset: MediaLibrary.Asset) {
  // Try to find existing album; if missing, create it.
  const albums = await MediaLibrary.getAlbumsAsync();
  const album = albums.find(a => a.title === albumName);
  if (album) {
    await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
  } else {
    await MediaLibrary.createAlbumAsync(albumName, asset, false);
  }
}

  const isIndeterminate = jobId && ['waiting','queued','delayed'].includes(jobState || '');

  /** ===================== UI ===================== */
  return (
   
    <SafeScreen scroll>
      <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 10 }}>Remix Editor</Text>
      <Text style={{ color: '#cbd5e1', marginBottom: 12 }}>Upload a photo or video, then choose an AI style.</Text>

      <View style={{ flexDirection: 'row', gap: 10, marginVertical: 8 }}>
        <TouchableOpacity style={pill()} onPress={pickMedia}>
          <Text style={pillText()}>Upload</Text>
        </TouchableOpacity>
        <TouchableOpacity style={pill()} onPress={() => setPickedStyle(STYLES[0])}>
          <Text style={pillText()}>Choose Style</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {STYLES.map(s => (
            <TouchableOpacity key={s} style={chip()} onPress={() => setPickedStyle(s)}>
              <Text style={{ color: '#e5e7eb', fontWeight: '700' }}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View
        style={{
          height: 220, borderRadius: 16, borderWidth: 1, borderColor: '#1f2937',
          backgroundColor: '#0b1026', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}
      >
        {mediaUri ? (
          isVideo ? (
            <VideoView
              style={{ width: '100%', height: '100%' }}
              player={localPlayer}
              allowsFullscreen
              allowsPictureInPicture
              contentFit="contain"
            />
          ) : (
            <Image source={{ uri: mediaUri }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
          )
        ) : (
          <Text style={{ color: '#94a3b8' }}>
            {pickedStyle ? `Preview: ${pickedStyle}` : 'Your preview will appear here'}
          </Text>
        )}
      </View>

      {jobId && (
        <>
          <Text style={{ color: '#cbd5e1', marginTop: 10 }}>Job: {jobId} — {jobState ?? 'queued'}</Text>
          <ProgressBar
            progress={progress}
            indeterminate={!!isIndeterminate}
            label={
              isIndeterminate ? 'Queued'
              : jobState === 'active' ? 'Rendering'
              : jobState === 'completed' ? 'Completed'
              : jobState === 'failed' ? 'Failed'
              : 'Processing'
            }
          />
        </>
      )}

      {resultUrl && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ color: '#cbd5e1', marginBottom: 6 }}>Result</Text>
          {
            /\.(mp4|mov|m4v|webm)$/i.test(resultUrl)
              ? (
                <VideoView
                  style={{ width: '100%', height: 220 }}
                  player={resultPlayer}
                  allowsFullscreen
                  contentFit="contain"
                />
              )
              : (
                <Image source={{ uri: resultUrl }} style={{ width: '100%', height: 220, resizeMode: 'contain' }} />
              )
          }

          {/* Caption + Share */}
          <View style={{ marginTop: 12 }}>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Write a caption…"
              placeholderTextColor="#64748b"
              style={{ color:'#e5e7eb', borderWidth:1, borderColor:'#334155', borderRadius:12, paddingHorizontal:12, paddingVertical:10, marginBottom:8 }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={shareToFeed}
                style={{ backgroundColor:'#22c55e', paddingVertical:12, paddingHorizontal:16, borderRadius:12 }}
              >
                <Text style={{ color:'#051014', fontWeight:'800' }}>Share to Feed</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (!resultUrl && !uploadedUrl) { Alert.alert('No media', 'Generate or upload first.'); return; }
                  saveToGallery(resultUrl ?? uploadedUrl!);
                }}
                style={{ backgroundColor:'#0ea5e9', paddingVertical:12, paddingHorizontal:16, borderRadius:12, marginLeft: 8 }}
              >
                <Text style={{ color:'#051014', fontWeight:'800' }}>Save to Photos</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={{ backgroundColor: '#4f46e5', paddingVertical: 14, paddingHorizontal: 22, borderRadius: 16, marginTop: 12 }}
        onPress={enqueueJob}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>Generate</Text>
      </TouchableOpacity>
    </SafeScreen>
  );
}

/* ---- tiny style helpers ---- */
function pill() {
  return {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#111827',
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999,
    borderWidth: 1, borderColor: '#1f2937',
  } as const;
}
function pillText() { return { color: '#e5e7eb', fontWeight: '600' } as const; }
function chip() {
  return {
    backgroundColor: '#0b1026', borderColor: '#1f2937', borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999,
  } as const;
}
