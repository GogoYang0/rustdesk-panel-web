/**
 * 侧边菜单（M4-T03；v0.1.2 修复滚动与分组收起）。
 *
 * 数据源 = `routes.tsx`（单一事实源）：逐项按生效码过滤（`visibleMenu`），
 * 无子项可见的父项隐藏。与路由表**同源**，杜绝「菜单可见但点进去 403」。
 *
 * v0.1.2 修复：
 * - **滚动**：菜单可能超出视口高度，Nav 不再锁定 `h-full`，由外层
 *   `AppLayout` 的 `overflow-y-auto` 容器承担滚动；
 * - **分组收起/展开**：相关域路由聚合为 Semi Nav `Sub` 分组（受控
 *   `openKeys`），支持展开/收起；当前路由所在分组自动展开；
 *   `isCollapsed` 折叠态由 Semi 自行降级为悬浮子菜单。
 *
 * 暗色模式：全部使用 Semi 组件与主题令牌，无需额外适配。
 */
import { useEffect, useMemo, useState } from "react";
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

/** 菜单分组定义：`members` 为归入该分组的顶层路由 path 集合。 */
interface MenuGroup {
  /** 分组 key（menu 命名空间 i18n key，如 `groupDevices`） */
  key: string;
  /** 归入分组的路由 path（精确匹配） */
  members: readonly string[];
}

/**
 * 菜单分组（声明式，路由归属以此为准；未命中的路由保持顶层平铺）。
 *
 * 顺序即展示顺序：仪表盘 → 设备管理 → 用户管理 → 个人中心 → 通讯录
 * → Nexus → 审计 → 系统设置（GAP2：个人中心组新增我的设备；
 * 审计组新增登录审计；设置组新增 MFA 强制策略）。
 */
const MENU_GROUPS: readonly MenuGroup[] = [
  { key: "groupDevices", members: ["/devices", "/device-groups", "/strategies", "/servers"] },
  { key: "groupUsers", members: ["/users", "/user-groups", "/roles"] },
  // GAP2：个人中心组（我的设备入口挂在本组，设计 §2.5）。
  { key: "groupProfile", members: ["/profile", "/my-devices"] },
  {
    key: "groupAddressBook",
    members: ["/address-book/personal", "/address-book/shared", "/address-book/custom"],
  },
  {
    key: "groupAudit",
    members: [
      "/audit/connections",
      "/audit/active",
      "/audit/files",
      "/audit/alarms",
      "/audit/console",
      "/audit/login",
    ],
  },
  {
    key: "groupSettings",
    members: [
      "/settings/general",
      "/settings/smtp",
      "/settings/oidc",
      "/settings/ldap",
      "/settings/mfa",
      "/settings/frontend",
    ],
  },
];

/** 分组成员 path → 分组 key 的反查表。 */
const PATH_TO_GROUP: ReadonlyMap<string, string> = new Map(
  MENU_GROUPS.flatMap((g) => g.members.map((p) => [p, g.key] as const)),
);

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

/**
 * 把平铺导航项按 `MENU_GROUPS` 聚合为「顶层项 + 分组 Sub」结构。
 *
 * 规则：按平铺顺序遍历；顶层项原位保留；某分组**首个成员**出现时，
 * 以该位置输出整个分组 Sub（成员已按路由表顺序收集）。全组成员被
 * 权限过滤为空的分组自然不出现。
 *
 * @param flat 平铺导航项（已按路由表顺序排列）
 * @param t i18n 翻译函数（menu 命名空间）
 * @returns 聚合后的 Nav items
 */
function groupNavItems(flat: readonly NavItemShape[], t: (key: string) => string): NavItemShape[] {
  // 各分组按出现顺序收集成员
  const grouped = new Map<string, NavItemShape[]>();
  for (const item of flat) {
    const groupKey = PATH_TO_GROUP.get(item.itemKey);
    if (groupKey === undefined) continue;
    const bucket = grouped.get(groupKey);
    if (bucket === undefined) {
      grouped.set(groupKey, [item]);
    } else {
      bucket.push(item);
    }
  }

  const result: NavItemShape[] = [];
  const emitted = new Set<string>();
  for (const item of flat) {
    const groupKey = PATH_TO_GROUP.get(item.itemKey);
    if (groupKey === undefined) {
      result.push(item);
      continue;
    }
    if (emitted.has(groupKey)) continue;
    emitted.add(groupKey);
    result.push({
      itemKey: groupKey,
      text: t(groupKey),
      items: (grouped.get(groupKey) ?? []).map((m) => ({ itemKey: m.itemKey, text: m.text })),
    });
  }
  return result;
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
 * @returns Semi Nav 菜单（分组可展开/收起，容器可滚动）
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
  const navItems = useMemo(() => groupNavItems(toNavItems(menuItems, t), t), [menuItems, t]);

  // 选中项：按「路径本身或其前缀」匹配路由表
  const selectedKeys = useMemo(() => {
    const match = menuItems.find(
      (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
    );
    return match ? [match.path] : [];
  }, [location.pathname, menuItems]);

  // 受控展开：当前路由所在分组自动展开；用户可手动收起/展开
  const [openKeys, setOpenKeys] = useState<readonly string[]>([]);

  useEffect(() => {
    const activePath = selectedKeys[0];
    if (activePath === undefined) return;
    const groupKey = PATH_TO_GROUP.get(activePath);
    if (groupKey !== undefined) {
      setOpenKeys((prev) => (prev.includes(groupKey) ? prev : [...prev, groupKey]));
    }
  }, [selectedKeys]);

  // 分组内成员选中时，分组标题同步高亮
  const navSelectedKeys = useMemo(() => {
    if (selectedKeys.length === 0) return [];
    const groupKey = PATH_TO_GROUP.get(selectedKeys[0]!);
    return groupKey !== undefined ? [groupKey, selectedKeys[0]!] : selectedKeys;
  }, [selectedKeys]);

  return (
    <Nav
      className="side-menu-nav"
      mode="vertical"
      isCollapsed={collapsed}
      selectedKeys={navSelectedKeys}
      openKeys={[...openKeys]}
      onOpenChange={(data) => {
        setOpenKeys(data.openKeys as readonly string[]);
      }}
      items={navItems}
      onSelect={(data) => {
        const key = typeof data === "string" ? data : (data as { itemKey: string }).itemKey;
        // 分组容器本身不可导航
        if (key.startsWith("group")) return;
        navigate(key);
      }}
    />
  );
}
