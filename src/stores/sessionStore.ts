/**
 * 会话状态（M4-T03，被 T02 的请求层依赖）。
 *
 * 归属：会话（token、当前用户、登录态）为**客户端状态**，进 Zustand
 * （避免每页重复请求 + 供非 React 上下文如请求中间件读取）。
 *
 * ⚠️ 服务端数据（列表/详情/配置）**禁止**进 Zustand，一律 TanStack Query。
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UserPayload } from "@/types/domain";

/** 会话状态与动作。 */
export interface SessionState {
  /** JWT（null = 未登录）；用于 `Authorization: Bearer` 注入 */
  token: string | null;
  /** 当前用户 payload（snake_case 契约，来自 POST /api/currentUser） */
  user: UserPayload | null;
  /** 登录：写入 token 与用户 */
  login: (token: string, user?: UserPayload | null) => void;
  /** 仅更新用户（刷新 currentUser 时） */
  setUser: (user: UserPayload | null) => void;
  /** 退出登录（与 clear 等价，语义化命名） */
  logout: () => void;
  /** 清空会话（token + 用户）；401 统一处理时调用 */
  clear: () => void;
  /** 是否已登录（有 token） */
  isAuthenticated: () => boolean;
}

/**
 * 会话 store。
 *
 * 持久化：仅持久化 `token` 与 `user` 到 localStorage（key = `rdp-session`），
 * 刷新页面后可快速恢复登录态（随后由 currentUser 请求校验有效性）。
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      login: (token, user = null) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
      clear: () => set({ token: null, user: null }),
      isAuthenticated: () => get().token !== null,
    }),
    {
      name: "rdp-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);

/** 非 React 上下文读取 token（供请求中间件使用）。 */
export function getSessionToken(): string | null {
  return useSessionStore.getState().token;
}

/** 非 React 上下文清空会话（供 401 统一处理使用）。 */
export function clearSession(): void {
  useSessionStore.getState().clear();
}
