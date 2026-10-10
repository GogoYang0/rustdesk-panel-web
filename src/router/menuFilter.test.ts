/**
 * 补充单测：菜单过滤边界（M4-T03）。
 *
 * QA 报告 B4 提到「父项子项全过滤后仍显示」曾在中途被修过，本文件为**防回归闸门**：
 * - `children` 存在但为空数组 → 父项隐藏；
 * - 父项全部子项不可见 → 父项隐藏；
 * - 父子项均无 `titleKey` → 不进菜单（但 `children` 满足条件时父项仍可见）；
 * - 叶子节点无 `codes` → 仅需登录即可见；
 * - 深层嵌套：孙项全不可见 → 子项隐藏 → 父项隐藏（递归传导）。
 */
import { describe, expect, it } from "vitest";
import { ADMIN_GATE, type RouteItem, isMenuVisible, visibleMenu } from "@/router/menuFilter";

/** 构造权限判定：给定码集合视为通过。 */
function makeGate(allowedCodes: readonly string[], isAdmin = false) {
  return (codes: readonly string[]): boolean => {
    if (codes.includes(ADMIN_GATE)) return isAdmin;
    const effective = codes.filter((c) => c !== ADMIN_GATE);
    return effective.length === 0 || effective.some((c) => allowedCodes.includes(c));
  };
}

describe("menuFilter —— 父子项过滤边界（防回归）", () => {
  it("children 为空数组 → 父项隐藏（区别于「本身无子项」的叶子）", () => {
    const parent: RouteItem = { path: "/p", element: () => null, titleKey: "menu:p", children: [] };
    expect(isMenuVisible(parent, makeGate([]))).toBe(false);
    expect(visibleMenu([parent], makeGate([]))).toEqual([]);
  });

  it("叶子节点（无 children 字段、无 codes）→ 可见", () => {
    const leaf: RouteItem = { path: "/x", element: () => null, titleKey: "menu:x" };
    expect(isMenuVisible(leaf, makeGate([]))).toBe(true);
  });

  it("叶子节点有 codes 但无权限 → 不可见", () => {
    const leaf: RouteItem = { path: "/x", element: () => null, titleKey: "menu:x", codes: ["users.view"] };
    expect(isMenuVisible(leaf, makeGate([]))).toBe(false);
    expect(isMenuVisible(leaf, makeGate(["users.view"]))).toBe(true);
  });

  it("父项全部子项被过滤 → 父项整项隐藏（QA B4 回归）", () => {
    const tree: RouteItem[] = [
      {
        path: "/audit",
        element: () => null,
        titleKey: "menu:audit",
        children: [
          { path: "/audit/a", element: () => null, codes: ["audit.view"], titleKey: "menu:a" },
          { path: "/audit/b", element: () => null, codes: ["audit.view"], titleKey: "menu:b" },
        ],
      },
    ];
    expect(visibleMenu(tree, makeGate([]))).toEqual([]);
    expect(visibleMenu(tree, makeGate(["audit.view"]))).toHaveLength(1);
  });

  it("父项至少一个子项可见 → 父项可见，且子项数组仅含可见项", () => {
    const tree: RouteItem[] = [
      {
        path: "/audit",
        element: () => null,
        titleKey: "menu:audit",
        children: [
          { path: "/audit/a", element: () => null, codes: ["audit.view"], titleKey: "menu:a" },
          { path: "/audit/b", element: () => null, codes: ["alarms.view"], titleKey: "menu:b" },
        ],
      },
    ];
    const menu = visibleMenu(tree, makeGate(["alarms.view"]));
    expect(menu).toHaveLength(1);
    expect(menu[0]?.children?.map((c) => c.path)).toEqual(["/audit/b"]);
  });

  it("深层嵌套：孙项全不可见 → 子项隐藏 → 父项隐藏（递归传导）", () => {
    const tree: RouteItem[] = [
      {
        path: "/root",
        element: () => null,
        titleKey: "menu:root",
        children: [
          {
            path: "/root/mid",
            element: () => null,
            titleKey: "menu:mid",
            children: [{ path: "/root/mid/leaf", element: () => null, codes: ["deep.view"], titleKey: "menu:leaf" }],
          },
        ],
      },
    ];
    expect(visibleMenu(tree, makeGate([]))).toEqual([]);
    const menu = visibleMenu(tree, makeGate(["deep.view"]));
    expect(menu).toHaveLength(1);
    expect(menu[0]?.children).toHaveLength(1);
  });

  it("无 titleKey 的项不进菜单（顶层被过滤）", () => {
    const items: RouteItem[] = [
      { path: "/hidden", element: () => null },
      { path: "/shown", element: () => null, titleKey: "menu:shown" },
    ];
    expect(visibleMenu(items, makeGate([])).map((i) => i.path)).toEqual(["/shown"]);
  });

  it("父项无 titleKey 时不进菜单，但其子项可见性仍参与判定（当前实现语义）", () => {
    const parent: RouteItem = {
      path: "/p",
      element: () => null,
      children: [{ path: "/c", element: () => null, codes: ["x.view"] }],
    };
    // 首层 `.filter(titleKey !== undefined)` 直接剔除无 titleKey 的父项
    expect(visibleMenu([parent], makeGate(["x.view"]))).toEqual([]);
    // 但 isMenuVisible 本身认可「子项可见 → 父项可见」，为嵌套子菜单保留正确语义
    expect(isMenuVisible(parent, makeGate(["x.view"]))).toBe(true);
    expect(isMenuVisible(parent, makeGate([]))).toBe(false);
  });

  it("ADMIN_GATE 叶子：非超管隐藏、超管可见", () => {
    const leaf: RouteItem = { path: "/d", element: () => null, codes: [ADMIN_GATE], titleKey: "menu:d" };
    expect(visibleMenu([leaf], makeGate([], false))).toEqual([]);
    expect(visibleMenu([leaf], makeGate([], true)).map((i) => i.path)).toEqual(["/d"]);
  });
});
