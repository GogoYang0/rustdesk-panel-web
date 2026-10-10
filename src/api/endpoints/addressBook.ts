/**
 * 通讯录域端点（M4-T06）。
 *
 * 契约保真（32 端点全覆盖）与兼容怪癖三件套：
 * 1. **GET/POST 同义**：`/api/ab/shared/profiles` 与 `/api/ab/peers` 均 GET/POST 双形态；
 * 2. **legacy 'null' 特例**：`GET /api/ab` 载荷可能是 `'null'` 字符串或裸 JSON `null`
 *    （空数据），前端不得按对象解构（`parseLegacyAbPayload` 归一化）；
 * 3. **legacy 保存恒 200**：`POST /api/ab` 失败形态为 `{error: msg}` 且 HTTP 仍 200，
 *    端点层识别后抛 `ApiError(200, …)`（`saveLegacyAddressBook`）。
 *
 * 其余：`AbPeer.tags` 可能为 JSON 编码串；规则 user/group 互斥 409；重名 409。
 */
import { api } from "@/api/client";
import { ApiError, unwrap } from "@/api/error";
import { toPageParams, type PageParams } from "@/api/pagination";
export type { PageParams };
import type { components } from "@/types/api-types";

/** 地址簿引用（personal 幂等取/建）。 */
export type AddressBookRef = components["schemas"]["AddressBookRef"];
/** 书行形态（custom/shared 通用；rule = 权限并集最大值）。 */
export type SharedBookRow = components["schemas"]["SharedBookRow"];
/** 书分页。 */
export type SharedBookPage = components["schemas"]["SharedBookPage"];
/** sharedOnly 形态（无 total）。 */
export type SharedBookList = components["schemas"]["SharedBookList"];
/** 新建书请求。 */
export type CreateBookProfileRequest = components["schemas"]["CreateBookProfileRequest"];
/** custom 书 profile 更新请求。 */
export type UpdateBookProfileRequest = components["schemas"]["UpdateBookProfileRequest"];
/** 共享书更新请求（改 owner 需 FULL_CONTROL）。 */
export type UpdateSharedBookRequest = components["schemas"]["UpdateSharedBookRequest"];
/** 可分享候选（users + groups 两源）。 */
export type ShareCandidates = components["schemas"]["ShareCandidates"];
/** 地址簿 peer 行。 */
export type AbPeer = components["schemas"]["AbPeer"];
/** peer 分页。 */
export type AbPeerList = components["schemas"]["AbPeerList"];
/** peer 新增/更新请求（PUT 时 tags 全量替换）。 */
export type AbPeerUpsertRequest = components["schemas"]["AbPeerUpsertRequest"];
/** 地址簿标签。 */
export type AbTag = components["schemas"]["AbTag"];
/** 标签列表（tag_colors 为 JSON 编码串）。 */
export type AbTagList = components["schemas"]["AbTagList"];
/** 标签新增/更新颜色请求。 */
export type AbTagUpsertRequest = components["schemas"]["AbTagUpsertRequest"];
/** 规则行（targetUserId/targetGroupId 双空 = everyone）。 */
export type AbRule = components["schemas"]["AbRule"];
/** 规则列表。 */
export type AbRuleList = components["schemas"]["AbRuleList"];
/** 建规则请求（guid=地址簿）。 */
export type AbRuleUpsertRequest = components["schemas"]["AbRuleUpsertRequest"];
/** 更新规则请求（guid=规则）。 */
export type AbRuleUpdateRequest = components["schemas"]["AbRuleUpdateRequest"];
/** ab 设置（恒 {max_peer_one_ab: 0}）。 */
export type AbSettings = components["schemas"]["AbSettings"];
/** 规则级别：1=READ / 2=READ_WRITE / 3=FULL_CONTROL。 */
export type AbRuleLevel = 1 | 2 | 3;

// ---------------------------------------------------------------------------
// legacy + settings（兼容怪癖所在）
// ---------------------------------------------------------------------------

