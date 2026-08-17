/**
 * 权限快照状态（M4-T03）。
 *
 * 归属：权限码快照为**客户端状态**（全站一份），进 Zustand；
 * 来源：`useQuery({ queryKey: qk.permissions, queryFn: () => myPermissions() })`，
 * 成功后 `setEff`。只读、全站复用，避免每页重复请求。
 *
 * ⚠️ 前端权限只做 UI 显隐/禁用，**不是安全边界**；后端每次请求实时查库为准。
 */
import { create } from "zustand";
import type { EffectivePermissions } from "@/types/domain";

/** 权限快照状态与动作。 */
export interface PermissionState {
  /** 生效权限快照（null = 未就绪） */
  eff: EffectivePermissions | null;
  /** 写入快照 */
  setEff: (eff: EffectivePermissions | null) => void;
  /** 重置快照（登出 / 角色变更前） */
  reset: () => void;
}

/** 权限 store。 */
export const usePermissionStore = create<PermissionState>()((set) => ({
  eff: null,
  setEff: (eff) => set({ eff }),
  reset: () => set({ eff: null }),
}));

/** 非 React 上下文读取快照。 */
export function getEffectivePermissions(): EffectivePermissions | null {
  return usePermissionStore.getState().eff;
}

/** 非 React 上下文重置快照。 */
export function resetEffectivePermissions(): void {
  usePermissionStore.getState().reset();
}
