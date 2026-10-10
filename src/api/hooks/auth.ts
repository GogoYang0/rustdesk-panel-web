/**
 * 认证域 + 个人中心 + 仪表盘的域级 React Query hooks（M4-T04）。
 *
 * 约定（共享知识 13）：所有 queryKey 从 `api/queryKeys.ts` 取；失效用**前缀**匹配。
 * 页面只消费本模块的 hooks，不直接调用 `useQuery`/`api.*`（便于统一缓存策略与失效）。
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteMyAvatar,
  deletePasskey,
  disableTfa,
  listPasskeys,
  listSessions,
  passkeyTfaToggle,
  revokeSession,
  setupTfa,
  updateMe,
  uploadMyAvatar,
  verifyTfa,
} from "@/api/endpoints/auth";
import type { UpdateMeRequest } from "@/api/endpoints/auth";
import {
  getDashboardOverview,
  getDashboardTrends,
  type TrendRange,
} from "@/api/endpoints/dashboard";
import { qk } from "@/api/queryKeys";
import { useSessionStore } from "@/stores/sessionStore";

/** 当前用户会话列表（GET /api/sessions，5 分钟新鲜）。 */
export function useSessions() {
  return useQuery({
    queryKey: qk.sessions,
    queryFn: listSessions,
    staleTime: 60 * 1000,
  });
}

/** Passkey 凭据列表（GET /api/passkey/list）。 */
export function usePasskeys() {
  return useQuery({
    queryKey: qk.passkeys,
    queryFn: listPasskeys,
    staleTime: 60 * 1000,
  });
}

/** 仪表盘总览（GET /api/dashboard，60 秒新鲜）。 */
export function useDashboardOverview() {
  return useQuery({
    queryKey: qk.dashboard(),
    queryFn: getDashboardOverview,
    staleTime: 60 * 1000,
  });
}

/** 仪表盘趋势（GET /api/dashboard/trends?range=…）。 */
export function useDashboardTrends(range: TrendRange) {
  return useQuery({
    queryKey: qk.dashboardTrends(range),
    queryFn: () => getDashboardTrends(range),
    staleTime: 60 * 1000,
  });
}

/** 更新本人资料（PATCH /api/users/me）→ 刷新会话中的用户对象。 */
export function useUpdateMe() {
  const queryClient = useQueryClient();
  const setUser = useSessionStore((s) => s.setUser);
  return useMutation({
    mutationFn: (body: UpdateMeRequest) => updateMe(body),
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(qk.currentUser, user);
      void queryClient.invalidateQueries({ queryKey: qk.session });
    },
  });
}

/** 上传头像（POST /api/users/me/avatar）→ 失效会话查询以刷新头像。 */
export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const setUser = useSessionStore((s) => s.setUser);
  const user = useSessionStore((s) => s.user);
  return useMutation({
    mutationFn: (file: File) => uploadMyAvatar(file),
    onSuccess: (res) => {
      if (user) {
        setUser({ ...user, avatar: res.avatar });
      }
      void queryClient.invalidateQueries({ queryKey: qk.session });
    },
  });
}

/** 删除头像（DELETE /api/users/me/avatar）。 */
export function useDeleteAvatar() {
  const queryClient = useQueryClient();
  const setUser = useSessionStore((s) => s.setUser);
  const user = useSessionStore((s) => s.user);
  return useMutation({
    mutationFn: () => deleteMyAvatar(),
    onSuccess: () => {
      if (user) {
        setUser({ ...user, avatar: "" });
      }
      void queryClient.invalidateQueries({ queryKey: qk.session });
    },
  });
}

/** 初始化 TOTP 绑定（POST /api/2fa/setup）。 */
export function useSetupTfa() {
  return useMutation({ mutationFn: () => setupTfa() });
}

/** 校验并绑定 TOTP（POST /api/2fa/verify）→ 失效会话（tfa_enabled 变化）。 */
export function useVerifyTfa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tfaCode: string) => verifyTfa(tfaCode),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.session });
    },
  });
}

/** 关闭两步验证（DELETE /api/2fa）。 */
export function useDisableTfa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tfaCode: string) => disableTfa(tfaCode),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.session });
    },
  });
}

/** 撤销指定会话（DELETE /api/sessions/{jti}）。 */
export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jti: string) => revokeSession(jti),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.sessions });
    },
  });
}

/** 删除 Passkey 凭据（DELETE /api/passkey/{guid}）。 */
export function useDeletePasskey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guid: string) => deletePasskey(guid),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.passkeys });
    },
  });
}

/** Passkey 作为二次验证开关（POST /api/passkey/tfa）。 */
export function usePasskeyTfaToggle() {
  return useMutation({
    mutationFn: (enabled: boolean) => passkeyTfaToggle(enabled),
  });
}
