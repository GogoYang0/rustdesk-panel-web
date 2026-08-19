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
 *   设备无组时**保守隐藏**（除非 is_admin）。
 *
 * ★ 运行时健壮性（M4-T02/T03 修复批次 DEV-01 / DEV-01b）：
 *   契约中 `DeviceView.deviceGroupGuid` 为 **`string | null`**（无组设备的真实取值是 `null`），
 *   且 `scopes.device_group` 可能因后端裁剪快照 / 旧版本数据而**整体缺失**。
 *   本 Hook 对 `null` / `undefined` / 空串 / 分档缺失**一律按「无该组生效码」保守返回 false**，
 *   绝不抛异常（抛异常会被 `ErrorBoundary` 捕获导致整页渲染失败）。
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePermissionStore } from "@/stores/permissionStore";
import { useSessionStore } from "@/stores/sessionStore";

/**
 * `can` 的选项。
 */
export interface CanOptions {
  /**
   * 设备域专用：设备所属设备组 guid。
   *
   * 类型与契约 `DeviceView.deviceGroupGuid` 保持一致（`string | null`）——
   * 无组设备的真实取值是 `null`，调用方可能原样透传。
   *
   * 语义：**只要该键出现**（含 `null` / `undefined` / 空串 / 纯空白），
   * 即视为「调用方明确要求按设备组上下文判定」：
   * 此时**只**看 `scopes.device_group[guid]` 的生效码，不做平铺回退；
   * 无有效 guid 或该组无生效码 → 保守返回 `false`（除非 `is_admin`）。
   */
  deviceGroupGuid?: string | null;
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
 * 取设备组 guid 的规范形式。
 *
 * 契约允许 `null`，历史/手写数据可能给 `undefined`；两者与空串、
 * 纯空白串一律视为「无该组」。
 *
 * @param guid 原始 guid（`string | null | undefined`）
 * @returns 去除首尾空白后的非空 guid；无有效 guid 时为 `null`
 */
export function normalizeDeviceGroupGuid(guid: unknown): string | null {
  if (typeof guid !== "string") return null;
  const trimmed = guid.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * 从权限快照中读取某设备组的生效码数组。
 *
 * ★ DEV-01b：`scopes` 整体或 `scopes.device_group` 分档均可能缺失
 * （后端裁剪快照 / 旧版本数据），必须逐层判空，缺失即视为「无该组生效码」。
 *
 * @param eff 权限快照（可能为 null）
 * @param guid 规范后的设备组 guid（非空）
 * @returns 该组生效码数组；任何一层缺失均返回空数组
 */
export function readDeviceGroupCodes(
  eff: EffectivePermissionsLike | null,
  guid: string,
): readonly string[] {
  if (!eff || typeof eff !== "object") return [];
  const scopes = eff.scopes;
  if (!scopes || typeof scopes !== "object") return [];
  const deviceGroup = scopes.device_group;
  if (!deviceGroup || typeof deviceGroup !== "object") return [];
  const codes = deviceGroup[guid];
  return Array.isArray(codes) ? codes : [];
}

/** `readDeviceGroupCodes` 的最小结构约束（避免运行时字段缺失导致崩溃）。 */
interface EffectivePermissionsLike {
  /** 平铺生效码 */
  permissions?: readonly string[];
  /** 分档生效码 */
  scopes?: {
    /** 全局生效码 */
    global?: readonly string[];
    /** 设备组分档（可能整体缺失） */
    device_group?: Record<string, readonly string[]>;
  };
}

/** 在 DEV 环境下打印一次性的契约违例告警（不抛异常）。 */
function warnContractViolation(reason: string, ctx: { code: string; guid: unknown }): void {
  if (import.meta.env.DEV) {
    console.warn(`[usePermission] 权限快照与契约不符：${reason}`, ctx);
  }
}

/**
 * 权限判定 Hook。
 *
 * 判定顺序：
 * 1. `is_admin` 短路为 true（超管在任何 scope 全权，与后端 RequireSuperAdmin 语义一致）；
 * 2. 快照未就绪（eff === null）→ 保守返回 false（避免菜单闪烁与守卫误判）；
 * 3. 显式进入设备域上下文（`opts` 给出 `deviceGroupGuid` 键，含 null/空串）
 *    → 只看该组生效码（二次判定）；无有效 guid 或分档缺失则保守 false；
 * 4. 否则看平铺 `permissions`（global + 所有组并集）。
 *
 * @returns 判定函数与状态
 */
export function usePermission(): UsePermissionResult {
  const eff = usePermissionStore((s) => s.eff);
  const isAdmin = useSessionStore((s) => s.user?.is_admin ?? false);
  // 告警去重：同一契约违例只告警一次，避免渲染热路径刷屏
  const warnedKeysRef = useRef<Set<string>>(new Set());
  // 快照是否缺 `scopes.device_group` 分档（DEV-01b 场景，仅用于 DEV 告警）
  const scopesMissingRef = useRef<boolean>(false);

  // DEV 提示：快照就绪但缺 `scopes.device_group` 分档 —— 按契约不应发生，
  // 但为兼容裁剪快照/旧数据不抛异常，仅告警一次。
  useEffect(() => {
    const missing = eff !== null && !hasDeviceGroupScope(eff);
    scopesMissingRef.current = missing;
    if (missing && !warnedKeysRef.current.has("scopes.device_group")) {
      warnedKeysRef.current.add("scopes.device_group");
      if (import.meta.env.DEV) {
        console.warn("[usePermission] 权限快照缺少 `scopes.device_group` 分档，设备组判定将保守返回 false");
      }
    }
  }, [eff]);

  const can = useCallback(
    (code: string, opts?: CanOptions): boolean => {
      // ① 超管短路（UI 层；后端 AdminGuard / RequireSuperAdmin 为准）
      if (isAdmin) return true;
      // ② 快照未就绪 → 保守隐藏
      if (!eff) return false;

      // ③ 设备组分档二次判定：调用方给出**赋值了** `deviceGroupGuid` 时，
      //    一律只在设备组上下文中判定，**不做平铺回退**（防越权）：
      //    - `null`（契约 `DeviceView.deviceGroupGuid` 的真实无组取值）、
      //      空串 / 纯空白串 → 「无该组」→ 保守 false；
      //    - 合法 guid → 只看 `scopes.device_group[guid]` 的生效码（DEV-01b：分档缺失 → 空数组 → false）。
      //
      //    ★ 判定条件使用 `opts.deviceGroupGuid !== undefined`（值语义）：`{}` 与
      //      `{ deviceGroupGuid: undefined }` 均视为「未进入设备域上下文」→ 走平铺判定。
      //      切勿改为 `"deviceGroupGuid" in opts` —— `{}` 上 `in` 为 false，但显式
      //      `{ deviceGroupGuid: undefined }` 上为 true，会引入不一致行为（已实测确认）。
      if (opts !== undefined && opts.deviceGroupGuid !== undefined) {
        // DEV-01：`null` 必须按「无该组」处理，且**不得**对其取 `.length`
        //（原实现抛 `TypeError: Cannot read properties of null` 导致整页崩溃）。
        const rawGuid: unknown = opts.deviceGroupGuid;
        const guid = normalizeDeviceGroupGuid(rawGuid);
        if (guid === null) {
          if (typeof rawGuid === "string" && !warnedKeysRef.current.has("blank-guid")) {
            warnedKeysRef.current.add("blank-guid");
            warnContractViolation("设备组 guid 为无效值（空串/空白串）", { code, guid: rawGuid });
          }
          return false;
        }
        return readDeviceGroupCodes(eff, guid).includes(code);
      }

      // ④ 平铺判定（global + 所有组并集）
      return Array.isArray(eff.permissions) ? eff.permissions.includes(code) : false;
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

/**
 * 判断快照是否带 `scopes.device_group` 分档（用于 DEV 告警）。
 *
 * @param eff 权限快照
 * @returns 是否具备 `scopes.device_group` 对象
 */
function hasDeviceGroupScope(eff: EffectivePermissionsLike | null): boolean {
  if (!eff || typeof eff !== "object") return false;
  const deviceGroup = eff.scopes?.device_group;
  return deviceGroup !== undefined && deviceGroup !== null && typeof deviceGroup === "object";
}