/**
 * 归一化 legacy 地址簿载荷：`'null'` 字符串 / 裸 `null` / 对象 → `T | null`。
 *
 * @param raw 请求返回的未知载荷
 * @returns 对象载荷或 null（空数据）
 */
export function parseLegacyAbPayload<T>(raw: unknown): T | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") {
    // legacy 客户端硬依赖：空数据落库为字符串 'null'
    if (raw === "null" || raw.trim().length === 0) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  return raw as T;
}

/** legacy 地址簿原始载荷（`GET /api/ab`，客户端硬依赖）。 */
export async function getLegacyAddressBook(): Promise<unknown> {
  const res = await api.GET("/api/ab");
  return unwrap(res);
}

/**
 * legacy 地址簿全量保存（`POST /api/ab`；data 为双重 JSON 编码串）。
 *
 * ★ 兼容怪癖：失败形态 `{error: msg}` 且 HTTP 仍 200 —— 端点层识别后抛错。
 *
 * @param data 双重 JSON 编码串
 */
export async function saveLegacyAddressBook(data: string): Promise<void> {
  const res = await api.POST("/api/ab", { body: { data } as components["schemas"]["LegacyAbSaveRequest"] });
  const payload = unwrap<unknown>(res);
  if (payload !== null && typeof payload === "object" && "error" in (payload as Record<string, unknown>)) {
    const msg = (payload as { error?: unknown }).error;
    throw new ApiError(
      res.response.status,
      { statusCode: res.response.status, message: typeof msg === "string" ? msg : "legacy save failed", error: "LegacyAbSave" },
      res.response,
    );
  }
}

/** ab 设置占位端点（POST 恒返回 {max_peer_one_ab: 0}）。 */
export async function getAddressBookSettings(): Promise<AbSettings> {
  const res = await api.POST("/api/ab/settings");
  return unwrap(res);
}

// ---------------------------------------------------------------------------
// personal / custom / shared 书
// ---------------------------------------------------------------------------

/** 取个人地址簿（幂等；POST 同义）。 */
export async function getPersonalAddressBook(): Promise<AddressBookRef> {
  const res = await api.GET("/api/ab/personal");
  return unwrap(res);
}

/** 自定义地址簿列表（分页 current/pageSize/name/note）。 */
export async function listCustomAddressBooks(params: PageParams & { name?: string; note?: string }): Promise<SharedBookPage> {
  const res = await api.GET("/api/ab/custom/profiles", { params: { query: { ...params } } });
  return unwrap(res);
}

/** 创建自定义地址簿（重名 409）。 */
export async function createCustomAddressBook(body: CreateBookProfileRequest): Promise<AddressBookRef> {
  const res = await api.POST("/api/ab/custom/add", { body });
  return unwrap(res);
}

/** 更新自定义地址簿 profile（owner 复核；至少一键否则 400）。 */
export async function updateCustomAddressBookProfile(body: UpdateBookProfileRequest): Promise<unknown> {
  const res = await api.PUT("/api/ab/custom/update/profile", { body });
  return unwrap(res);
}

/** 删除自定义地址簿（事务级联 rules/peers/tags/peer_tags；body {guids[]}）。 */
export async function deleteCustomAddressBooks(guids: string[]): Promise<unknown> {
  const res = await api.DELETE("/api/ab/custom", { body: { guids } });
  return unwrap(res);
}

/** 共享地址簿列表（owner/规则并集取最大 rule；GET/POST 同义）。 */
export async function listSharedAddressBooks(params: PageParams & { name?: string; note?: string }): Promise<SharedBookPage> {
  const res = await api.GET("/api/ab/shared/profiles", { params: { query: { ...params } } });
  return unwrap(res);
}

