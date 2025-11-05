import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeScreen } from '../components/SafeScreen';
import Constants from 'expo-constants';

// optional SecureStore
let SecureStore: any = null;
try { SecureStore = require('expo-secure-store'); } catch {}

const OVERRIDE_LAN_IP = '';
function inferLanIpFromExpo(): string | null {
  const hostUri = (Constants as any)?.expoConfig?.hostUri || (Constants as any)?.manifest2?.extra?.expoGo?.developer?.host;
  if (!hostUri || typeof hostUri !== 'string') return null;
  const host = hostUri.split(':')[0].replace(/^https?:\/\//, '');
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ? host : null;
}
function computeApiBase(): string {
  if (OVERRIDE_LAN_IP) return `http://${OVERRIDE_LAN_IP}:4000`;
  if (Platform.OS === 'android') return 'http://10.0.2.2:4000';
  const fromExpo = inferLanIpFromExpo();
  if (fromExpo) return `http://${fromExpo}:4000`;
  return 'http://127.0.0.1:4000';
}

type Comment = { id: string; postId: string; authorId: string; text: string; createdAt: number; };

export default function Comments({ route, navigation }: any) {
  const { postId } = route.params as { postId: string };
  const API = useMemo(computeApiBase, []);
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<Comment[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    // get or create guest
    (async () => {
      try {
        let id: string | null = null;
        if (SecureStore?.getItemAsync) id = await SecureStore.getItemAsync('userId');
        if (!id) {
          const r = await fetch(`${API}/api/auth/guest`, { method: 'POST' });
          const j = await r.json();
          if (j?.userId) {
            id = j.userId;
            if (SecureStore?.setItemAsync) await SecureStore.setItemAsync('userId', id);
          }
        }
        setUserId(id);
      } catch {}
    })();
  }, [API]);

  async function load() {
    const r = await fetch(`${API}/api/posts/${postId}/comments`);
    const j = await r.json();
    setItems(j.items || []);
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    const t = text.trim();
    if (!t) return;
    if (!userId) { alert('Not signed in'); return; }
    try {
      const r = await fetch(`${API}/api/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, authorId: userId, text: t }),
      });
      if (!r.ok) throw new Error('Failed');
      setText('');
      await load();
    } catch (e) {
      alert(String(e));
    }
  }

  return (
    <SafeScreen>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Text style={{ color: '#cbd5e1' }}>Close</Text>
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginLeft: 8 }}>Comments</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }}>
        {items.map(c => (
          <View key={c.id} style={{ backgroundColor: '#0b1026', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#1f2937' }}>
            <Text style={{ color: '#a78bfa', fontWeight: '700' }}>@{c.authorId.slice(0,6)}</Text>
            <Text style={{ color: '#e5e7eb', marginTop: 4 }}>{c.text}</Text>
            <Text style={{ color: '#64748b', marginTop: 6, fontSize: 12 }}>{new Date(c.createdAt).toLocaleString()}</Text>
          </View>
        ))}
        {!items.length && <Text style={{ color: '#94a3b8' }}>Be the first to comment.</Text>}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Write a comment…"
          placeholderTextColor="#64748b"
          style={{ flex: 1, color:'#e5e7eb', borderWidth:1, borderColor:'#334155', borderRadius:12, paddingHorizontal:12, paddingVertical:10 }}
        />
        <TouchableOpacity onPress={submit} style={{ backgroundColor:'#4f46e5', paddingHorizontal:16, paddingVertical:12, borderRadius:12 }}>
          <Text style={{ color:'#fff', fontWeight:'800' }}>Send</Text>
        </TouchableOpacity>
      </View>
    </SafeScreen>
  );
}
