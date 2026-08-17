/**
 * 权限守卫 Hook（M4-T03，设计 §4.3 / §4.4）。
 *
 * ============================================================================
 * ⚠️⚠️ 权限红线（最先读）：
 * 前端权限 **只做 UI 显隐 / 禁用**，**绝不是安全边界**。后端 RBAC 中间件在
 * **每次请求实时查库**（`Perm(code)` + `AssertDevicesAccess` / device_group scope）
 * 才是唯一权威判定。前端隐藏按钮**只是体验优化**；反之，前端若因快照过期误显按钮，
 * 后端也必须拒绝（403 兜底）。**任何「前端已隐藏所以后端可省校验」的表述均为错误**。
 * ============================================================================
 *
 * 三层守卫中的「逻辑层」：调用方用本 Hook 判定按钮/菜单/路由门槛。
 *
 * ★ device_group scope 二次判定：`scopes.device_group` 是 `{<设备组guid>: [生效码]}` 分档映射，
 *   设备域页面**必须**做「设备所属组 → 该组生效码」二次判定，**不可只看平铺 permissions 数组**；
 *   设备无组（guid 为空）时**保守隐藏**（除非 is_admin）。
 */
import { useCallback, useMemo } from "react";
import { usePermissionStore } from "@/stores/permissionStore";
import { useSessionStore } from "@/stores/sessionStore";

/** `can` 的选项。 */
export interface CanOptions {
  /**
   * 设备域专用：设备所属设备组 guid。
   * 提供后走 `scopes.device_group[deviceGroupGuid]` 二次判定；
   * 传空字符串或不传均视为「无该组」，按保守隐藏处理。
   */
  deviceGroupGuid?: string;
}

/** `usePermission` 返回值。 */
export interface UsePermissionResult {
  /** 单码判定 */
  can: (code: string, opts?: CanOptions) => boolean;
  /** 任一码通过 */
  canAny: (codes: readonly string[], opts?: CanOptions) => boolean;
  /** 全部码通过 */
  canAll: (codes: readonly string[], opts?: CanOptions) => boolean;
  /** 是否超管（UserPayload.is_admin） */
  isAdmin: boolean;
  /** 权限快照是否就绪 */
  ready: boolean;
}

/**
 * 权限判定 Hook。
 *
 * 判定顺序：
 * 1. `is_admin` 短路为 true（超管在任何 scope 全权，与后端 RequireSuperAdmin 语义一致）；
 * 2. 快照未就绪（eff === null）→ 保守返回 false（避免菜单闪烁与守卫误判）；
 * 3. 显式给出 `deviceGroupGuid` → 只看该组生效码（二次判定）；无组则保守 false；
 * 4. 否则看平铺 `permissions`（global + 所有组并集）。
 *
 * @returns 判定函数与状态
 */
export function usePermission(): UsePermissionResult {
  const eff = usePermissionStore((s) => s.eff);
  const isAdmin = useSessionStore((s) => s.user?.is_admin ?? false);

  const can = useCallback(
    (code: string, opts?: CanOptions): boolean => {
      // ① 超管短路（UI 层；后端 AdminGuard / RequireSuperAdmin 为准）
      if (isAdmin) return true;
      // ② 快照未就绪 → 保守隐藏
      if (!eff) return false;

      // ③ 设备组分档二次判定：显式「进入设备域上下文」时只看该组生效码
      //    opts.deviceGroupGuid !== undefined 表示调用方明确要求按设备组判定。
      if (opts !== undefined && opts.deviceGroupGuid !== undefined) {
        const guid = opts.deviceGroupGuid;
        if (guid.length === 0) {
          // 设备无组：按「无该组生效码」处理（保守隐藏）
          return false;
        }
        const codes = eff.scopes.device_group[guid] ?? [];
        return codes.includes(code);
      }

      // ④ 平铺判定（global + 所有组并集）
      return eff.permissions.includes(code);
    },
    [eff, isAdmin],
  );

  const canAny = useCallback(
    (codes: readonly string[], opts?: CanOptions): boolean => codes.some((c) => can(c, opts)),
    [can],
  );

  const canAll = useCallback(
    (codes: readonly string[], opts?: CanOptions): boolean => codes.every((c) => can(c, opts)),
    [can],
  );

  return useMemo(
    () => ({ can, canAny, canAll, isAdmin, ready: eff !== null }),
    [can, canAny, canAll, isAdmin, eff],
  );
}
