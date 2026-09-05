/**
 * P0：设置页 ADMIN_GATE 门槛（M4-T07）。
 *
 * 超管可访问全部五个设置页（通用/SMTP/OIDC/LDAP/前端）与角色页；
 * 非 admin 的 403 拦截在 guards.cy.ts 覆盖。
 */
describe("P0 设置页 ADMIN_GATE（超管）", () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  const cases: Array<[string, string]> = [
    ["/settings/general", "通用设置"],
    ["/settings/smtp", "邮件设置"],
    ["/settings/oidc", "单点登录"],
    ["/settings/ldap", "LDAP 设置"],
    ["/settings/frontend", "前端设置"],
  ];

  for (const [path, title] of cases) {
    it(`超管访问 ${path} 正常渲染`, () => {
      cy.visit(path);
      cy.contains(title).should("be.visible");
      cy.url().should("include", path);
      // 不应被重定向到 403
      cy.get("body").should("not.contain.text", "无访问权限");
    });
  }

  it("超管访问角色页正常渲染", () => {
    cy.visit("/roles");
    cy.contains("角色").should("be.visible");
  });
});
