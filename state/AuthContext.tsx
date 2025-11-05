import React, { createContext, useEffect, useState, useMemo } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getUserId, setUserId } from '../lib/auth';

// same helper as Editor:
function inferLanIpFromExpo(): string | null {
  const hostUri =
    (Constants as any)?.expoConfig?.hostUri ||
    (Constants as any)?.manifest2?.extra?.expoGo?.developer?.host;
  if (!hostUri || typeof hostUri !== 'string') return null;
  const host = hostUri.split(':')[0].replace(/^https?:\/\//, '');
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ? host : null;
}

function getApiBase(): string {
  if (Platform.OS === 'android') return 'http://10.0.2.2:4000';
  const fromExpo = inferLanIpFromExpo();
  if (fromExpo) return `http://${fromExpo}:4000`;
  return 'http://127.0.0.1:4000';
}

export const AuthCtx = createContext<{ userId: string | null; API: string }>({ userId: null, API: '' });

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const API = useMemo(getApiBase, []);
  const [userId, setId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const existing = await getUserId();
      if (existing) return setId(existing);
      try {
        const r = await fetch(`${API}/api/auth/guest`, { method: 'POST' });
        const j = await r.json();
        if (j.userId) {
          setId(j.userId);
          await setUserId(j.userId);
        }
      } catch (e) {
        console.warn('guest auth failed', e);
      }
    })();
  }, [API]);

  const value = useMemo(() => ({ userId, API }), [userId, API]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
