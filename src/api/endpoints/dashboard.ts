/**
 * 仪表盘端点的 typed 请求函数（M4-T04）。
 *
 * ⚠️ 权限语义（OQ-8）：`GET /api/dashboard` 与 `GET /api/dashboard/trends` 后端为
 * **SuperAdmin** 语义（`RequireSuperAdmin`）。前端**仅**用 `UserPayload.is_admin`
 * 控制可见性（不做权限码映射），非超管访问 → 后端 403 兜底。
 *
 * ⚠️ 权限红线：前端可见性判定只是体验优化，**不是安全边界**。
 */
import { api } from "@/api/client";
import { unwrap } from "@/api/error";
import type { Schemas } from "@/types/domain";

/** 仪表盘总览聚合（SuperAdmin）。 */
export type DashboardOverview = Schemas["DashboardOverview"];

/** 仪表盘趋势聚合（SuperAdmin）。 */
export type DashboardTrends = Schemas["DashboardTrends"];

/** 趋势查询区间（契约 `range` 枚举）。 */
export type TrendRange = "7d" | "30d" | "90d";

/**
 * 获取仪表盘总览（GET /api/dashboard）。
 *
 * @returns 总览聚合（用户 / 设备 / 连接 / 文件 / 计数 / 系统状态）
 */
export async function getDashboardOverview(): Promise<DashboardOverview> {
  const res = await api.GET("/api/dashboard");
  return unwrap(res);
}

/**
 * 获取仪表盘趋势（GET /api/dashboard/trends?range=7d|30d|90d）。
 *
 * @param range 查询区间（7d / 30d / 90d，缺省由后端取默认值）
 * @returns 三条逐日趋势序列（连接 / 新增用户 / 告警，空日补 0）
 */
export async function getDashboardTrends(range: TrendRange = "7d"): Promise<DashboardTrends> {
  const res = await api.GET("/api/dashboard/trends", { params: { query: { range } } });
  return unwrap(res);
}
