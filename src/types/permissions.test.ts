/**
 * 单测：RBAC 权限码目录自检（M4-T02）。
 *
 * 断言目录恒为 36 条（33 可分配 + 3 system_only），且分类集合正确。
 */
import { describe, expect, it } from "vitest";
import {
  DEVICE_GROUP_CODES,
  PERMISSION_CATALOG,
  PERMISSION_CODE_COUNT,
  SYSTEM_ONLY_CODES,
  isDeviceGroupScoped,
  isKnownPermissionCode,
  isSystemOnlyCode,
} from "@/types/permissions";

describe("权限码目录", () => {
  it("总条数为 36", () => {
    expect(PERMISSION_CODE_COUNT).toBe(36);
    expect(PERMISSION_CATALOG).toHaveLength(36);
  });

  it("可分配码 33 个 + system_only 码 3 个", () => {
    const assignable = PERMISSION_CATALOG.filter((m) => m.assignable);
    const systemOnly = PERMISSION_CATALOG.filter((m) => m.systemOnly);
    expect(assignable).toHaveLength(33);
    expect(systemOnly).toHaveLength(3);
    expect(SYSTEM_ONLY_CODES).toHaveLength(3);
  });

  it("system_only 码恰为 roles.create/edit/delete", () => {
    expect([...SYSTEM_ONLY_CODES].sort()).toEqual(["roles.create", "roles.delete", "roles.edit"]);
  });

  it("device_group scope 码恰为 6 个", () => {
    const dg = PERMISSION_CATALOG.filter((m) => m.scope === "device_group");
    expect(dg).toHaveLength(6);
    expect([...DEVICE_GROUP_CODES].sort()).toEqual(
      ["devices.delete", "devices.disconnect", "devices.edit", "devices.status", "devices.view", "strategies.assign"].sort(),
    );
  });

  it("权限码唯一（无重复）", () => {
    const codes = PERMISSION_CATALOG.map((m) => m.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("system_only 与 assignable 互斥", () => {
    for (const meta of PERMISSION_CATALOG) {
      expect(meta.assignable && meta.systemOnly).toBe(false);
    }
  });

  it("查询工具函数正确", () => {
    expect(isKnownPermissionCode("devices.view")).toBe(true);
    expect(isKnownPermissionCode("nonexistent.code")).toBe(false);
    expect(isSystemOnlyCode("roles.create")).toBe(true);
    expect(isSystemOnlyCode("roles.view")).toBe(false);
    expect(isDeviceGroupScoped("devices.disconnect")).toBe(true);
    expect(isDeviceGroupScoped("users.view")).toBe(false);
  });
});
