/**
 * 策略域 React Query hooks（M4-T05）。
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AssignTargetType,
  assignStrategy,
  createStrategy,
  deleteStrategy,
  getStrategy,
  listStrategyAssignments,
  listStrategies,
  unassignStrategy,
  updateStrategy,
  type AssignRequest,
  type StrategyListParams,
  type StrategyUpsertRequest,
} from "@/api/endpoints/strategies";
import { qk } from "@/api/queryKeys";

/** 策略列表。 */
export function useStrategies(query: StrategyListParams, enabled = true) {
  return useQuery({
    queryKey: qk.strategies(query),
    queryFn: () => listStrategies(query),
    enabled,
    placeholderData: (prev) => prev,
  });
}

/** 策略详情。 */
export function useStrategy(guid: string, enabled = true) {
  return useQuery({
    queryKey: qk.strategy(guid),
    queryFn: () => getStrategy(guid),
    enabled: enabled && guid.length > 0,
  });
}

/** 策略当前分配目标（target_type 决定响应 oneOf 分支）。 */
export function useStrategyAssignments(guid: string, query: { target_type: AssignTargetType; current: number; pageSize: number }, enabled = true) {
  return useQuery({
    queryKey: [...qk.strategy(guid), "assignments", query],
    queryFn: () => listStrategyAssignments(guid, query),
    enabled: enabled && guid.length > 0,
    placeholderData: (prev) => prev,
  });
}

/** 创建策略。 */
export function useCreateStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: StrategyUpsertRequest) => createStrategy(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["strategies"] });
    },
  });
}

/** 更新策略。 */
export function useUpdateStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { guid: string; body: StrategyUpsertRequest }) =>
      updateStrategy(vars.guid, vars.body),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["strategies"] });
      void queryClient.invalidateQueries({ queryKey: qk.strategy(vars.guid) });
    },
  });
}

/** 删除策略。 */
export function useDeleteStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guid: string) => deleteStrategy(guid),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["strategies"] });
    },
  });
}

/** 分配策略（device_group scope：调用方须先以组上下文 can 判定）。 */
export function useAssignStrategy(guid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AssignRequest) => assignStrategy(guid, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["strategies"] });
      void queryClient.invalidateQueries({ queryKey: ["device-groups"] });
      void queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

/** 回收策略。 */
export function useUnassignStrategy(guid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AssignRequest) => unassignStrategy(guid, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["strategies"] });
      void queryClient.invalidateQueries({ queryKey: ["device-groups"] });
      void queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}
