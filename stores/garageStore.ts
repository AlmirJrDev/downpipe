// Antes era um Zustand store que mutava uma cópia local de mocks/cars.ts —
// virou um conjunto de hooks finos sobre o cache do React Query + o backend
// real, pra não ter dois lugares (store local e servidor) achando que são
// donos da mesma lista de carros.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiService, type CreateCarInput } from "@/services/apiService";

export function useMyGarage() {
  return useQuery({ queryKey: ["my-garage"], queryFn: apiService.getMyGarage });
}

export function useCarById(id: string) {
  return useQuery({
    queryKey: ["car", id],
    queryFn: () => apiService.getCarById(id),
    enabled: !!id,
  });
}

export function useAddCar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCarInput) => apiService.createCar(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-garage"] });
      queryClient.invalidateQueries({ queryKey: ["explore-cars"] });
    },
  });
}

export function useUpdateCar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CreateCarInput> }) =>
      apiService.updateCar(id, patch),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["my-garage"] });
      queryClient.invalidateQueries({ queryKey: ["car", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["explore-cars"] });
    },
  });
}

export function useRemoveCar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiService.deleteCar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-garage"] });
      queryClient.invalidateQueries({ queryKey: ["explore-cars"] });
    },
  });
}

export function useUploadCarPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ carId, localUri }: { carId: string; localUri: string }) =>
      apiService.uploadCarPhoto(carId, localUri),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["car", variables.carId] });
      queryClient.invalidateQueries({ queryKey: ["my-garage"] });
      queryClient.invalidateQueries({ queryKey: ["explore-cars"] });
    },
  });
}

/**
 * Fotos de um carro — inclusive as tiradas por outras pessoas, depois que o
 * dono aceitou a marcação. O backend já filtra as pendentes.
 */
export function useCarPosts(carId: string) {
  return useQuery({
    queryKey: ["posts-by-car", carId],
    queryFn: () => apiService.getPostsByCar(carId, 1, 12),
    enabled: !!carId,
  });
}
