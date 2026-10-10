# 更新日志（Changelog）

本项目的所有重要变更将记录在本文件中。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 简化版。

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
