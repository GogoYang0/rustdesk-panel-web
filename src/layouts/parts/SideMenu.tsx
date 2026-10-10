/**
 * 侧边菜单（M4-T03）。
 *
 * 数据源 = `routes.tsx`（单一事实源）：逐项按生效码过滤（`visibleMenu`），
 * 无子项可见的父项隐藏。与路由表**同源**，杜绝「菜单可见但点进去 403」。
 *
 * 组件选型：`Nav`（Semi Navigation，经 MCP 查证：`items` / `mode` / `isCollapsed` /
 * `selectedKeys` / `onSelect`）。
 */
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import { Nav } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { ADMIN_GATE, appRoutes, type RouteItem, visibleMenu } from "@/router/routes";
import { usePermission } from "@/hooks/usePermission";

/** Semi Nav 的 items 元素形状。 */
interface NavItemShape {
  itemKey: string;
  text: string;
  icon?: RouteItem["icon"];
  items?: NavItemShape[];
}

/**
 * 把路由项转换为 Semi Nav 的 `items` 结构。
 *
 * @param items 已过滤的可见路由项
 * @param t i18n 翻译函数（menu 命名空间，key 已去除 `menu:` 前缀）
 * @returns Nav items
 */
function toNavItems(items: readonly RouteItem[], t: (key: string) => string): NavItemShape[] {
  return items
    .filter((item) => item.titleKey !== undefined)
    .map((item) => {
      const navItem: NavItemShape = {
        itemKey: item.path,
        text: t(item.titleKey!.replace(/^menu:/, "")),
      };
      if (item.icon) navItem.icon = item.icon;
      if (item.children && item.children.length > 0) {
        navItem.items = toNavItems(item.children, t);
      }
      return navItem;
    });
}

/** `SideMenu` 属性。 */
export interface SideMenuProps {
  /** 是否折叠 */
  collapsed?: boolean;
}

/**
 * 侧边菜单。
 *
 * @param props 折叠状态
 * @returns Semi Nav 菜单
 */
export function SideMenu({ collapsed = false }: SideMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation("menu");
  const { canAny, isAdmin } = usePermission();

  // 菜单可见性判定：ADMIN_GATE 哨兵用 is_admin，其余走 canAny（权限码）
  const gate = useMemo(
    () => (codes: readonly string[]) =>
      codes.includes(ADMIN_GATE) ? isAdmin : canAny(codes.filter((c) => c !== ADMIN_GATE)),
    [canAny, isAdmin],
  );

  const menuItems = useMemo(() => visibleMenu(appRoutes, gate), [gate]);
  const navItems = useMemo(() => toNavItems(menuItems, t), [menuItems, t]);

  const selectedKeys = useMemo(() => {
    const match = menuItems.find(
      (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
    );
    return match ? [match.path] : [];
  }, [location.pathname, menuItems]);

  return (
    <Nav
      mode="vertical"
      isCollapsed={collapsed}
      selectedKeys={selectedKeys}
      items={navItems}
      onSelect={(data) => {
        const key = typeof data === "string" ? data : (data as { itemKey: string }).itemKey;
        navigate(key);
      }}
      className="h-full"
    />
  );
}