/** 共享地址簿查询（POST 同义形态；body 分页）。 */
export async function querySharedAddressBooks(body: components["schemas"]["BookPaginationRequest"]): Promise<SharedBookPage> {
  const res = await api.POST("/api/ab/shared/profiles", { body });
  return unwrap(res);
}

/** 被共享给我的地址簿（sharedOnly，无分页）。 */
export async function listSharedWithMe(): Promise<SharedBookList> {
  const res = await api.GET("/api/ab/shared/list");
  return unwrap(res);
}

/** 单个共享地址簿访问视图（无权 403）。 */
export async function getSharedAddressBookAccess(guid: string): Promise<SharedBookRow> {
  const res = await api.GET("/api/ab/shared/{guid}/access", { params: { path: { guid } } });
  return unwrap(res);
}

/** 分享候选（users + groups；name LIKE）。 */
export async function listShareCandidates(guid: string, name?: string): Promise<ShareCandidates> {
  const res = await api.GET("/api/ab/shared/{guid}/share-candidates", {
    params: { path: { guid }, query: name !== undefined && name.length > 0 ? { name } : undefined },
  });
  return unwrap(res);
}

/** 创建共享地址簿（address_books.share；重名 409）。 */
export async function createSharedAddressBook(body: CreateBookProfileRequest): Promise<AddressBookRef> {
  const res = await api.POST("/api/ab/shared/add", { body });
  return unwrap(res);
}

/** 更新共享地址簿（改 owner 需 FULL_CONTROL；重名 409）。 */
export async function updateSharedAddressBook(body: UpdateSharedBookRequest): Promise<unknown> {
  const res = await api.PUT("/api/ab/shared/update/profile", { body });
  return unwrap(res);
}

/** 删除共享地址簿（逐条 owner 校验；body {guids[]}）。 */
export async function deleteSharedAddressBooks(guids: string[]): Promise<unknown> {
  const res = await api.DELETE("/api/ab/shared", { body: { guids } });
  return unwrap(res);
}

// ---------------------------------------------------------------------------
// peers（GET/POST 同义）
// ---------------------------------------------------------------------------

/** 地址簿 peers 列表查询参数。 */
export interface AbPeerListParams {
  /** 地址簿 guid（必填） */
  ab: string;
  /** 设备 id LIKE */
  id?: string;
  /** 别名 LIKE */
  alias?: string;
  /** 标签 guid 列表（逗号分隔出网） */
  tags?: string[];
  /** 标签过滤模式 */
  tagMode?: "union" | "intersection";
}

/** 地址簿 peers 列表（GET 形态；tags 逗号分隔、tagMode camelCase 直传）。 */
export async function listAddressBookPeers(params: AbPeerListParams): Promise<AbPeerList> {
  const res = await api.GET("/api/ab/peers", {
    params: {
      query: {
        ab: params.ab,
        id: params.id,
        alias: params.alias,
        tags: params.tags !== undefined && params.tags.length > 0 ? params.tags.join(",") : undefined,
        tagMode: params.tagMode,
      },
    },
  });
  return unwrap(res);
}

/** 地址簿 peers 查询（POST 同义形态）。 */
export async function queryAddressBookPeers(body: components["schemas"]["AbPeersQueryRequest"]): Promise<AbPeerList> {
  const res = await api.POST("/api/ab/peers", { body });
  return unwrap(res);
}

/** 添加 ab peer（findOrCreatePeer：设备不存在自动建行）。 */
export async function addAddressBookPeer(abGuid: string, body: AbPeerUpsertRequest): Promise<unknown> {
  const res = await api.POST("/api/ab/peer/add/{guid}", { params: { path: { guid: abGuid } }, body });
  return unwrap(res);
}

/** 更新 ab peer（tags 全量替换）。 */
export async function updateAddressBookPeer(peerGuid: string, body: AbPeerUpsertRequest): Promise<unknown> {
  const res = await api.PUT("/api/ab/peer/update/{guid}", { params: { path: { guid: peerGuid } }, body });
  return unwrap(res);
}

