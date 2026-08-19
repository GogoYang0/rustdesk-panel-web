/**
 * 单测：usePermission（M4-T03）。
 *
 * ⚠️ 必须覆盖：device_group 二次判定、无组保守隐藏、requires 依赖短路（通过后端已过滤的生效码体现）、
 * is_admin 短路、快照未就绪保守隐藏。
 *
 * ★ M4-T02/T03 修复批次补充（缺陷 DEV-01 / DEV-01b，QA 报告 TD-02）：
 *   - `deviceGroupGuid` 为 `null`（契约 `DeviceView.deviceGroupGuid` 的真实无组取值）
 *     —— 必须**不抛异常**且保守返回 false；
 *   - `deviceGroupGuid` 为 `undefined` / 空串 / 纯空白串 —— 保守返回 false；
 *   - `scopes.device_group` 分档缺失（undefined）—— 不抛异常且保守返回 false；
 *   - `scopes` 整体缺失 —— 不抛异常且保守返回 false。
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

/**
 * 构造「裁剪过的」快照：整体缺 `scopes.device_group` 分档。
 *
 * 用双重断言模拟后端裁剪快照 / 旧版本数据的真实形态（契约要求该键存在）。
 *
 * @param permissions 平铺生效码
 * @returns 缺 device_group 分档的快照
 */
function makeEffWithoutDeviceGroupScope(permissions: string[]): EffectivePermissions {
  return { permissions, scopes: { global: permissions } } as unknown as EffectivePermissions;
}

/** 构造「连 scopes 都缺失」的快照（更极端的旧数据形态）。 */
function makeEffWithoutScopes(permissions: string[]): EffectivePermissions {
  return { permissions } as unknown as EffectivePermissions;
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

  it("opts 存在但 deviceGroupGuid 未赋值（`{}`）→ 走平铺判定（既有行为，保持不变）", () => {
    const { result } = renderHook(() => usePermission());
    // 值语义：只有「赋值了 deviceGroupGuid」才进入设备域上下文。
    // ⚠️ 已实测：`"deviceGroupGuid" in {}` 为 false，但 `{ deviceGroupGuid: undefined }` 为 true，
    //    故判定条件必须用值比较（`!== undefined`）而非 `in`，否则会产生不一致行为。
    expect(result.current.can("devices.disconnect", {})).toBe(true);
  });

  it("opts 赋值为 undefined（显式键）→ 按值语义走平铺判定（与 `{}` 一致）", () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.can("devices.disconnect", { deviceGroupGuid: undefined })).toBe(true);
  });

  it("opts 省略（undefined）时走平铺判定：命中", () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.can("devices.disconnect")).toBe(true);
    expect(result.current.can("devices.disconnect", undefined)).toBe(true);
  });

  it("★ 无组设备（null）：即使平铺含该码也必须保守 false（不得回退平铺，防越权）", () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.can("devices.disconnect")).toBe(true); // 平铺含
    expect(result.current.can("devices.disconnect", { deviceGroupGuid: null })).toBe(false); // 无组 → false
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

  it("guid 无大小写/空白规范化：`group-a`、` group-A ` 均不命中 `group-A`", () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.can("devices.view", { deviceGroupGuid: "group-a" })).toBe(false);
    expect(result.current.can("devices.view", { deviceGroupGuid: " group-A " })).toBe(true); // 首尾空白被规范化
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

// ============================================================================
// ★ M4-T02/T03 修复批次：主理人复现脚本（逐字对应，必须在 CI 中持续转绿）
// ============================================================================
describe("★ 主理人复现脚本（DEV-01 / DEV-01b）", () => {
  it("场景 1：can('devices.view', { deviceGroupGuid: null }) 不抛异常且返回 false", () => {
    // 快照平铺含 devices.view，且 device_group 也存在 —— 排除「因无权限而 false」的伪绿
    usePermissionStore.getState().setEff(
      makeEff(["devices.view"], {
        "g1": ["devices.view"],
      }),
    );
    useSessionStore.getState().clear();
    const { result } = renderHook(() => usePermission());
    let value: boolean | undefined;
    expect(() => {
      value = result.current.can("devices.view", { deviceGroupGuid: null });
    }).not.toThrow();
    expect(value).toBe(false);
  });

  it("场景 2：can('devices.view', { deviceGroupGuid: 'g1' }) 在 scopes 缺 device_group 字段时不抛异常且返回 false", () => {
    usePermissionStore.getState().setEff(
      makeEffWithoutDeviceGroupScope(["devices.view"]), // scopes 存在但缺 device_group 字段
    );
    useSessionStore.getState().clear();
    const { result } = renderHook(() => usePermission());
    let value: boolean | undefined;
    expect(() => {
      value = result.current.can("devices.view", { deviceGroupGuid: "g1" });
    }).not.toThrow();
    expect(value).toBe(false);
  });
});

