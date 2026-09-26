import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiService, type MaintenanceInput } from "@/services/apiService";

/**
 * Manutenção do carro — o que ele cobra sozinho (óleo, correia, pneu).
 *
 * Fica fora do projectStore de propósito: modificação mexe nos números do
 * projeto (investido, evolução) e manutenção não, então nenhuma das
 * invalidações de lá se aplica aqui.
 */
export function useManutencoes(carId: string) {
  return useQuery({
    queryKey: ["manutencoes", carId],
    queryFn: () => apiService.getMaintenances(carId),
    enabled: !!carId,
  });
}

function useMexerNaManutencao<T>(
  chamar: (args: T & { carId: string }) => Promise<unknown>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: T & { carId: string }) => chamar(args),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["manutencoes", variables.carId] });
    },
  });
}

export function useAddManutencao() {
  return useMexerNaManutencao<{ input: MaintenanceInput }>(({ carId, input }) =>
    apiService.createMaintenance(carId, input)
  );
}

export function useUpdateManutencao() {
  return useMexerNaManutencao<{ id: string; patch: Partial<MaintenanceInput> }>(({ id, patch }) =>
    apiService.updateMaintenance(id, patch)
  );
}

export function useRemoveManutencao() {
  return useMexerNaManutencao<{ id: string }>(({ id }) => apiService.deleteMaintenance(id));
}