/** 删除 ab peer。 */
export async function deleteAddressBookPeer(peerGuid: string): Promise<unknown> {
  const res = await api.DELETE("/api/ab/peer/{guid}", { params: { path: { guid: peerGuid } } });
  return unwrap(res);
}

// ---------------------------------------------------------------------------
// tags
// ---------------------------------------------------------------------------

/** 地址簿 tags 全量（含 tag_colors JSON 串）。 */
export async function listAddressBookTags(abGuid: string): Promise<AbTagList> {
  const res = await api.GET("/api/ab/tags/{guid}", { params: { path: { guid: abGuid } } });
  return unwrap(res);
}

/**
 * 地址簿 tags 全量替换（含 tag_colors）。
 *
 * 注意：当前无任何调用方——AbCommon 标签条只走 add/rename/update/delete
 * 单标签端点。保留封装的原因：POST /api/ab/tags/{guid} 为 openapi 真实
 * 端点，将来「标签颜色批量编辑」类功能可直接复用；接入前不计入覆盖矩阵
 * 的「已覆盖」口径（见 docs/web-api-coverage-matrix.md MIN-02 修订）。
 */
export async function replaceAddressBookTags(
  abGuid: string,
  tags: { name: string; color: number }[],
): Promise<unknown> {
  const res = await api.POST("/api/ab/tags/{guid}", { params: { path: { guid: abGuid } }, body: { tags } });
  return unwrap(res);
}

/** 添加标签（同名 409）。 */
export async function addAddressBookTag(abGuid: string, body: AbTagUpsertRequest): Promise<unknown> {
  const res = await api.POST("/api/ab/tag/add/{guid}", { params: { path: { guid: abGuid } }, body });
  return unwrap(res);
}

/** 标签改名。 */
export async function renameAddressBookTag(tagGuid: string, name: string): Promise<unknown> {
  const res = await api.PUT("/api/ab/tag/rename/{guid}", { params: { path: { guid: tagGuid } }, body: { name } });
  return unwrap(res);
}

/** 标签颜色更新。 */
export async function updateAddressBookTag(tagGuid: string, body: AbTagUpsertRequest): Promise<unknown> {
  const res = await api.PUT("/api/ab/tag/update/{guid}", { params: { path: { guid: tagGuid } }, body });
  return unwrap(res);
}

/** 删除标签（级联清 peer_tags）。 */
export async function deleteAddressBookTag(tagGuid: string): Promise<unknown> {
  const res = await api.DELETE("/api/ab/tag/{guid}", { params: { path: { guid: tagGuid } } });
  return unwrap(res);
}

// ---------------------------------------------------------------------------
// rules
// ---------------------------------------------------------------------------

/** 我的地址簿规则（address_books.view）。 */
export async function listAddressBookRules(): Promise<AbRuleList> {
  const res = await api.GET("/api/ab/rules");
  return unwrap(res);
}

/** 创建规则（user/group 互斥 409；重复 409）。 */
export async function createAddressBookRule(body: AbRuleUpsertRequest): Promise<unknown> {
  const res = await api.POST("/api/ab/rule", { body });
  return unwrap(res);
}

/** 更新规则（guid=规则 guid）。 */
export async function updateAddressBookRule(body: AbRuleUpdateRequest): Promise<unknown> {
  const res = await api.PATCH("/api/ab/rule", { body });
  return unwrap(res);
}

/** 批量删除规则（逐条 FULL_CONTROL 复核）。 */
export async function deleteAddressBookRules(guids: string[]): Promise<unknown> {
  const res = await api.DELETE("/api/ab/rules", { body: { guids } });
  return unwrap(res);
}

/** 便捷构造：custom/shared 书分页参数（经唯一映射点 toPageParams）。 */
export function toBookPageParams(ui: { page: number; pageSize: number; name?: string }): PageParams & { name?: string } {
  return { ...toPageParams(ui), name: ui.name };
}
