import { api } from "./api";

export interface AuthUser {
  id: string;
  email: string | null;
}

// Session do Supabase Auth repassada como veio do backend — só tipamos os
// campos que o app realmente usa (access_token/refresh_token/expiração).
export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
}

interface RegisterResponse {
  user: AuthUser | null;
  session: SupabaseSession | null;
  requiresEmailConfirmation: boolean;
}

interface LoginResponse {
  user: AuthUser;
  session: SupabaseSession;
}

export const authService = {
  register: (input: { email: string; password: string; displayName?: string }) =>
    api.post<RegisterResponse>("/auth/register", input),
  login: (input: { email: string; password: string }) =>
    api.post<LoginResponse>("/auth/login", input),
  refresh: (refreshToken: string) => api.post<LoginResponse>("/auth/refresh", { refreshToken }),
  logout: () => api.post<{ success: boolean }>("/auth/logout"),
};
