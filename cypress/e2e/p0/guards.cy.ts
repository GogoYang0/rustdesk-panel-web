/**
 * P0：三层权限守卫 —— 菜单过滤 + 路由门槛 403（M4-T07）。
 *
 * 受限用户（devices.view 平铺 + g1 组分档，非 admin）：
 * - 侧边菜单仅出现有权访问的项（设备/设备组/我的通讯录/Nexus 构建/个人中心）；
 * - 无权路由（/users、/settings/general[ADMIN_GATE]、/roles）重定向 /403；
 * - 未登录访问受保护路由 → 重定向 /login。
 */
describe("P0 权限守卫：菜单过滤与 403", () => {
  it("未登录访问受保护路由 → 重定向登录页", () => {
    cy.visit("/devices");
    cy.url().should("include", "/login");
    cy.url().should("include", "returnTo=%2Fdevices");
  });

  it("受限用户侧边菜单按权限过滤", () => {
    cy.loginAsScopedUser();
    cy.visit("/devices");
    // 可见：设备域 + 无门槛项（我的通讯录 / Nexus 构建 / 个人中心）
    cy.get("aside").contains("设备").should("exist");
    cy.get("aside").contains("设备组").should("exist");
    cy.get("aside").contains("我的通讯录").should("exist");
    cy.get("aside").contains("个人中心").should("exist");
    // 隐藏：无权限项（用户 / 角色 / 审计 / 系统设置 / 仪表盘 / 服务器）
    cy.get("aside").contains("用户组").should("not.exist");
    cy.get("aside").contains("角色").should("not.exist");
    cy.get("aside").contains("审计日志").should("not.exist");
    cy.get("aside").contains("系统设置").should("not.exist");
    cy.get("aside").contains("仪表盘").should("not.exist");
    cy.get("aside").contains("服务器").should("not.exist");
  });

  it("受限用户访问 /users → 重定向 403 页", () => {
    cy.loginAsScopedUser();
    cy.visit("/users");
    cy.contains("无访问权限").should("be.visible");
  });

  it("受限用户访问 ADMIN_GATE 路由（/settings/general）→ 403", () => {
    cy.loginAsScopedUser();
    cy.visit("/settings/general");
    cy.contains("无访问权限").should("be.visible");
  });

  it("受限用户访问 /roles → 403", () => {
    cy.loginAsScopedUser();
    cy.visit("/roles");
    cy.contains("无访问权限").should("be.visible");
  });

  it("MIN-01 回归：无 address_books.view 的用户访问共享/自定义通讯录 → 403", () => {
    // 只有 devices.view，无 address_books.view
    cy.loginAs(
      {
        id: 3,
        guid: "guid-deviceonly-03",
        name: "deviceonly",
        display_name: "仅设备员",
        email: "d@example.com",
        is_admin: false,
        tfa_enabled: false,
        avatar: null,
      },
      { permissions: ["devices.view"], scopes: {} },
    );
    cy.visit("/address-book/shared");
    cy.contains("无访问权限").should("be.visible");
    cy.visit("/address-book/custom");
    cy.contains("无访问权限").should("be.visible");
  });

  it("MIN-01 回归：有 address_books.view 的用户可访问共享通讯录且菜单可见", () => {
    cy.loginAsScopedUser();
    cy.visit("/address-book/shared");
    cy.contains("共享通讯录").should("be.visible");
    cy.get("aside").contains("共享通讯录").should("exist");
  });
});
