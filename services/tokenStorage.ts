// SecureStore não tem backend no web (expo-secure-store lança em runtime),
// então cai para localStorage lá. No nativo, sempre usa o keychain/keystore.
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "gearhead_session";

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
}

export async function loadSession(): Promise<StoredSession | null> {
  const raw =
    Platform.OS === "web"
      ? globalThis.localStorage?.getItem(KEY) ?? null
      : await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export async function saveSession(session: StoredSession): Promise<void> {
  const raw = JSON.stringify(session);
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(KEY, raw);
  } else {
    await SecureStore.setItemAsync(KEY, raw);
  }
}

export async function clearSession(): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage?.removeItem(KEY);
  } else {
    await SecureStore.deleteItemAsync(KEY);
  }
}
