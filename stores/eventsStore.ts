// Encontros/rolês — hooks finos sobre React Query + apiService, mesmo
// padrão das outras stores.
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { ApiError, type PaginatedResult } from "@/services/api";
import { apiService, type CreateEventInput } from "@/services/apiService";
import type { CarEvent } from "@/types";

interface InfiniteEvents {
  pages: PaginatedResult<CarEvent>[];
  pageParams: unknown[];
}

/** Toda mudança em evento pode aparecer no calendário e na página do
 * organizador — as duas listas invalidam juntas. */
function invalidateEventLists(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["events"] });
  queryClient.invalidateQueries({ queryKey: ["events-by-organizer"] });
}

export interface EventFilters {
  city?: string;
  past?: boolean;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

export function useEvents(filters: EventFilters) {
  return useInfiniteQuery({
    // Centro e raio entram na chave: sem isso, mudar o raio devolveria a
    // lista antiga do cache.
    queryKey: [
      "events",
      filters.city ?? null,
      filters.past ?? false,
      filters.lat ?? null,
      filters.lng ?? null,
      filters.radiusKm ?? null,
    ],
    queryFn: ({ pageParam }) => apiService.getEvents(pageParam, 20, filters),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
  });
}

export function useEventById(id: string) {
  return useQuery({
    queryKey: ["event", id],
    queryFn: () => apiService.getEventById(id),
    enabled: !!id,
  });
}

export function useEventsByOrganizer(username: string | undefined) {
  return useQuery({
    queryKey: ["events-by-organizer", username],
    queryFn: () => apiService.getEventsByOrganizer(username!, 1, 30),
    enabled: !!username,
  });
}

export function useEventAttendees(eventId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ["event-attendees", eventId],
    queryFn: ({ pageParam }) => apiService.getEventAttendees(eventId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
    enabled,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEventInput) => apiService.createEvent(input),
    onSuccess: () => invalidateEventLists(queryClient),
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CreateEventInput> }) =>
      apiService.updateEvent(id, patch),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["event", variables.id] });
      invalidateEventLists(queryClient);
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiService.deleteEvent(id),
    onSuccess: () => invalidateEventLists(queryClient),
  });
}

export function useUploadEventPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, localUri }: { id: string; localUri: string }) =>
      apiService.uploadEventPhoto(id, localUri),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["event", variables.id] });
      invalidateEventLists(queryClient);
    },
  });
}

/**
 * Confirmar/desmarcar presença. Otimista como o curtir: o toque precisa
 * responder na hora, e o contador é o número que a pessoa está olhando.
 */
export function useToggleAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      attending,
      carId,
    }: {
      eventId: string;
      attending: boolean;
      /** Carro que vai levar. Opcional: confirmar continua sendo um toque. */
      carId?: string | null;
    }) => (attending ? apiService.unattendEvent(eventId) : apiService.attendEvent(eventId, carId)),
    onMutate: async ({ eventId, attending }) => {
      await queryClient.cancelQueries({ queryKey: ["events"] });
      await queryClient.cancelQueries({ queryKey: ["event", eventId] });

      const previousLists = queryClient.getQueriesData<InfiniteEvents>({ queryKey: ["events"] });
      const previousOne = queryClient.getQueryData<CarEvent | null>(["event", eventId]);

      const apply = (event: CarEvent): CarEvent =>
        event.id === eventId
          ? {
              ...event,
              attendingByMe: !attending,
              attendeesCount: Math.max(0, event.attendeesCount + (attending ? -1 : 1)),
            }
          : event;

      queryClient.setQueriesData<InfiniteEvents>({ queryKey: ["events"] }, (old) =>
        old
          ? { ...old, pages: old.pages.map((page) => ({ ...page, data: page.data.map(apply) })) }
          : old
      );
      queryClient.setQueryData<CarEvent | null>(["event", eventId], (old) =>
        old ? apply(old) : old
      );

      return { previousLists, previousOne };
    },
    onError: (err, variables, context) => {
      // Mesmo caso de curtida e follow: estes dois códigos significam que o
      // servidor já está no estado pedido, então desfazer mentiria na tela.
      const code = err instanceof ApiError ? err.code : undefined;
      if (code === "ALREADY_ATTENDING" || code === "ATTENDANCE_NOT_FOUND") return;

      context?.previousLists.forEach(([key, data]) => queryClient.setQueryData(key, data));
      if (context?.previousOne !== undefined) {
        queryClient.setQueryData(["event", variables.eventId], context.previousOne);
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: ["event", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-attendees", variables.eventId] });
      invalidateEventLists(queryClient);
    },
  });
}

/** Publicações marcadas com o rolê — o que o pessoal viveu lá. */
export function useEventPosts(eventId: string) {
  return useInfiniteQuery({
    queryKey: ["event-posts", eventId],
    queryFn: ({ pageParam }) => apiService.getPostsByEvent(eventId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
    enabled: !!eventId,
  });
}

/** Escolher, trocar ou tirar o carro que vai levar no rolê. */
export function useUpdateAttendanceCar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, carId }: { eventId: string; carId: string | null }) =>
      apiService.updateAttendanceCar(eventId, carId),
    onSuccess: (_data, variables) => {
      // A lista de confirmados é onde o carro aparece — é ela que precisa
      // recarregar, não o evento.
      queryClient.invalidateQueries({ queryKey: ["event-attendees", variables.eventId] });
    },
  });
}
