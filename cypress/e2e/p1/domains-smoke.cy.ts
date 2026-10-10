/**
 * P1：五大域页面冒烟（M4-T07）。
 *
 * 用户 / 用户组 / 角色 / 通讯录（共享）/ 审计 / nexus：路由可达、表格渲染、
 * 关键元素存在。数据全部 mock（cy.intercept），不依赖后端。
 */
import { paged } from "../../support/mockData";

/** 简单用户行（users 域 mock 行）。 */
const userRow = {
  guid: "guid-user-0001",
  name: "alice",
  display_name: "爱丽丝",
  email: "alice@example.com",
  is_admin: false,
  tfa_enabled: false,
};

describe("P1 五大域页面冒烟", () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  it("用户域：列表可达且表格渲染 mock 行", () => {
    cy.intercept("GET", "/api/admin/users*", paged([userRow])).as("users");
    cy.visit("/users");
    cy.wait("@users");
    cy.get(".semi-table-tbody .semi-table-row").should("have.length.at.least", 1);
    cy.contains("alice").should("exist");
  });

  it("用户组域：列表可达且表格渲染", () => {
    cy.intercept(
      "GET",
      "/api/user-groups*",
      paged([{ guid: "ug-1", name: "研发组", note: "研发同学", deviceCount: 3 }]),
    ).as("userGroups");
    cy.visit("/user-groups");
    cy.wait("@userGroups");
    cy.get(".semi-table-tbody .semi-table-row").should("have.length.at.least", 1);
    cy.contains("研发组").should("exist");
  });

  it("角色域：列表可达且表格渲染", () => {
    cy.intercept(
      "GET",
      "/api/roles*",
      paged([{ guid: "role-1", name: "运维", is_system: false, userCount: 2 }]),
    ).as("roles");
    cy.visit("/roles");
    cy.wait("@roles");
    cy.get(".semi-table-tbody .semi-table-row").should("have.length.at.least", 1);
  });

  it("通讯录域：共享通讯录可达且表格渲染", () => {
    cy.intercept(
      "GET",
      "/api/ab/shared/profiles*",
      paged([{ guid: "ab-1", name: "客服通讯录", owner: "admin" }]),
    ).as("sharedAb");
    cy.visit("/address-book/shared");
    cy.wait("@sharedAb");
    cy.contains("共享通讯录").should("be.visible");
  });

  it("审计域：连接审计可达且表格渲染", () => {
    cy.intercept(
      "GET",
      "/api/audits/conn*",
      paged([{ id: 1, created_at: "2026-09-04T10:00:00+08:00", action: "conn" }]),
    ).as("audit");
    cy.visit("/audit/connections");
    // 页面可达 + 表格容器渲染（数据请求可能带强制筛选参数，mock 由通配兜底）
    cy.contains("连接审计").should("be.visible");
    cy.get(".semi-table").should("exist");
  });

  // ---- GAP2 冒烟：设备个人归属 + 登录审计 + MFA 策略 ----
  it("GAP2 我的设备：/my-devices 可达且渲染 mock 行", () => {
    cy.intercept(
      "GET",
      "/api/users/me/devices*",
      paged([
        {
          uuid: "uuid-1",
          id: "1000001",
          note: "",
          status: 1,
          isOnline: true,
          lastHeartbeat: "2026-10-10T10:00:00+08:00",
          deviceGroupGuid: null,
        },
      ]),
    ).as("myDevices");
    cy.visit("/my-devices");
    cy.wait("@myDevices");
    cy.get(".semi-table-tbody .semi-table-row").should("have.length.at.least", 1);
    cy.contains("1000001").should("exist");
  });

  it("GAP2 登录审计：/audit/login 可达且表格渲染", () => {
    cy.intercept(
      "GET",
      "/api/audits/login*",
      paged([
        {
          guid: "la-1",
          userGuid: "guid-user-0001",
          username: "alice",
          displayName: "爱丽丝",
          result: "success",
          method: "password",
          ip: "127.0.0.1",
          userAgent: "e2e",
          deviceId: null,
          deviceUuid: null,
          reason: null,
          createdAt: "2026-10-10T10:00:00+08:00",
        },
      ]),
    ).as("loginAudits");
    cy.visit("/audit/login");
    cy.wait("@loginAudits");
    cy.contains("登录审计").should("be.visible");
    cy.get(".semi-table").should("exist");
  });

  it("GAP2 MFA 策略：/settings/mfa 可达且回显表单", () => {
    cy.intercept("GET", "/api/settings/mfa", { enforceGlobal: false, userGroupGuids: [] }).as(
      "mfaSettings",
    );
    cy.intercept("GET", "/api/user-groups*", paged([])).as("groups");
    cy.visit("/settings/mfa");
    cy.wait("@mfaSettings");
    cy.contains("MFA 强制策略").should("be.visible");
  });

  it("nexus 域：未绑定态可达且提示绑定", () => {
    cy.intercept("GET", "/api/nexus/auth/bind-status", { bound: false }).as("bindStatus");
    cy.intercept("GET", "/api/nexus/builds*", []).as("builds");
    cy.visit("/nexus");
    cy.wait("@bindStatus");
    cy.contains("Nexus 构建").should("be.visible");
    cy.contains("未绑定").should("exist");
  });

  it("设备组域：列表可达且表格渲染", () => {
    cy.intercept(
      "GET",
      "/api/device-groups*",
      paged([{ guid: "g1", name: "组一", note: "", deviceCount: 5 }]),
    ).as("deviceGroups");
    cy.visit("/device-groups");
    cy.wait("@deviceGroups");
    cy.get(".semi-table-tbody .semi-table-row").should("have.length.at.least", 1);
    cy.contains("组一").should("exist");
  });
});
