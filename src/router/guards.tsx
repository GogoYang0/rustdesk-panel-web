/**
 * 路由守卫（M4-T03，设计 §4.5 三层守卫之①）。
 *
 * - `<RequireAuth>`：登录态门槛；未登录 → `/login?returnTo=...`。
 * - `<RequirePermission codes mode>`：权限门槛；已登录无权限 → `/403`。
 * - `<SessionGate>`：首屏门；保证「会话 + 权限快照就绪」后才渲染受保护布局，
 *   避免菜单闪烁与守卫误判。
 *
 * ⚠️ 权限红线：前端守卫只做 UI 拦截，**不是安全边界**；后端每次请求实时查库为准。
 */
import { type ReactNode, Suspense } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Spin } from "@douyinfe/semi-ui";
import { qk } from "@/api/queryKeys";
import { currentUser, myPermissions } from "@/api/endpoints/auth";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/stores/sessionStore";
import { usePermissionStore } from "@/stores/permissionStore";

/** 首屏加载骨架。 */
export function FullPageLoading() {
  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-semi-color-bg-0">
      <Spin size="large" />
    </div>
  );
}

/**
 * 会话门（数据加载 + 就绪门）。
 *
 * 职责：
 * 1. 若本地有 token，则拉取 `currentUser` 与 `permissions/me`，写入 store；
 * 2. 快照未就绪时展示骨架，避免菜单闪烁；
 * 3. `currentUser` 401（探测态）由请求中间件静默处理，此处不跳转。
 *
 * @param props 子节点
 * @returns 就绪后渲染子节点
 */
export function SessionGate({ children }: { children: ReactNode }) {
  const token = useSessionStore((s) => s.token);
  const setUser = useSessionStore((s) => s.setUser);
  const setEff = usePermissionStore((s) => s.setEff);

  const userQuery = useQuery({
    queryKey: qk.currentUser,
    queryFn: currentUser,
    enabled: token !== null,
    staleTime: 5 * 60 * 1000,
  });

  const permsQuery = useQuery({
    queryKey: qk.permissions,
    queryFn: myPermissions,
    enabled: token !== null,
    staleTime: 5 * 60 * 1000,
  });

  // 同步查询结果到 Zustand（供非 React 上下文与守卫读取）
  if (userQuery.data && useSessionStore.getState().user !== userQuery.data) {
    setUser(userQuery.data);
  }
  if (permsQuery.data && usePermissionStore.getState().eff !== permsQuery.data) {
    setEff(permsQuery.data);
  }

  return <>{children}</>;
}

/**
 * 登录态守卫。
 *
 * 未登录（无 token）→ 重定向 `/login?returnTo=<当前路径>`。
 *
 * @returns 已登录时渲染 `<Outlet />`，否则重定向
 */
export function RequireAuth() {
  const token = useSessionStore((s) => s.token);
  const location = useLocation();

  if (token === null) {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }
  return <Outlet />;
}

/** `<RequirePermission>` 属性。 */
export interface RequirePermissionProps {
  /** 权限码列表（或 ADMIN_GATE 哨兵） */
  codes?: readonly string[];
  /** 判定模式：any（任一通过，默认）/ all（全部通过） */
  mode?: "any" | "all";
  /** 子节点（缺省渲染 `<Outlet />`） */
  children?: ReactNode;
}

/**
 * 权限门槛守卫。
 *
 * - `codes` 含 `ADMIN_GATE` → 用 `is_admin` 判定（OQ-8/OQ-10）；
 * - 其它码 → `canAny` / `canAll` 判定；
 * - 无权限 → 重定向 `/403`。
 *
 * @param props 权限码、判定模式与子节点
 * @returns 有权限时渲染子节点，否则重定向 403
 */
export function RequirePermission({ codes, mode = "any", children }: RequirePermissionProps) {
  const { can, canAny, canAll, isAdmin, ready } = usePermission();

  // 快照未就绪：保守等待（交由 SessionGate 保证就绪；此处兜底）
  if (!ready && !isAdmin) {
    return <FullPageLoading />;
  }

  if (codes && codes.length > 0) {
    const hasAdminGate = codes.includes("__admin__");
    const codesWithoutGate = codes.filter((c) => c !== "__admin__");

    let allowed: boolean;
    if (hasAdminGate) {
      // ADMIN_GATE：只要 is_admin 即通过；若同时含权限码，任一通过即可
      allowed = isAdmin || (codesWithoutGate.length > 0 && codesWithoutGate.some((c) => can(c)));
    } else {
      allowed = mode === "all" ? canAll(codesWithoutGate) : canAny(codesWithoutGate);
    }

    if (!allowed) {
      return <Navigate to="/403" replace />;
    }
  }

  return <>{children ?? <Outlet />}</>;
}

/**
 * 路由级 Suspense 包裹（配合 lazy 页面）。
 *
 * @param props 子节点
 * @returns Suspense 包裹后的节点
 */
export function RouteSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<FullPageLoading />}>{children}</Suspense>;
}
