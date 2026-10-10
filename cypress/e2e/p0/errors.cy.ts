/**
 * P0：404 页面与 ErrorBoundary 降级（M4-T07）。
 *
 * - 未知路由 → 404 页；
 * - 页面渲染期异常（mock 设备 info=null 触发 DeviceList 渲染 TypeError）→
 *   路由级 ErrorBoundary 捕获并展示降级 UI，不白屏。
 */
import { paged } from "../../support/mockData";

describe("P0 错误页与错误边界", () => {
  it("未知路由展示 404 页", () => {
    cy.loginAsAdmin();
    cy.visit("/definitely-not-a-route", { failOnStatusCode: false });
    cy.contains("页面不存在").should("be.visible");
  });

  it("渲染期异常被 ErrorBoundary 捕获并展示降级 UI", () => {
    cy.loginAsAdmin();
    // DeviceList 对 row.info.device_name 无 null 防护 → 渲染期 TypeError
    cy.intercept("GET", "/api/devices*", paged([
      { guid: "bad-device", id: "9999", info: null, user_name: "", device_group_name: "", is_online: false, status: 1, last_online: "", deviceGroupGuid: null },
    ])).as("listBroken");
    cy.visit("/devices");
    // 降级 UI 出现，页面不白屏（应用骨架仍在）
    cy.contains("页面渲染出错").should("be.visible");
    cy.contains("返回首页").should("exist");
  });

  it("403 页面可达且文案完整", () => {
    cy.loginAsAdmin();
    cy.visit("/403");
    cy.contains("无访问权限").should("be.visible");
  });
});
