// screens/Feed.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import Constants from 'expo-constants';
import { VideoView, useVideoPlayer } from 'expo-video';
import { SafeScreen } from '../components/SafeScreen';

// Try to use SecureStore if present, but don't crash if missing
let SecureStore: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SecureStore = require('expo-secure-store');
} catch { /* optional */ }

/* ---------------- API base helpers (device/emulator friendly) ---------------- */
const OVERRIDE_LAN_IP = ''; // ← set your PC LAN IP for testing on a real phone

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
  if (Platform.OS === 'android') return 'http://10.0.2.2:4000'; // Android emulator → host loopback
  const fromExpo = inferLanIpFromExpo();
  if (fromExpo) return `http://${fromExpo}:4000`;               // real device over LAN
  return 'http://127.0.0.1:4000';                           // iOS sim / fallback
}

/* ---------------- Types ---------------- */
type Post = {
  id: string;
  authorId: string;
  mediaUrl: string;
  caption?: string;
  createdAt: number;
  likes: string[];
  onOpenComments?: (id: string) => void; // injected at render
  onDelete?: (id: string) => void;       // injected at render
};

/* ---------------- Post Card (safe hooks usage) ---------------- */
function PostCard({
  post, userId, onLikeToggle,
}: {
  post: Post;
  userId: string | null;
  onLikeToggle: (id: string, liked: boolean) => void;
}) {
  const isVideo = /\.(mp4|mov|m4v|webm)$/i.test(post.mediaUrl);
  const player = useVideoPlayer(
    post.mediaUrl || '',
    (pl) => {
      pl.loop = true;
    },
    [post.mediaUrl]
  );
  const liked = !!(userId && post.likes.includes(userId));

  return (
    <View
      style={{
        backgroundColor: '#0b1026',
        borderRadius: 16,
        padding: 12,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: '#1f2937',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '700', marginBottom: 6 }}>
        {post.caption || 'Untitled'}
      </Text>

      <View
        style={{
          width: '100%',
          height: 220,
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: '#0b1026',
          borderWidth: 1,
          borderColor: '#1f2937',
        }}
      >
        {isVideo ? (
          <VideoView
            style={{ width: '100%', height: '100%' }}
            player={player}
            allowsFullscreen
            contentFit="contain"
          />
        ) : (
          <Image
            source={{ uri: post.mediaUrl }}
            style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
          />
        )}
      </View>

      {/* Action row (Delete visible; spacer used instead of marginLeft:'auto') */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
        <TouchableOpacity
          onPress={() => onLikeToggle(post.id, liked)}
          style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#334155' }}
        >
          <Text style={{ color: liked ? '#a78bfa' : '#cbd5e1' }}>
            {liked ? '♥ Liked' : '♡ Like'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => post.onOpenComments?.(post.id)}
          style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#334155' }}
        >
          <Text style={{ color: '#cbd5e1' }}>💬 Comments</Text>
        </TouchableOpacity>

        <Text style={{ color: '#94a3b8' }}>{post.likes.length} likes</Text>

        {/* spacer */}
        <View style={{ flex: 1 }} />

        <Text style={{ color: '#475569' }}>
          {new Date(post.createdAt).toLocaleString()}
        </Text>

        {userId && post.authorId === userId && (
          <TouchableOpacity
            onPress={() => post.onDelete?.(post.id)}
            style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#7f1d1d', marginLeft: 8 }}
          >
            <Text style={{ color: '#fecaca' }}>🗑 Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/* ---------------- Main Feed Screen ---------------- */
export default function Feed({ navigation }: any) {
  const API = useMemo(computeApiBase, []);
  const [userId, setUserId] = useState<string | null>(null);

  const [items, setItems] = useState<Post[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filter: 'all' | 'mine'
  const [filter, setFilter] = useState<'all' | 'mine'>('all');

  // Ensure we can reach API & have a guest userId
  useEffect(() => {
    (async () => {
      try { await fetch(`${API}/api/healthz`); } catch (e) { console.warn('Feed cannot reach API at', API, e); }
      // get/create guest
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
        console.warn('guest auth failed (Feed)', e);
      }
    })();
  }, [API]);

  const fetchPage = useCallback(
    async (initial: boolean) => {
      if (loading) return;
      setLoading(true);
      try {
        const url = new URL(`${API}/api/posts`);
        url.searchParams.set('limit', '20');
        if (!initial && next) url.searchParams.set('after', String(next));
        const r = await fetch(url.toString());
        const j = await r.json();
        if (initial) setItems(j.items || []);
        else setItems((prev) => [...prev, ...(j.items || [])]);
        setNext(j.next ?? null);
      } catch (e) {
        console.warn('fetch posts error', e);
      } finally {
        setLoading(false);
      }
    },
    [API, next, loading]
  );

  useEffect(() => { fetchPage(true); }, [fetchPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setNext(null);
    await fetchPage(true);
    setRefreshing(false);
  }, [fetchPage]);

  async function toggleLike(postId: string, isLiked: boolean) {
    if (!userId) { alert('Not signed in'); return; }
    try {
      const endpoint = isLiked ? 'unlike' : 'like';
      await fetch(`${API}/api/posts/${postId}/${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      setItems((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                likes: isLiked ? p.likes.filter((x) => x !== userId) : Array.from(new Set([...p.likes, userId])),
              }
            : p
        )
      );
    } catch (e) {
      console.warn('like/unlike error', e);
    }
  }

  // Apply client-side filter for "My Posts"
  const visibleItems = useMemo(() => {
    if (filter === 'all') return items;
    if (!userId) return []; // if not authenticated yet, show empty for "mine"
    return items.filter((p) => p.authorId === userId);
  }, [items, filter, userId]);

  const empty = !visibleItems.length && !loading;

  function confirmDelete(callback: () => void) {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: callback },
    ]);
  }

  return (
    <SafeScreen>
      <ScrollView
        style={{ flex: 1, backgroundColor: '#050812' }}
        contentContainerStyle={{ paddingBottom: 28, paddingHorizontal: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800' }}>Feed</Text>
          <View style={{ marginLeft: 'auto', flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setFilter('all')}
              style={{
                paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999,
                borderWidth: 1, borderColor: filter === 'all' ? '#7c3aed' : '#334155',
                backgroundColor: filter === 'all' ? '#1f1453' : 'transparent',
              }}
            >
              <Text style={{ color: filter === 'all' ? '#c4b5fd' : '#cbd5e1' }}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilter('mine')}
              style={{
                paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999,
                borderWidth: 1, borderColor: filter === 'mine' ? '#7c3aed' : '#334155',
                backgroundColor: filter === 'mine' ? '#1f1453' : 'transparent',
              }}
            >
              <Text style={{ color: filter === 'mine' ? '#c4b5fd' : '#cbd5e1' }}>My Posts</Text>
            </TouchableOpacity>
          </View>
        </View>

        {empty && (
          <View style={{ backgroundColor: '#0b1026', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1f2937' }}>
            <Text style={{ color: '#cbd5e1' }}>
              {filter === 'mine'
                ? 'You have no posts yet. Share from the Editor after generating a result.'
                : 'No posts yet. Try sharing from the Editor, or pull to refresh.'}
            </Text>
          </View>
        )}

        {visibleItems.map((p) => (
          <PostCard
            key={p.id}
            post={{
              ...p,
              onOpenComments: (id: string) => navigation.navigate('Comments', { postId: id }),
              onDelete: async (id: string) => {
                if (!userId) return alert('Not signed in');
                confirmDelete(async () => {
                  try {
                    await fetch(`${API}/api/posts/${id}`, {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ authorId: userId }),
                    });
                    setItems(prev => prev.filter(x => x.id !== id));
                  } catch (e) {
                    alert('Delete failed: ' + String(e));
                  }
                });
              },
            }}
            userId={userId}
            onLikeToggle={toggleLike}
          />
        ))}

        {/* Only show pagination when viewing All (server paging) */}
        {filter === 'all' && next && (
          <TouchableOpacity
            onPress={() => fetchPage(false)}
            style={{
              alignSelf: 'center',
              marginTop: 8,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: '#334155',
            }}
          >
            <Text style={{ color: '#cbd5e1' }}>{loading ? 'Loading…' : 'Load more'}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeScreen>
  );
}
