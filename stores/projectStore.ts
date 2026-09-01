// Modificações e projetos/etapas — mesmo padrão de garageStore.ts: hooks
// finos sobre React Query + apiService, sem cópia local dos dados.
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  apiService,
  type CreateModificationInput,
  type CreateProjectInput,
  type CreateStepInput,
} from "@/services/apiService";

/**
 * Toda mudança em etapa ou modificação faz o backend recalcular
 * budget_spent/modifications_done do projeto e project_progress/
 * amount_invested do carro — e esses dois últimos aparecem nos cards da
 * garagem e do explorar, não só na tela do projeto.
 */
function invalidateCarAggregates(queryClient: QueryClient, carId: string) {
  queryClient.invalidateQueries({ queryKey: ["project-by-car", carId] });
  queryClient.invalidateQueries({ queryKey: ["car", carId] });
  queryClient.invalidateQueries({ queryKey: ["my-garage"] });
  queryClient.invalidateQueries({ queryKey: ["explore-cars"] });
}

export function useModsByCar(carId: string) {
  return useQuery({
    queryKey: ["mods", carId],
    queryFn: () => apiService.getModsByCar(carId),
    enabled: !!carId,
  });
}

export function useAddModification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ carId, input }: { carId: string; input: CreateModificationInput }) =>
      apiService.createModification(carId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["mods", variables.carId] });
      invalidateCarAggregates(queryClient, variables.carId);
    },
  });
}

export function useUpdateModification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; carId: string; patch: Partial<CreateModificationInput> }) =>
      apiService.updateModification(id, patch),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["mods", variables.carId] });
      invalidateCarAggregates(queryClient, variables.carId);
    },
  });
}

export function useRemoveModification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; carId: string }) => apiService.deleteModification(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["mods", variables.carId] });
      invalidateCarAggregates(queryClient, variables.carId);
    },
  });
}

export function useProjectByCarId(carId: string) {
  return useQuery({
    queryKey: ["project-by-car", carId],
    queryFn: () => apiService.getProjectByCarId(carId),
    enabled: !!carId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ carId, input }: { carId: string; input: CreateProjectInput }) =>
      apiService.createProject(carId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["project-by-car", variables.carId] });
      // projectsCount do perfil muda.
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; carId: string; patch: Partial<CreateProjectInput> }) =>
      apiService.updateProject(id, patch),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["project-by-car", variables.carId] });
    },
  });
}

export function useAddProjectStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      input,
    }: {
      projectId: string;
      carId: string;
      input: CreateStepInput;
    }) => apiService.addProjectStep(projectId, input),
    onSuccess: (_data, variables) => invalidateCarAggregates(queryClient, variables.carId),
  });
}

export function useUpdateProjectStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      stepId,
      patch,
    }: {
      projectId: string;
      stepId: string;
      carId: string;
      patch: Partial<CreateStepInput>;
    }) => apiService.updateProjectStep(projectId, stepId, patch),
    onSuccess: (_data, variables) => invalidateCarAggregates(queryClient, variables.carId),
  });
}

export function useRemoveProjectStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, stepId }: { projectId: string; stepId: string; carId: string }) =>
      apiService.removeProjectStep(projectId, stepId),
    onSuccess: (_data, variables) => invalidateCarAggregates(queryClient, variables.carId),
  });
}
