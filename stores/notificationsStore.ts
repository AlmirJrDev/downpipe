import { useEffect } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaginatedResult } from "@/services/api";
import { apiService } from "@/services/apiService";
import { useAuthStore } from "@/stores/authStore";
import { sincronizarBadge } from "@/services/webPush";
import type { AppNotification } from "@/types";

interface InfiniteNotifications {
  pages: PaginatedResult<AppNotification>[];
  pageParams: unknown[];
}

export function useNotifications(unreadOnly: boolean) {
  return useInfiniteQuery({
    queryKey: ["notifications", unreadOnly],
    queryFn: ({ pageParam }) => apiService.getNotifications(pageParam, 20, unreadOnly),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
  });
}

/**
 * Contador do sino. Revalida sozinho de tempos em tempos porque a
 * notificação nasce de ação de outra pessoa — nada no app dispararia a
 * atualização sem isso.
 */
export function useUnreadCount() {
  const status = useAuthStore((s) => s.status);
  const query = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: apiService.getUnreadCount,
    enabled: status === "signedIn",
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  // Mantém o número no ícone do app igual ao do sino, com o app aberto.
  // O caso de app fechado é o push que resolve sozinho (ver public/sw.js)
  // — aqui é só o complemento pra quando a pessoa está de fato usando.
  // Deslogar zera: sem isso o ícone ficaria com um número de uma conta
  // que não é mais a que está entrando.
  useEffect(() => {
    sincronizarBadge(status === "signedIn" ? (query.data ?? 0) : 0);
  }, [status, query.data]);

  return query;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiService.markNotificationRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previous = queryClient.getQueriesData<InfiniteNotifications>({
        queryKey: ["notifications"],
      });

      // Marca como lida na hora: o toque já abre outra tela, e esperar a
      // resposta faria o item piscar como não lido durante a navegação.
      const now = new Date().toISOString();
      queryClient.setQueriesData<InfiniteNotifications>({ queryKey: ["notifications"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: now } : n)),
          })),
        };
      });

      queryClient.setQueryData<number>(["notifications-unread"], (c) =>
        typeof c === "number" ? Math.max(0, c - 1) : c
      );

      return { previous };
    },
    onError: (_err, _id, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiService.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
}
