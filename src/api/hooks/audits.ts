/**
 * 审计域 React Query hooks（M4-T06）。
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listActiveConns,
  listAlarmAudits,
  listConnAudits,
  listConsoleAudits,
  listFileAudits,
  updateConnAuditNote,
  type AlarmAuditQuery,
  type ConnAuditQuery,
  type ConsoleAuditQuery,
  type FileAuditQuery,
} from "@/api/endpoints/audits";
import { qk } from "@/api/queryKeys";

/** 连接审计分页。 */
export function useConnAudits(params: ConnAuditQuery, enabled = true) {
  return useQuery({
    queryKey: qk.connAudits(params),
    queryFn: () => listConnAudits(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}

/** 活跃连接列表（devices.disconnect 权限 + scope 过滤由后端执行）。 */
export function useActiveConns(enabled = true) {
  return useQuery({
    queryKey: qk.activeConns(),
    queryFn: () => listActiveConns(),
    enabled,
  });
}

/** 文件审计分页。 */
export function useFileAudits(params: FileAuditQuery, enabled = true) {
  return useQuery({
    queryKey: qk.fileAudits(params),
    queryFn: () => listFileAudits(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}

/** 告警审计分页。 */
export function useAlarmAudits(params: AlarmAuditQuery, enabled = true) {
  return useQuery({
    queryKey: qk.alarmAudits(params),
    queryFn: () => listAlarmAudits(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}

/** 控制台审计分页。 */
export function useConsoleAudits(params: ConsoleAuditQuery, enabled = true) {
  return useQuery({
    queryKey: qk.consoleAudits(params),
    queryFn: () => listConsoleAudits(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}

/** 更新连接审计备注（SuperAdmin）→ 失效连接审计前缀。 */
export function useUpdateConnAuditNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; note: string }) => updateConnAuditNote(vars.id, vars.note),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["audits"] });
    },
  });
}
