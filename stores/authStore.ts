import { create } from "zustand";
import { authService, type AuthUser, type SupabaseSession } from "@/services/authService";
import { setAuthToken, setRefreshHandler } from "@/services/api";
import { clearSession, loadSession, saveSession } from "@/services/tokenStorage";

type AuthStatus = "hydrating" | "signedOut" | "signedIn";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  installRefreshHandler: () => void;
  hydrate: () => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    displayName?: string;
  }) => Promise<{ requiresEmailConfirmation: boolean }>;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

async function persistSession(session: SupabaseSession) {
  await saveSession({
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? null,
  });
  setAuthToken(session.access_token);
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "hydrating",
  user: null,

  // Chamado pelo api.ts sempre que uma requisição toma 401 no meio da
  // sessão. Devolve o token novo (pra requisição ser repetida) ou null,
  // caso em que o app volta pro login em vez de ficar quebrado em silêncio.
  installRefreshHandler: () => {
    setRefreshHandler(async () => {
      const stored = await loadSession();
      if (!stored?.refreshToken) return null;
      try {
        const result = await authService.refresh(stored.refreshToken);
        await persistSession(result.session);
        set({ user: result.user });
        return result.session.access_token;
      } catch {
        await clearSession();
        setAuthToken(null);
        set({ status: "signedOut", user: null });
        return null;
      }
    });
  },

  hydrate: async () => {
    const stored = await loadSession();
    if (!stored) {
      set({ status: "signedOut" });
      return;
    }

    // Access token expirado (dura 1h): tenta renovar com o refresh token
    // antes de desistir — só cai pro login se a renovação também falhar.
    if (stored.expiresAt && stored.expiresAt * 1000 < Date.now()) {
      try {
        const result = await authService.refresh(stored.refreshToken);
        await persistSession(result.session);
        set({ status: "signedIn", user: result.user });
      } catch {
        await clearSession();
        setAuthToken(null);
        set({ status: "signedOut" });
      }
      return;
    }

    setAuthToken(stored.accessToken);
    set({ status: "signedIn" });
  },

  register: async (input) => {
    const result = await authService.register(input);
    if (result.session && result.user) {
      await persistSession(result.session);
      set({ status: "signedIn", user: result.user });
    }
    return { requiresEmailConfirmation: result.requiresEmailConfirmation };
  },

  login: async (input) => {
    const result = await authService.login(input);
    await persistSession(result.session);
    set({ status: "signedIn", user: result.user });
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch {
      // Mesmo se a chamada de logout falhar (token já expirado, rede fora),
      // a sessão local é limpa de qualquer forma.
    } finally {
      await clearSession();
      setAuthToken(null);
      set({ status: "signedOut", user: null });
    }
  },
}));
