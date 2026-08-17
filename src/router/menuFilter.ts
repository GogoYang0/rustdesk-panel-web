/**
 * 菜单可见性判定（纯函数模块，M4-T03）。
 *
 * 从 `routes.tsx` 拆分出来，**不依赖任何 UI 组件**，便于单测与复用：
 * 判定逻辑与组件渲染解耦，测试无需加载 Semi UI。
 */
import type { ComponentType, ReactNode } from "react";

/** 菜单/路由权限门槛的哨兵值：代表「需 is_admin」而非某权限码。 */
export const ADMIN_GATE = "__admin__";

/** 单条路由定义。 */
export interface RouteItem {
  /** 路由路径（React Router v7 语法；子路由用相对路径） */
  path: string;
  /** 页面组件 */
  element: ComponentType;
  /** 权限门槛（见 routes.tsx 文件头语义）；缺省 = 仅需登录 */
  codes?: readonly string[];
  /** 菜单标题 i18n key（menu 命名空间）；无则不出现在菜单 */
  titleKey?: string;
  /** 菜单/面包屑图标（semi-icons 元素）；T03 暂留空 */
  icon?: ReactNode;
  /** 子路由（父项在无可见子项时隐藏） */
  children?: readonly RouteItem[];
}

/**
 * 侧边菜单可见性判定。
 *
 * 规则：
 * - 有子项：父项当且仅当**至少一个子项可见**时可见；
 * - 无子项（且无 `children` 字段）：`codes` 为空/未给出 → 可见（仅需登录）；
 *   否则需 `canAny(codes)`。
 *
 * 注：为支持「子项被过滤后父项也应隐藏」，当 `item.children` **存在但为空数组**时，
 * 视为「子项全被过滤」→ 隐藏（区别于「本身无子项」的叶子节点）。
 *
 * @param item 路由项
 * @param canAny 权限判定（code 数组任一通过）
 * @returns 菜单项是否可见
 */
export function isMenuVisible(
  item: RouteItem,
  canAny: (codes: readonly string[]) => boolean,
): boolean {
  if (item.children !== undefined) {
    // 具备子项结构：仅当至少一个子项可见时父项可见（空数组 → 隐藏）
    return item.children.some((child) => isMenuVisible(child, canAny));
  }
  if (!item.codes || item.codes.length === 0) {
    return true;
  }
  return canAny(item.codes);
}

/**
 * 从路由表派生可见菜单项（逐项权限过滤）。
 *
 * @param items 路由项列表
 * @param canAny 权限判定
 * @returns 过滤后的可见菜单项
 */
export function visibleMenu(
  items: readonly RouteItem[],
  canAny: (codes: readonly string[]) => boolean,
): RouteItem[] {
  return items
    .filter((item) => item.titleKey !== undefined)
    .map((item) => {
      if (item.children !== undefined) {
        return { ...item, children: visibleMenu(item.children, canAny) };
      }
      return item;
    })
    .filter((item) => isMenuVisible(item, canAny));
}
