// lib/auth.ts
import * as SecureStore from 'expo-secure-store';

const KEY = 'userId';

export async function getUserId(): Promise<string | null> {
  try {
    const v = await SecureStore.getItemAsync(KEY);
    return v && v.length >= 6 ? v : null;
  } catch {
    return null;
  }
}

export async function setUserId(id: string): Promise<void> {
  if (!id || id.length < 6) return;
  try {
    await SecureStore.setItemAsync(KEY, id, {
      keychainService: 'dreamlens.user',
      accessible: SecureStore.AFTER_FIRST_UNLOCK, // iOS
    } as any);
  } catch {}
}

export async function clearUserId(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {}
}
