/**
 * 单测：角色权限矩阵分组（M4-T06 第 1 批核心逻辑）。
 *
 * 契约：`groupPermissionsByResource` 按 resource 分组且保持首次出现顺序，
 * assignable 缺省视为 true（可勾选）；system_only 码的置灰由页面层
 * `isSystemOnlyCode` 处理，本函数只做分组。
 */
import { describe, expect, it } from "vitest";
import { groupPermissionsByResource } from "@/pages/roles/RoleList";
import { PERMISSION_CATALOG, isSystemOnlyCode } from "@/types/permissions";

describe("groupPermissionsByResource", () => {
  it("空目录 → 空分组", () => {
    expect(groupPermissionsByResource([])).toEqual([]);
  });

  it("按 resource 分组且保持首次出现顺序", () => {
    const groups = groupPermissionsByResource([
      { code: "users.view", resource: "users", action: "view" },
      { code: "roles.view", resource: "roles", action: "view" },
      { code: "users.edit", resource: "users", action: "edit" },
    ]);
    expect(groups.map((g) => g.resource)).toEqual(["users", "roles"]);
    expect(groups[0]?.codes.map((c) => c.code)).toEqual(["users.view", "users.edit"]);
  });

  it("assignable 缺省按 true 处理", () => {
    const [g] = groupPermissionsByResource([{ code: "x.view", resource: "x", action: "view" }]);
    expect(g?.codes[0]?.assignable).toBe(true);
  });

  it("★ 与 37 码静态目录对齐：分组数 = 资源数（7），总数恒 37，且 system_only 码仅 3 条（GAP2 增 devices.assign）", () => {
    const groups = groupPermissionsByResource(PERMISSION_CATALOG);
    const total = groups.reduce((acc, g) => acc + g.codes.length, 0);
    expect(total).toBe(37);
    expect(groups.map((g) => g.resource)).toEqual(
      [
        "users",
        "user_groups",
        "devices",
        "address_books",
        "strategies",
        "audit",
        "roles",
        "servers",
      ].filter((r) => groups.some((g) => g.resource === r)),
    );
    const systemOnly = groups.flatMap((g) => g.codes).filter((c) => isSystemOnlyCode(c.code));
    expect(systemOnly.map((c) => c.code)).toEqual(["roles.create", "roles.edit", "roles.delete"]);
  });
});