// ============================================================================
// ★ M4-T02/T03 修复批次：DEV-01 / DEV-01b 边界回归（补充覆盖）
// ============================================================================
describe("usePermission —— ★ 空值与分档缺失的健壮性（DEV-01 / DEV-01b）", () => {
  beforeEach(() => {
    usePermissionStore.getState().setEff(
      makeEff(["devices.view", "devices.disconnect"], {
        "g1": ["devices.view", "devices.disconnect"],
        "group-A": ["devices.view"],
      }),
    );
    useSessionStore.getState().clear();
  });

  it("deviceGroupGuid=null 时 canAny / canAll 同样不抛异常且保守 false", () => {
    const { result } = renderHook(() => usePermission());
    expect(() => result.current.canAny(["devices.view"], { deviceGroupGuid: null })).not.toThrow();
    expect(result.current.canAny(["devices.view"], { deviceGroupGuid: null })).toBe(false);
    expect(result.current.canAll(["devices.view"], { deviceGroupGuid: null })).toBe(false);
  });

  it("deviceGroupGuid=undefined（显式键）不抛异常，按值语义走平铺判定", () => {
    const { result } = renderHook(() => usePermission());
    let value: boolean | undefined;
    expect(() => {
      value = result.current.can("devices.view", { deviceGroupGuid: undefined });
    }).not.toThrow();
    // undefined 等价于「未给出 guid」→ 平铺判定（该快照平铺含 devices.view）
    expect(value).toBe(true);
  });

  it("deviceGroupGuid 为纯空白串不抛异常且保守 false", () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.can("devices.view", { deviceGroupGuid: "   " })).toBe(false);
  });

  it("deviceGroupGuid=null 但 is_admin=true → true（超管短路优先）", () => {
    useSessionStore.getState().login("tok", makeUser(true));
    const { result } = renderHook(() => usePermission());
    expect(result.current.can("devices.view", { deviceGroupGuid: null })).toBe(true);
  });

  it("★ 主理人复现场景 2：scopes 缺少 device_group 字段时不抛异常且返回 false（DEV-01b）", () => {
    usePermissionStore.getState().setEff(makeEffWithoutDeviceGroupScope(["devices.view", "devices.disconnect"]));
    const { result } = renderHook(() => usePermission());
    let value: boolean | undefined;
    expect(() => {
      value = result.current.can("devices.view", { deviceGroupGuid: "g1" });
    }).not.toThrow();
    expect(value).toBe(false);
  });

  it("scopes.device_group 分档缺失时，平铺判定不受影响", () => {
    usePermissionStore.getState().setEff(makeEffWithoutDeviceGroupScope(["devices.view"]));
    const { result } = renderHook(() => usePermission());
    expect(result.current.can("devices.view")).toBe(true);
    expect(result.current.can("devices.delete")).toBe(false);
  });

  it("scopes 整体缺失时不抛异常：分组判定保守 false、平铺判定照常", () => {
    usePermissionStore.getState().setEff(makeEffWithoutScopes(["devices.view"]));
    const { result } = renderHook(() => usePermission());
    expect(() => result.current.can("devices.view", { deviceGroupGuid: "g1" })).not.toThrow();
    expect(result.current.can("devices.view", { deviceGroupGuid: "g1" })).toBe(false);
    expect(result.current.can("devices.view")).toBe(true);
  });

  it("scopes.device_group 为空对象时保守 false（不抛异常）", () => {
    usePermissionStore.getState().setEff(makeEff(["devices.view"], {}));
    const { result } = renderHook(() => usePermission());
    expect(result.current.can("devices.view", { deviceGroupGuid: "g1" })).toBe(false);
  });

  it("快照就绪但 permissions 字段缺失时平铺判定保守 false（不抛异常）", () => {
    usePermissionStore.getState().setEff({ scopes: { global: [], device_group: {} } } as unknown as EffectivePermissions);
    const { result } = renderHook(() => usePermission());
    expect(() => result.current.can("devices.view")).not.toThrow();
    expect(result.current.can("devices.view")).toBe(false);
  });

  it("快照未就绪时传入 null guid 亦不抛异常（早期返回）", () => {
    usePermissionStore.getState().reset();
    const { result } = renderHook(() => usePermission());
    expect(() => result.current.can("devices.view", { deviceGroupGuid: null })).not.toThrow();
    expect(result.current.can("devices.view", { deviceGroupGuid: null })).toBe(false);
  });

  it("字符串 '" + '"null"' + "' 视为普通组码（不做特殊解释），保守 false", () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.can("devices.view", { deviceGroupGuid: "null" })).toBe(false);
  });
});
