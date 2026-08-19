/**
 * 单测：usePermission（M4-T03）。
 *
 * ⚠️ 必须覆盖：device_group 二次判定、无组保守隐藏、requires 依赖短路（通过后端已过滤的生效码体现）、
 * is_admin 短路、快照未就绪保守隐藏。
 */
import { beforeEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePermission } from "@/hooks/usePermission";
import { usePermissionStore } from "@/stores/permissionStore";
import { useSessionStore } from "@/stores/sessionStore";
import type { EffectivePermissions, UserPayload } from "@/types/domain";

/** 构造一个 UserPayload（仅需 is_admin）。 */
function makeUser(isAdmin: boolean): UserPayload {
  return { guid: "u1", name: "tester", is_admin: isAdmin };
}

/** 构造 EffectivePermissions 快照。 */
function makeEff(permissions: string[], deviceGroup: Record<string, string[]>): EffectivePermissions {
  return {
    permissions,
    scopes: { global: permissions, device_group: deviceGroup },
  };
}

describe("usePermission —— 基础与快照未就绪", () => {
  beforeEach(() => {
    usePermissionStore.getState().reset();
    useSessionStore.getState().clear();
  });

  it("快照未就绪（eff=null）时一切保守返回 false，ready=false", () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.ready).toBe(false);
    expect(result.current.can("users.view")).toBe(false);
    expect(result.current.canAny(["users.view", "users.edit"])).toBe(false);
    expect(result.current.canAll(["users.view"])).toBe(false);
  });

  it("快照就绪后 ready=true，平铺判定命中/未命中", () => {
    usePermissionStore.getState().setEff(makeEff(["users.view", "devices.view"], {}));
    const { result } = renderHook(() => usePermission());
    expect(result.current.ready).toBe(true);
    expect(result.current.can("users.view")).toBe(true);
    expect(result.current.can("users.delete")).toBe(false);
  });

  it("canAny 任一通过、canAll 全部通过", () => {
    usePermissionStore.getState().setEff(makeEff(["users.view"], {}));
    const { result } = renderHook(() => usePermission());
    expect(result.current.canAny(["users.view", "users.delete"])).toBe(true);
    expect(result.current.canAny(["users.delete", "users.edit"])).toBe(false);
    expect(result.current.canAll(["users.view"])).toBe(true);
    expect(result.current.canAll(["users.view", "users.delete"])).toBe(false);
  });
});

describe("usePermission —— is_admin 短路", () => {
  beforeEach(() => {
    usePermissionStore.getState().reset();
    useSessionStore.getState().clear();
  });

  it("is_admin=true 时任何码（含未在快照中）恒 true", () => {
    useSessionStore.getState().login("tok", makeUser(true));
    // 故意不设置快照，验证短路优先于快照
    const { result } = renderHook(() => usePermission());
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.can("roles.delete")).toBe(true);
    expect(result.current.can("devices.disconnect", { deviceGroupGuid: "任意不存在组" })).toBe(true);
  });

  it("is_admin=false 时需依赖快照", () => {
    useSessionStore.getState().login("tok", makeUser(false));
    const { result } = renderHook(() => usePermission());
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.can("users.view")).toBe(false);
  });

  it("user 为 null 时 is_admin 视为 false", () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.isAdmin).toBe(false);
  });
});

describe("usePermission —— ★ device_group scope 二次判定（核心）", () => {
  beforeEach(() => {
    // 平铺 permissions 含 devices.disconnect（代表「在某个设备组有此码」），
    // 但 scopes.device_group 只在 group-A 有、group-B 无 —— 用于验证分档判定。
    usePermissionStore.getState().setEff(
      makeEff(
        ["devices.view", "devices.disconnect"], // 平铺并集
        {
          "group-A": ["devices.view", "devices.disconnect", "devices.edit"],
          "group-B": ["devices.view"], // 该组无 disconnect/edit
        },
      ),
    );
    useSessionStore.getState().clear();
  });

  it("设备在 group-A：disconnect/edit 命中该组生效码 → true", () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.can("devices.disconnect", { deviceGroupGuid: "group-A" })).toBe(true);
    expect(result.current.can("devices.edit", { deviceGroupGuid: "group-A" })).toBe(true);
  });

  it("★ 设备在 group-B：即使平铺 permissions 含该码，仍为 false（分档判定）", () => {
    const { result } = renderHook(() => usePermission());
    // group-B 的生效码数组里没有 disconnect/edit
    expect(result.current.can("devices.disconnect", { deviceGroupGuid: "group-B" })).toBe(false);
    expect(result.current.can("devices.edit", { deviceGroupGuid: "group-B" })).toBe(false);
    // 但 view 在 group-B 中有
    expect(result.current.can("devices.view", { deviceGroupGuid: "group-B" })).toBe(true);
  });

  it("★ 对照：不带 deviceGroupGuid 时走平铺判定（会误判为 true）—— 证明二次判定必要性", () => {
    const { result } = renderHook(() => usePermission());
    // 平铺判定命中（因为 permissions 含 devices.disconnect）
    expect(result.current.can("devices.disconnect")).toBe(true);
    // 而带 group-B 的设备组上下文时被正确判定为 false
    expect(result.current.can("devices.disconnect", { deviceGroupGuid: "group-B" })).toBe(false);
  });

  it("★ 设备无组（guid 空字符串）时保守隐藏", () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.can("devices.disconnect", { deviceGroupGuid: "" })).toBe(false);
    expect(result.current.can("devices.view", { deviceGroupGuid: "" })).toBe(false);
  });

  it("★ 未在 scopes.device_group 中出现的组 guid → 保守 false", () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.can("devices.view", { deviceGroupGuid: "unknown-group" })).toBe(false);
  });

  it("opts 存在但 deviceGroupGuid 未定义时，走平铺判定", () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.can("devices.disconnect", {})).toBe(true);
  });

  it("canAny / canAll 亦支持 deviceGroupGuid 分档", () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.canAny(["devices.edit", "devices.disconnect"], { deviceGroupGuid: "group-B" })).toBe(false);
    expect(result.current.canAny(["devices.view", "devices.disconnect"], { deviceGroupGuid: "group-B" })).toBe(true);
    expect(result.current.canAll(["devices.view"], { deviceGroupGuid: "group-B" })).toBe(true);
    expect(result.current.canAll(["devices.view", "devices.edit"], { deviceGroupGuid: "group-B" })).toBe(false);
  });

  it("★ is_admin 短路优先于无组保守隐藏", () => {
    useSessionStore.getState().login("tok", makeUser(true));
    const { result } = renderHook(() => usePermission());
    expect(result.current.can("devices.disconnect", { deviceGroupGuid: "" })).toBe(true);
  });
});

describe("usePermission —— requires 依赖短路（后端已过滤的生效码体现）", () => {
  beforeEach(() => {
    usePermissionStore.getState().reset();
    useSessionStore.getState().clear();
  });

  it("后端按 requires 过滤后，未含 devices.view 的组亦不含 devices.edit（依赖短路结果）", () => {
    // 模拟后端：group-X 仅给 devices.edit 但缺 view → 生效码过滤后为空（依赖未满足）
    usePermissionStore.getState().setEff(
      makeEff([], {
        "group-X": [], // 依赖短路：无 view 则 edit 也被过滤掉
      }),
    );
    const { result } = renderHook(() => usePermission());
    expect(result.current.can("devices.edit", { deviceGroupGuid: "group-X" })).toBe(false);
  });
});
