import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/services/apiService";
import { useAuthStore } from "@/stores/authStore";

/** Perfil completo (username/avatar/etc.) do usuário autenticado — /profile/me. */
export function useCurrentUser() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: ["me"],
    queryFn: apiService.getCurrentUser,
    enabled: status === "signedIn",
  });
}
