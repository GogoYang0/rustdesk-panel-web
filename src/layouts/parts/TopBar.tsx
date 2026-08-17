/**
 * 顶栏（M4-T03）。
 *
 * 组成：Logo · 面包屑 · 语言切换 · 主题切换 · 用户菜单（个人中心 / 退出）。
 * 组件选型：`Button` / `Dropdown` / `Avatar`（均经 Semi MCP 查证）。
 */
import { useNavigate } from "react-router";
import { Avatar, Button, Dropdown } from "@douyinfe/semi-ui";
import { IconExit, IconLanguage, IconMoon, IconSun, IconUser } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import { Breadcrumbs } from "@/layouts/parts/Breadcrumbs";
import { useTheme } from "@/hooks/useTheme";
import { useI18n } from "@/hooks/useI18n";
import { useSessionStore } from "@/stores/sessionStore";
import { usePermissionStore } from "@/stores/permissionStore";

/**
 * 顶栏。
 *
 * @returns 顶部导航栏
 */
export function TopBar() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { isDark, toggle } = useTheme();
  const { locale, setLocale } = useI18n();
  const user = useSessionStore((s) => s.user);
  const clearSession = useSessionStore((s) => s.clear);
  const resetPermissions = usePermissionStore((s) => s.reset);

  const displayName = user?.display_name ?? user?.name ?? "未登录";

  /**
   * 退出登录：清会话 + 清权限快照 + 跳登录。
   */
  const handleLogout = () => {
    clearSession();
    resetPermissions();
    navigate("/login", { replace: true });
  };

  /**
   * 切换语言（zh-CN ↔ en-US）。
   */
  const handleToggleLocale = () => {
    setLocale(locale === "zh-CN" ? "en-US" : "zh-CN");
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-semi-color-border bg-semi-color-bg-1 px-4">
      <div className="flex min-w-0 items-center gap-4">
        <span className="shrink-0 text-base font-semibold text-semi-color-text-0">{t("app.name")}</span>
        <Breadcrumbs />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          theme="borderless"
          icon={<IconLanguage />}
          onClick={handleToggleLocale}
          aria-label={t("layout.language")}
        >
          {locale === "zh-CN" ? "中文" : "EN"}
        </Button>

        <Button
          theme="borderless"
          icon={isDark ? <IconSun /> : <IconMoon />}
          onClick={toggle}
          aria-label={isDark ? t("layout.themeLight") : t("layout.themeDark")}
        />

        <Dropdown
          trigger="click"
          render={
            <Dropdown.Menu>
              <Dropdown.Item icon={<IconUser />} onClick={() => navigate("/profile")}>
                {t("layout.profile")}
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item icon={<IconExit />} onClick={handleLogout}>
                {t("action.logout")}
              </Dropdown.Item>
            </Dropdown.Menu>
          }
        >
          <div className="flex cursor-pointer items-center gap-2">
            <Avatar size="small" src={user?.avatar}>
              {displayName.slice(0, 1).toUpperCase()}
            </Avatar>
            <span className="text-sm text-semi-color-text-0">{displayName}</span>
          </div>
        </Dropdown>
      </div>
    </header>
  );
}
