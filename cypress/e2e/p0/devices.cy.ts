/**
 * P0：设备列表加载 + 行级权限按钮（device_group 二次判定）（M4-T07）。
 *
 * - 受限用户：g1 组行可见「详情」，无 disconnect 分档 → 无「断开连接」；
 *   无组设备（null）→ 保守隐藏全部行按钮；
 * - 超管：所有行按钮齐备（is_admin 短路）。
 */
import { mockDevices, paged } from "../../support/mockData";

describe("P0 设备列表与行级权限", () => {
  it("受限用户：有组行显示详情、无断开连接；无组行按钮保守隐藏", () => {
    cy.loginAsScopedUser();
    cy.intercept("GET", "/api/devices*", paged(mockDevices)).as("listDevices");
    cy.visit("/devices");
    cy.wait("@listDevices");
    // 表格渲染两行
    cy.get(".semi-table-tbody .semi-table-row").should("have.length", 2);
    // 行①（g1 组）：有详情，无断开连接（分档只有 devices.view）
    cy.contains(".semi-table-tbody .semi-table-row", "win-pc-g1").contains("详情").should("exist");
    cy.contains(".semi-table-tbody .semi-table-row", "win-pc-g1").contains("断开连接").should("not.exist");
    // 行②（无组 null）：保守隐藏「详情」
    cy.contains(".semi-table-tbody .semi-table-row", "win-pc-loose").contains("详情").should("not.exist");
  });

  it("超管：两行均显示全部操作按钮（含断开连接）", () => {
    cy.loginAsAdmin();
    cy.intercept("GET", "/api/devices*", paged(mockDevices)).as("listDevices");
    cy.visit("/devices");
    cy.wait("@listDevices");
    cy.contains(".semi-table-tbody .semi-table-row", "win-pc-g1").contains("断开连接").should("exist");
    cy.contains(".semi-table-tbody .semi-table-row", "win-pc-loose").contains("断开连接").should("exist");
    cy.contains(".semi-table-tbody .semi-table-row", "win-pc-g1").contains("删除").should("exist");
  });

  it("设备列表空数据展示空态且不崩", () => {
    cy.loginAsAdmin();
    cy.intercept("GET", "/api/devices*", { data: [], total: 0 }).as("listDevicesEmpty");
    cy.visit("/devices");
    cy.wait("@listDevicesEmpty");
    cy.get(".semi-table-tbody .semi-table-row").should("have.length", 0);
  });
});
