/**
 * 服务器域 React Query hooks（M4-T05）。
 *
 * 服务器转发错误（503/400/404/502/504）由 `describeServerError` 归一化展示；
 * 本模块只做缓存与失效，错误映射在页面 catch 中处理。
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  disconnectServerSession,
  getServerBans,
  getServerServiceConfig,
  getServerServiceLogs,
  getServerBans as fetchServerBans,
  listServerNodes,
  listServerPeers,
  listServerSessions,
  runServerServiceAction,
  updateServerBans,
  updateServerServiceConfig,
  type NodeStatus,
  type ServerBansDto,
  type ServerService,
  type ServerServiceAction,
} from "@/api/endpoints/servers";
import { qk } from "@/api/queryKeys";

/** 节点状态列表（不可达节点以 reachable:false 出现，不整体失败）。 */
export function useServerNodes(enabled = true) {
  return useQuery({
    queryKey: qk.servers(),
    queryFn: listServerNodes,
    enabled,
  });
}

/** 单节点状态（从列表缓存中选取）。 */
export function useServerNode(node: string): NodeStatus | undefined {
  const query = useQuery({
    queryKey: qk.servers(),
    queryFn: listServerNodes,
  });
  return query.data?.find((n) => n.id === node);
}

/** 节点 peers（上游 JSON 透传）。 */
export function useServerPeers(node: string, enabled = true) {
  return useQuery({
    queryKey: qk.serverPeers(node),
    queryFn: () => listServerPeers(node),
    enabled: enabled && node.length > 0,
  });
}

/** 节点会话（上游 JSON 透传）。 */
export function useServerSessions(node: string, enabled = true) {
  return useQuery({
    queryKey: qk.serverSessions(node),
    queryFn: () => listServerSessions(node),
    enabled: enabled && node.length > 0,
  });
}

/** 服务配置。 */
export function useServerServiceConfig(node: string, service: ServerService, enabled = true) {
  return useQuery({
    queryKey: [...qk.servers(), node, "config", service],
    queryFn: () => getServerServiceConfig(node, service),
    enabled: enabled && node.length > 0,
  });
}

/** 服务日志。 */
export function useServerServiceLogs(node: string, service: ServerService, enabled = true) {
  return useQuery({
    queryKey: qk.serverLogs(node, service),
    queryFn: () => getServerServiceLogs(node, service),
    enabled: enabled && node.length > 0,
  });
}

/** 封禁名单。 */
export function useServerBans(node: string, enabled = true) {
  return useQuery({
    queryKey: qk.serverBans(node),
    queryFn: () => getServerBans(node),
    enabled: enabled && node.length > 0,
  });
}

/** 断开节点会话 → 失效该节点会话。 */
export function useDisconnectServerSession(node: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) => disconnectServerSession(node, uuid),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.serverSessions(node) });
    },
  });
}

/** 保存服务配置。 */
export function useSaveServerServiceConfig(node: string, service: ServerService) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Record<string, string>) => updateServerServiceConfig(node, service, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...qk.servers(), node, "config", service],
      });
    },
  });
}

/** 服务动作（start/stop/restart/apply）→ 失效配置与日志。 */
export function useServerServiceAction(node: string, service: ServerService) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: ServerServiceAction) => runServerServiceAction(node, service, action),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...qk.servers(), node, "config", service],
      });
      void queryClient.invalidateQueries({ queryKey: qk.serverLogs(node, service) });
    },
  });
}

/** 更新封禁名单。 */
export function useUpdateServerBans(node: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ServerBansDto) => updateServerBans(node, body),
    onSuccess: (_data, _vars) => {
      void queryClient.invalidateQueries({ queryKey: qk.serverBans(node) });
    },
  });
}

// re-export 供详情页复用读取函数（保持 hooks 模块为页面唯一 API 入口）
export { fetchServerBans };
