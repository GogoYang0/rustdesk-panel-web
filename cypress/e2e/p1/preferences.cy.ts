/**
 * P1：暗色切换 + i18n 语言切换后 html lang 同步（M4-T07）。
 */
describe("P1 UI 偏好：主题与语言", () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  it("点击主题按钮后 body[theme-mode] 切换为 dark", () => {
    cy.visit("/devices");
    cy.get("body").should("not.have.attr", "theme-mode", "dark");
    cy.get("button[aria-label='深色']").click();
    cy.get("body").should("have.attr", "theme-mode", "dark");
    // 持久化到 localStorage（rdp-ui）
    cy.window().then((win) => {
      const raw = win.localStorage.getItem("rdp-ui");
      expect(raw).to.be.a("string");
      expect(JSON.parse(raw as string).state.theme).to.eq("dark");
    });
  });

  it("切换语言后 html lang 同步为 en-US 且菜单文案切换", () => {
    cy.visit("/devices");
    cy.get("html").should("have.attr", "lang", "zh-CN");
    cy.get("button[aria-label='语言']").click();
    cy.get("html").should("have.attr", "lang", "en-US");
    // 侧边菜单同步为英文
    cy.get("aside").contains("Devices").should("exist");
    cy.get("aside").contains("设备").should("not.exist");
  });

  it("切回中文后 html lang 同步为 zh-CN", () => {
    cy.visit("/devices");
    cy.get("button[aria-label='语言']").click();
    cy.get("html").should("have.attr", "lang", "en-US");
    // 按钮文案随语言切换（中文 ↔ EN），改按按钮文本点击
    cy.get("header").contains("button", "EN").click();
    cy.get("html").should("have.attr", "lang", "zh-CN");
    cy.get("aside").contains("设备").should("exist");
  });
});
