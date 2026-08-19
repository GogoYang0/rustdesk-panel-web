/**
 * 面包屑（M4-T03）。
 *
 * 由当前路径在 `routes.tsx` 中反查匹配项，生成「首页 / 层级」面包屑。
 * 组件选型：`Breadcrumb`（经 Semi MCP 查证：`Breadcrumb.Item` 子元素法）。
 */
import { useMemo } from "react";
import { useNavigate } from "react-router";
import { Breadcrumb } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { appRoutes, type RouteItem } from "@/router/routes";

/** 路径 → 路由项（含父链）匹配。 */
interface MatchedRoute {
  item: RouteItem;
  parent: RouteItem | null;
}

/**
 * 在路由表中按路径匹配（含一层子路由）。
 *
 * @param pathname 当前路径
 * @returns 匹配结果（顶层项 + 可选父项）
 */
function matchRoute(pathname: string): MatchedRoute | null {
  for (const item of appRoutes) {
    if (item.path === pathname) {
      return { item, parent: null };
    }
    if (item.children) {
      for (const child of item.children) {
        if (child.path === pathname) {
          return { item: child, parent: item };
        }
      }
    }
  }
  return null;
}

/**
 * 面包屑。
 *
 * @returns 面包屑组件
 */
export function Breadcrumbs() {
  const navigate = useNavigate();
  const { t } = useTranslation("menu");
  const { t: tc } = useTranslation("common");

  const matched = useMemo(() => matchRoute(window.location.pathname), []);

  const crumbs = useMemo(() => {
    const list: Array<{ text: string; path: string }> = [];
    if (matched?.parent?.titleKey) {
      list.push({ text: t(matched.parent.titleKey.replace(/^menu:/, "")), path: matched.parent.path });
    }
    if (matched?.item.titleKey) {
      list.push({ text: t(matched.item.titleKey.replace(/^menu:/, "")), path: matched.item.path });
    }
    return list;
  }, [matched, t]);

  return (
    <Breadcrumb>
      <Breadcrumb.Item onClick={() => navigate("/")}>{tc("app.shortName")}</Breadcrumb.Item>
      {crumbs.map((crumb, index) => (
        <Breadcrumb.Item key={`${crumb.path}-${index}`} onClick={() => navigate(crumb.path)}>
          {crumb.text}
        </Breadcrumb.Item>
      ))}
    </Breadcrumb>
  );
}
