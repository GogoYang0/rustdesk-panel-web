# 更新日志（Changelog）

本项目的所有重要变更将记录在本文件中。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 简化版。

## v0.2.0（2026-10-11）

### 新增

- **[feature] 设备个人归属 UI**：设备列表 / 详情「分配用户」弹窗（用户搜索选择、解除归属，`devices.assign` 按设备组二次判定）；「我的设备」页 `/my-devices`（侧边栏个人中心组，精简视图）；用户列表「查看设备」侧滑抽屉（`GET /api/users/{guid}/devices`）。
- **[feature] 强制 MFA UI**：设置域新增「MFA 强制策略」页 `/settings/mfa`（系统级开关 + 用户组多选 + 开启二次确认）；登录流识别 `type=mfa_enroll` → 跳转 `/mfa-enroll` 强制绑定页（otpauth 二维码 + 手动密钥 + 验证码 verify 进站，不可跳过）；passkey 免密登录分支同步接入。
- **[feature] 登录审计页**：审计域第 6 页 `/audit/login`（result 六枚举彩色 Tag、时间区间、用户名筛选、分页）。

### 变更

- RBAC 权限码目录 36 → **37 条**（镜像 `devices.assign`，device_group 档）。
- `src/types/api-types.ts` 随 api 契约（172 operation）重新生成；新增 `qrcode` 依赖（TOTP 绑定二维码本地渲染）。

### 兼容性

- 权限码 37 由 `GET /api/permissions` 目录驱动，旧角色不受影响；`devices.assign` 需重新指派给需要的角色。
- 服务端 < v0.2.0 时 `mfa_enroll` 分支不会出现，登录流行为与旧版完全一致。

## v0.1.1（2026-10-10）

### 修复

- **[fix] 官方客户端登录 type 兼容**：随 api 契约变更重新生成 `src/types/api-types.ts`（成功登录响应 `type` 改为 `access_token`，`account` 为弃用的历史兼容值）；前端登录收口以 `access_token` 非空判定，天然兼容新旧服务端响应 type。

## v0.1.0（2026-10-11）

首个发布版本。RustDesk 管理平台前端（React 19 + Semi Design + TailwindCSS v4），由 rustdesk-panel-api 的 openapi.yaml 契约生成 API client。

### 新增

- **M0 基建**：Vite + React 19 + TypeScript 工程脚手架、TailwindCSS v4 接入、CI（lint + test + build）。
- **M1 认证域**：登录（密码 / 2FA / passkey / OIDC）、会话管理、用户资料与头像。
- **M2 设备域 + RBAC**：设备列表与详情、设备组、下发策略、角色与权限管理（36 个权限码）、用户组管理。
- **M3 全量业务域**：用户管理、通讯录、审计日志、仪表盘、服务器管理、nexus 构建产物、系统设置（general / smtp / ldap / frontend）、OIDC 提供者管理、更新检查。
- **权限守卫**：三层权限守卫（路由级 / 菜单级 / 按钮级），与后端 36 权限码一一对应。
- **M4 E2E 收口**：Cypress E2E（P0 关键链路 + P1，共 32 用例）接入 CI 并全绿。

### 其他

- API client 由同级仓库 `rustdesk-panel-api/openapi.yaml` 契约生成（`pnpm gen:api`）。
- Docker 镜像后续提供。
