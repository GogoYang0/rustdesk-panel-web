/**
 * 认证壳布局（M4-T03）。
 *
 * 用于登录 / 两步验证 / 邀请接受等无壳页面：居中卡片式布局，无侧边菜单与顶栏。
 */
import { Outlet } from "react-router";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteSuspense } from "@/router/guards";

/**
 * 认证布局。
 *
 * @returns 居中内容区（含 Outlet）
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-semi-color-bg-0 p-4">
      <div className="w-full max-w-[420px]">
        <ErrorBoundary>
          <RouteSuspense>
            <Outlet />
          </RouteSuspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}
