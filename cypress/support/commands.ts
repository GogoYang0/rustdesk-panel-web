/**
 * Cypress 自定义命令（M4-T07）。
 *
 * 核心思路（设计批复）：E2E **不依赖后端**，全部经 `cy.intercept` 拦截：
 * - 登录态：直接写 localStorage（zustand persist 的 `rdp-session`，形状
 *   `{state:{token,user},version:0}`），随后拦截 `POST /api/currentUser` 与
 *   `GET /api/permissions/me` 提供会话与权限快照；
 * - 兜底：先注册通配 `GET /api/**`（{data:[],total:0}），后注册的具名拦截优先生效；
 * - 业务 mock：各用例按需用 `cy.mockApi()` 注册域端点。
 */
import {
  adminPermissions,
  adminUser,
  type MockPermissions,
  type MockUser,
} from "./mockData";

/** 会话持久化值形状（zustand persist）。 */
interface PersistedSession {
  state: { token: string | null; user: MockUser | null };
  version: number;
}

/** 默认假 JWT。 */
const FAKE_TOKEN = "e2e-fake-jwt-token";

/** 会话 + 权限快照拦截（受保护页首屏必需）。 */
function interceptSession(user: MockUser, perms: MockPermissions): void {
  // ★ 后注册的拦截优先：先注册通配兜底，再注册具名端点。
  cy.intercept("GET", "/api/**", { data: [], total: 0 }).as("apiFallback");
  cy.intercept("POST", "/api/currentUser", user).as("currentUser");
  cy.intercept("GET", "/api/permissions/me", perms).as("myPermissions");
  cy.intercept("GET", "/api/login-options", []).as("loginOptions");
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** 以超管身份进入受保护页（写登录态 + 拦截会话端点）。 */
      loginAsAdmin(): Chainable<void>;
      /** 以受限用户身份进入受保护页（devices.view + g1 分档）。 */
      loginAsScopedUser(): Chainable<void>;
      /** 以自定义用户与权限快照进入受保护页。 */
      loginAs(user: MockUser, perms: MockPermissions): Chainable<void>;
      /** 注册域级业务端点 mock（在 loginAs 之后、visit 之前调用）。 */
      mockApi(
        method: "GET" | "POST" | "PATCH" | "DELETE",
        pattern: string,
        body: unknown,
        statusCode?: number,
      ): Chainable<void>;
    }
  }
}

/** 超管快捷命令。 */
Cypress.Commands.add("loginAsAdmin", () => {
  cy.loginAs(adminUser, adminPermissions);
});

/** 受限用户快捷命令。 */
Cypress.Commands.add("loginAsScopedUser", () => {
  const perms: MockPermissions = {
    permissions: ["devices.view", "address_books.view"],
    scopes: { device_group: { g1: ["devices.view"] } },
  };
  cy.loginAs(
    {
      id: 2,
      guid: "guid-scoper-0002",
      name: "operator",
      display_name: "运维员",
      email: "operator@example.com",
      is_admin: false,
      tfa_enabled: false,
      avatar: null,
    },
    perms,
  );
});

/** 通用登录态注入 + 会话拦截。 */
Cypress.Commands.add("loginAs", (user: MockUser, perms: MockPermissions) => {
  interceptSession(user, perms);
  cy.window().then((win) => {
    win.localStorage.setItem(
      "rdp-session",
      JSON.stringify({ state: { token: FAKE_TOKEN, user }, version: 0 } satisfies PersistedSession),
    );
  });
});

/** 域端点 mock 注册。 */
Cypress.Commands.add(
  "mockApi",
  (method: "GET" | "POST" | "PATCH" | "DELETE", pattern: string, body: unknown, statusCode = 200) => {
    cy.intercept(method, pattern, { statusCode, body }).as(`mock-${method}-${pattern}`);
  },
);

export {};
