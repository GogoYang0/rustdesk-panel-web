/**
 * P0：登录两步验证全流程（M4-T07）。
 *
 * 流程：账号密码提交 → 后端返回 `type=email_check` + secret → 输入 6 位验证码 →
 * 后端返回 access_token → 建立 session → 跳转仪表盘。
 */
import { adminPermissions, adminUser } from "../../support/mockData";

describe("P0 认证：登录 + 两步验证", () => {
  beforeEach(() => {
    // 公开端点：登录方式列表为空（无 OIDC 按钮）
    cy.intercept("GET", "/api/login-options", []).as("loginOptions");
    // 登录端点按请求体分支返回：account → email_check 挑战；tfa_code → 发 token
    cy.intercept("POST", "/api/login", (req) => {
      const body = req.body as { type?: string };
      if (body.type === "tfa_code") {
        req.reply({ type: "account", access_token: "e2e-token-after-2fa" });
      } else {
        req.reply({ type: "email_check", secret: "e2e-tfa-secret", tfa_type: "email" });
      }
    }).as("login");
    cy.intercept("POST", "/api/currentUser", adminUser).as("currentUser");
    cy.intercept("GET", "/api/permissions/me", adminPermissions).as("myPermissions");
    // 仪表盘（登录成功默认落地页）数据
    cy.intercept("GET", "/api/**", { data: [], total: 0 }).as("apiFallback");
    cy.visit("/login");
  });

  it("账号密码提交后进入两步验证步骤", () => {
    cy.get("input[autocomplete='username']").type("admin");
    cy.get("input[autocomplete='current-password']").type("secret-pass");
    cy.contains("button", "登录").click();
    cy.wait("@login");
    // 进入 tfa 步骤：出现验证码输入框（maxLength=6）与提示
    cy.get("input[autocomplete='one-time-code']").should("be.visible");
  });

  it("输入两步验证码后建立会话并跳转仪表盘", () => {
    cy.get("input[autocomplete='username']").type("admin");
    cy.get("input[autocomplete='current-password']").type("secret-pass");
    cy.contains("button", "登录").click();
    cy.wait("@login");
    cy.get("input[autocomplete='one-time-code']").type("123456");
    cy.contains("button", "登录").click();
    cy.wait("@login");
    // 会话就绪：跳转 /dashboard，顶栏出现用户名
    cy.url({ timeout: 15000 }).should("include", "/dashboard");
    cy.contains("管理员").should("be.visible");
    // localStorage 已写入 token
    cy.window().then((win) => {
      const raw = win.localStorage.getItem("rdp-session");
      expect(raw).to.be.a("string");
      expect(JSON.parse(raw as string).state.token).to.eq("e2e-token-after-2fa");
    });
  });

  it("错误验证码（后端 401）停留在验证码步骤并提示错误", () => {
    cy.intercept("POST", "/api/login", (req) => {
      const body = req.body as { type?: string };
      req.reply(
        body.type === "tfa_code"
          ? { statusCode: 401, body: { statusCode: 401, message: "验证码错误", error: "Unauthorized" } }
          : { type: "email_check", secret: "e2e-tfa-secret", tfa_type: "email" },
      );
    }).as("login2");
    cy.get("input[autocomplete='username']").type("admin");
    cy.get("input[autocomplete='current-password']").type("secret-pass");
    cy.contains("button", "登录").click();
    cy.get("input[autocomplete='one-time-code']").should("be.visible");
    cy.get("input[autocomplete='one-time-code']").type("000000");
    cy.contains("button", "登录").click();
    cy.url().should("not.include", "/dashboard");
    // 仍停留在登录卡片（验证码输入框可见）
    cy.get("input[autocomplete='one-time-code']").should("be.visible");
  });
});
