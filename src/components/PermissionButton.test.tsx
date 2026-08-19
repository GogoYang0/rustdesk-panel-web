/**
 * 单测：`PermissionButton`（M4-T03 验收项，QA 报告 TD-01）。
 *
 * 覆盖：
 * - `fallback="hide"`（默认）：无权限 → **不渲染**；
 * - `fallback="disable"`：无权限 → 渲染但禁用，并由 `Tooltip` 包装提供禁用原因；
 * - 有权限 → 正常渲染且可点击；
 * - 传入契约 `null` 组 guid（DEV-01 场景）→ 不崩溃，按无权限降级；
 * - `deviceGroupGuid` 分档：同码在 group-A 通过、group-B 不通过。
 *
 * ⚠️ 测试要点（均经实测确认）：
 * 1. 必须显式 `import "@/i18n"` 初始化 i18next（应用入口在 `main.tsx` 完成，
 *    组件测试不经过入口，否则 `useTranslation` 报 `NO_I18NEXT_INSTANCE`）；
 * 2. Semi `Button` 渲染真实 `<button>`，**有权限时**可被 `getByRole("button")` 取到；
 * 3. **禁用时** Semi 会内联 `pointer-events: none`，导致该 `<button>` 不再具有
 *    `button` 无障碍角色（jsdom 会判定为不可见），故查询需带 `{ hidden: true }`；
 * 4. 禁用时 `Tooltip` 的触发节点是外层 `<span aria-describedby=...>`，而非 `<button>`。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@/i18n";
import { PermissionButton } from "@/components/PermissionButton";
import { usePermissionStore } from "@/stores/permissionStore";
import { useSessionStore } from "@/stores/sessionStore";
import type { EffectivePermissions } from "@/types/domain";

/** 构造权限快照：平铺含 devices.view，device_group 只给 group-A。 */
function seedSnapshot(): void {
  const eff: EffectivePermissions = {
    permissions: ["devices.view", "devices.disconnect"],
    scopes: {
      global: ["devices.view", "devices.disconnect"],
      device_group: {
        "group-A": ["devices.view", "devices.disconnect"],
        "group-B": ["devices.view"],
      },
    },
  };
  usePermissionStore.getState().setEff(eff);
}

/** 取禁用态按钮（Semi 内联 pointer-events:none，需 hidden 查询）。 */
function getDisabledButton(): HTMLElement {
  return screen.getByRole("button", { hidden: true });
}

describe("PermissionButton —— hide / disable 两态", () => {
  beforeEach(() => {
    usePermissionStore.getState().reset();
    useSessionStore.getState().clear();
    seedSnapshot();
  });

  it("有权限（平铺命中）：渲染可点击按钮并触发 onClick", async () => {
    const onClick = vi.fn();
    render(<PermissionButton code="devices.view" onClick={onClick} />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).not.toHaveAttribute("disabled");
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("★ fallback=hide（默认）：无权限 → 不渲染任何按钮", () => {
    render(<PermissionButton code="devices.delete" />);
    expect(screen.queryByRole("button", { hidden: true })).not.toBeInTheDocument();
  });

  it("★ fallback=disable：无权限 → 渲染但 disabled，且点击不触发 onClick", async () => {
    const onClick = vi.fn();
    render(<PermissionButton code="devices.delete" fallback="disable" onClick={onClick} />);
    const button = getDisabledButton();
    expect(button).toHaveAttribute("disabled");
    expect(button).toHaveAttribute("aria-disabled", "true");
    // 禁用按钮带 pointer-events:none：直接派发 click 验证事件确实不触发 handler
    button.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("fallback=disable 且无权限：由 Tooltip 包装（外层 span 提供 aria-describedby）", () => {
    render(
      <PermissionButton code="devices.delete" fallback="disable">
        删除
      </PermissionButton>,
    );
    const button = getDisabledButton();
    const tooltipTrigger = button.parentElement;
    expect(tooltipTrigger?.tagName).toBe("SPAN");
    expect(tooltipTrigger).toHaveAttribute("aria-describedby");
    expect(tooltipTrigger).toHaveAttribute("tabindex", "0");
  });

  it("有权限但自身 disabled → 仍禁用（与权限结果 OR）", () => {
    render(<PermissionButton code="devices.view" disabled />);
    expect(getDisabledButton()).toHaveAttribute("disabled");
  });

  it("★ deviceGroupGuid 分档：group-A 通过、group-B 不通过（hide）", () => {
    const { unmount } = render(<PermissionButton code="devices.disconnect" deviceGroupGuid="group-A" />);
    expect(screen.getByRole("button")).toBeInTheDocument();
    unmount();

    render(<PermissionButton code="devices.disconnect" deviceGroupGuid="group-B" />);
    expect(screen.queryByRole("button", { hidden: true })).not.toBeInTheDocument();
  });

  it("★ DEV-01 回归：deviceGroupGuid=null 不崩溃，按无权限降级（hide）", () => {
    const { container } = render(<PermissionButton code="devices.view" deviceGroupGuid={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("★ DEV-01 回归：deviceGroupGuid=null + fallback=disable → 渲染但禁用", () => {
    render(<PermissionButton code="devices.view" deviceGroupGuid={null} fallback="disable" />);
    const button = getDisabledButton();
    expect(button).toHaveAttribute("disabled");
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  it("★ DEV-01b 回归：scopes 缺 device_group 时不崩溃且按无权限降级", () => {
    usePermissionStore.getState().setEff({
      permissions: ["devices.view"],
      scopes: { global: ["devices.view"] },
    } as unknown as EffectivePermissions);
    expect(() => render(<PermissionButton code="devices.view" deviceGroupGuid="g1" />)).not.toThrow();
    expect(screen.queryByRole("button", { hidden: true })).not.toBeInTheDocument();
  });

  it("快照未就绪：hide 不渲染、disable 渲染且禁用（保守）", () => {
    usePermissionStore.getState().reset();
    const { unmount } = render(<PermissionButton code="devices.view" />);
    expect(screen.queryByRole("button", { hidden: true })).not.toBeInTheDocument();
    unmount();

    render(<PermissionButton code="devices.view" fallback="disable" />);
    expect(getDisabledButton()).toHaveAttribute("disabled");
  });

  it("is_admin 超管：任意码均可渲染（含无组 guid）", () => {
    useSessionStore.getState().login("tok", { guid: "u1", name: "admin", is_admin: true });
    render(<PermissionButton code="devices.delete" deviceGroupGuid={null} />);
    expect(screen.getByRole("button")).not.toHaveAttribute("disabled");
  });
});
