/**
 * 应用根组件（M4-T03）。
 *
 * 挂载路由（声明式 `BrowserRouter` + `Routes`，OQ-1）与全局 Provider：
 * - 主题：`ThemeProvider` 把 uiStore.theme 同步到 `body[theme-mode]`；
 * - 首屏：`SessionGate` 保证会话 + 权限快照就绪后再渲染受保护布局；
 * - 路由：公开区（`/login`，AuthLayout）+ 受保护区（AppLayout，RequireAuth）+ 403/404。
 *
 * ⚠️ 权限红线：前端守卫只做 UI 拦截，**不是安全边界**；后端每次请求实时查库为准。
 */
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppLayout } from "@/layouts/AppLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { ForbiddenPage, NotFoundPage } from "@/router/lazyPages";
import { RequireAuth, RequirePermission, RouteSuspense, SessionGate } from "@/router/guards";
import { appRoutes } from "@/router/routes";
import { useUiStore } from "@/stores/uiStore";

/** 默认落地页（仪表盘）。 */
const DEFAULT_ROUTE = "/dashboard";

/**
 * 受保护路由集合（`appRoutes` 中排除公开的 `/login`）。
 */
const protectedRoutes = appRoutes.filter((item) => item.path !== "/login");

/**
 * 应用根组件。
 *
 * @returns 路由树
 */
export default function App() {
  const dark = useUiStore((s) => s.theme === "dark");

  return (
    <ThemeProvider dark={dark}>
      <BrowserRouter>
        <Routes>
          {/* ---------- 公开区：无壳布局 ---------- */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginRoute />} />
          </Route>

          {/* ---------- 受保护区：AppLayout + 登录态门槛 ---------- */}
          <Route
            element={
              <SessionGate>
                <RequireAuth />
              </SessionGate>
            }
          >
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to={DEFAULT_ROUTE} replace />} />
              {protectedRoutes.map((item) => (
                <Route
                  key={item.path}
                  path={item.path}
                  element={
                    <RequirePermission codes={item.codes} mode="any">
                      <item.element />
                    </RequirePermission>
                  }
                />
              ))}
              {/* 403：已登录但无权限 */}
              <Route path="/403" element={<ForbiddenPage />} />
            </Route>
          </Route>

          {/* ---------- 未匹配：404（公开可达，便于排查） ---------- */}
          <Route
            path="*"
            element={
              <RouteSuspense>
                <NotFoundPage />
              </RouteSuspense>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

/**
 * `/login` 路由渲染（从 appRoutes 取登录页组件）。
 *
 * @returns 登录页元素
 */
function LoginRoute() {
  const login = appRoutes.find((item) => item.path === "/login");
  const LoginElement = login?.element;
  if (!LoginElement) {
    return <Navigate to={DEFAULT_ROUTE} replace />;
  }
  return <LoginElement />;
}
