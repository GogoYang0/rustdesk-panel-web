/**
 * 单测：路由表菜单过滤（M4-T03 三层守卫之②）。
 *
 * 验证「菜单按生效码过滤」「父项无可见子项时隐藏」与「ADMIN_GATE 语义」。
 */
import { describe, expect, it } from "vitest";
import { ADMIN_GATE, type RouteItem, isMenuVisible, visibleMenu } from "@/router/menuFilter";

/** 构造一个无权限判定的 canAny（给定的码集合视为通过）。 */
function makeGate(allowedCodes: readonly string[], isAdmin = false) {
  return (codes: readonly string[]): boolean => {
    if (codes.includes(ADMIN_GATE)) return isAdmin;
    const effective = codes.filter((c) => c !== ADMIN_GATE);
    return effective.length === 0 || effective.some((c) => allowedCodes.includes(c));
  };
}

/** 测试用路由项。 */
const items: readonly RouteItem[] = [
  { path: "/dashboard", element: () => null, codes: [ADMIN_GATE], titleKey: "menu:dashboard" },
  { path: "/devices", element: () => null, codes: ["devices.view"], titleKey: "menu:devices" },
  { path: "/users", element: () => null, codes: ["users.view"], titleKey: "menu:users" },
  { path: "/profile", element: () => null, titleKey: "menu:profile" },
];

/** 测试用带父子的路由项。 */
const tree: readonly RouteItem[] = [
  {
    path: "/audit",
    element: () => null,
    titleKey: "menu:audit",
    children: [
      { path: "/audit/connections", element: () => null, codes: ["audit.view"], titleKey: "menu:auditConn" },
      { path: "/audit/alarms", element: () => null, codes: ["audit.view"], titleKey: "menu:auditAlarm" },
    ],
  },
];

describe("visibleMenu —— 菜单按生效码过滤", () => {
  it("仅 devices.view 生效：未登录时可见", () => {
    const menu = visibleMenu(items, makeGate(["devices.view"]));
    const paths = menu.map((i) => i.path);
    expect(paths).toContain("/devices");
    expect(paths).toContain("/profile"); // 仅需登录 → 可见
    expect(paths).not.toContain("/users"); // 无 users.view → 隐藏
    expect(paths).not.toContain("/dashboard"); // ADMIN_GATE 且非 admin → 隐藏
  });

  it("普通用户（无 admin）：仪表盘隐藏", () => {
    const menu = visibleMenu(items, makeGate([], false));
    expect(menu.map((i) => i.path)).toEqual(["/profile"]);
  });

  it("超管：仪表盘可见，且仅需登录项亦可见", () => {
    const menu = visibleMenu(items, makeGate([], true));
    const paths = menu.map((i) => i.path);
    expect(paths).toContain("/dashboard");
    expect(paths).toContain("/profile");
    expect(paths).not.toContain("/devices"); // 超管非自动含所有权限码（码走 canAny）
  });
});

describe("isMenuVisible / visibleMenu —— 父子项", () => {
  it("父项至少一个子项可见则可见", () => {
    const menu = visibleMenu(tree, makeGate(["audit.view"]));
    expect(menu).toHaveLength(1);
    expect(menu[0]?.children).toHaveLength(2);
  });

  it("父项所有子项不可见则整父项隐藏", () => {
    const menu = visibleMenu(tree, makeGate([]));
    expect(menu).toHaveLength(0);
  });

  it("isMenuVisible：无 codes 的叶子项恒可见", () => {
    const leaf: RouteItem = { path: "/profile", element: () => null, titleKey: "menu:profile" };
    expect(isMenuVisible(leaf, makeGate([]))).toBe(true);
  });
});
