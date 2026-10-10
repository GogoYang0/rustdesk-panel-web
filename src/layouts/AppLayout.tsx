/**
 * 应用主布局（M4-T03，设计 §5.3）。
 *
 * 结构：顶栏（TopBar）+ Body（侧边菜单 SideMenu + 内容区 Content）。
 * 内容区使用 Tailwind 布局类（Semi 管组件、Tailwind 管布局），内含
 * 路由级 `ErrorBoundary` 与 `Suspense` 骨架。
 */
import { Outlet } from "react-router";
import { Button } from "@douyinfe/semi-ui";
import { IconIndentLeft, IconIndentRight } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import { TopBar } from "@/layouts/parts/TopBar";
import { SideMenu } from "@/layouts/parts/SideMenu";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteSuspense } from "@/router/guards";
import { useUiStore } from "@/stores/uiStore";

/**
 * 应用主布局。
 *
 * @returns 布局骨架（含 Outlet）
 */
export function AppLayout() {
  const { t } = useTranslation("common");
  const sideCollapsed = useUiStore((s) => s.sideCollapsed);
  const toggleSide = useUiStore((s) => s.toggleSide);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-semi-color-bg-0">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <aside
          className="flex shrink-0 flex-col border-r border-semi-color-border bg-semi-color-bg-1 transition-[width] duration-200"
          style={{ width: sideCollapsed ? 60 : 220 }}
        >
          <div className="flex-1 overflow-y-auto">
            <SideMenu collapsed={sideCollapsed} />
          </div>
          <div className="flex justify-center border-t border-semi-color-border p-2">
            <Button
              theme="borderless"
              icon={sideCollapsed ? <IconIndentRight /> : <IconIndentLeft />}
              onClick={toggleSide}
              aria-label={sideCollapsed ? t("layout.expand") : t("layout.collapse")}
            />
          </div>
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
          <ErrorBoundary>
            <RouteSuspense>
              <Outlet />
            </RouteSuspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
