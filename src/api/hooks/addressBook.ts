/**
 * 通讯录域 React Query hooks（M4-T06）。
 *
 * 约定：queryKey 一律取 `qk`；页面不直接调 `api.*`；失效用前缀匹配。
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addAddressBookPeer,
  addAddressBookTag,
  createCustomAddressBook,
  createSharedAddressBook,
  deleteAddressBookPeer,
  createAddressBookRule,
  deleteAddressBookRules,
  deleteAddressBookTag,
  deleteCustomAddressBooks,
  deleteSharedAddressBooks,
  getPersonalAddressBook,
  getSharedAddressBookAccess,
  listAddressBookPeers,
  listAddressBookRules,
  listAddressBookTags,
  listCustomAddressBooks,
  listShareCandidates,
  listSharedAddressBooks,
  listSharedWithMe,
  renameAddressBookTag,
  updateAddressBookPeer,
  updateAddressBookRule,
  updateAddressBookTag,
  updateCustomAddressBookProfile,
  updateSharedAddressBook,
  type AbPeerListParams,
  type AbRuleUpdateRequest,
  type AbRuleUpsertRequest,
  type AbTagUpsertRequest,
  type AbPeerUpsertRequest,
  type CreateBookProfileRequest,
  type PageParams,
  type UpdateBookProfileRequest,
  type UpdateSharedBookRequest,
} from "@/api/endpoints/addressBook";
import { qk } from "@/api/queryKeys";

export type { AbTag } from "@/api/endpoints/addressBook";

/** 个人地址簿引用（幂等）。 */
export function usePersonalAb(enabled = true) {
  return useQuery({
    queryKey: qk.addressBooks({ view: "personal" }),
    queryFn: () => getPersonalAddressBook(),
    enabled,
  });
}

/** 自定义地址簿分页。 */
export function useCustomBooks(params: PageParams & { name?: string }, enabled = true) {
  return useQuery({
    queryKey: qk.addressBooks({ view: "custom", ...params }),
    queryFn: () => listCustomAddressBooks(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}

/** 共享地址簿分页（owner/规则并集）。 */
export function useSharedBooks(params: PageParams & { name?: string }, enabled = true) {
  return useQuery({
    queryKey: qk.sharedBooks({ ...params }),
    queryFn: () => listSharedAddressBooks(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}

/** 被共享给我的地址簿（无分页）。 */
export function useSharedWithMe(enabled = true) {
  return useQuery({
    queryKey: qk.sharedBooks({ view: "withMe" }),
    queryFn: () => listSharedWithMe(),
    enabled,
  });
}

/** 共享地址簿访问视图。 */
export function useSharedAccess(guid: string, enabled = true) {
  return useQuery({
    queryKey: [...qk.sharedBooks(), "access", guid],
    queryFn: () => getSharedAddressBookAccess(guid),
    enabled: enabled && guid.length > 0,
  });
}

/** 分享候选（users + groups）。 */
export function useShareCandidates(guid: string, enabled = true) {
  return useQuery({
    queryKey: [...qk.sharedBooks(), "candidates", guid],
    queryFn: () => listShareCandidates(guid),
    enabled: enabled && guid.length > 0,
  });
}

/** 地址簿 peers 列表。 */
export function useAbPeers(params: AbPeerListParams, enabled = true) {
  return useQuery({
    queryKey: qk.abPeers(params.ab, { id: params.id, alias: params.alias, tags: params.tags, mode: params.tagMode }),
    queryFn: () => listAddressBookPeers(params),
    enabled: enabled && params.ab.length > 0,
    placeholderData: (prev) => prev,
  });
}

/** 地址簿标签全量。 */
export function useAbTags(abGuid: string, enabled = true) {
  return useQuery({
    queryKey: qk.abTags(abGuid),
    queryFn: () => listAddressBookTags(abGuid),
    enabled: enabled && abGuid.length > 0,
  });
}

/** 我的地址簿规则（过滤到指定地址簿由调用方完成）。 */
export function useAbRules(enabled = true) {
  return useQuery({
    queryKey: qk.abRules("mine"),
    queryFn: () => listAddressBookRules(),
    enabled,
  });
}

function invalidateAb(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: ["address-book"] });
}

/** 新增/更新 peer。 */
export function useUpsertAbPeer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { mode: "add" | "update"; abGuid: string; peerGuid?: string; body: AbPeerUpsertRequest }) =>
      vars.mode === "add"
        ? addAddressBookPeer(vars.abGuid, vars.body)
        : updateAddressBookPeer(vars.peerGuid ?? "", vars.body),
    onSuccess: () => invalidateAb(queryClient),
  });
}

/** 删除 peer。 */
export function useDeleteAbPeer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (peerGuid: string) => deleteAddressBookPeer(peerGuid),
    onSuccess: () => invalidateAb(queryClient),
  });
}

/** 标签写操作（add / rename / update color / delete）。 */
export function useAbTagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      vars:
        | { op: "add"; abGuid: string; body: AbTagUpsertRequest }
        | { op: "rename"; tagGuid: string; name: string }
        | { op: "color"; tagGuid: string; body: AbTagUpsertRequest }
        | { op: "delete"; tagGuid: string },
    ) => {
      switch (vars.op) {
        case "add":
          return addAddressBookTag(vars.abGuid, vars.body);
        case "rename":
          return renameAddressBookTag(vars.tagGuid, vars.name);
        case "color":
          return updateAddressBookTag(vars.tagGuid, vars.body);
        case "delete":
          return deleteAddressBookTag(vars.tagGuid);
      }
    },
    onSuccess: () => invalidateAb(queryClient),
  });
}

/** 规则写操作（create / update / delete）。 */
export function useAbRuleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      vars:
        | { op: "create"; body: AbRuleUpsertRequest }
        | { op: "update"; body: AbRuleUpdateRequest }
        | { op: "delete"; guids: string[] },
    ) => {
      switch (vars.op) {
        case "create":
          return createAddressBookRule(vars.body);
        case "update":
          return updateAddressBookRule(vars.body);
        case "delete":
          return deleteAddressBookRules(vars.guids);
      }
    },
    onSuccess: () => invalidateAb(queryClient),
  });
}

/** 书写操作（custom/shared 的 create/update/delete 统一入口）。 */
export function useAbBookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      vars:
        | { op: "createCustom"; body: CreateBookProfileRequest }
        | { op: "updateCustom"; body: UpdateBookProfileRequest }
        | { op: "deleteCustom"; guids: string[] }
        | { op: "createShared"; body: CreateBookProfileRequest }
        | { op: "updateShared"; body: UpdateSharedBookRequest }
        | { op: "deleteShared"; guids: string[] },
    ) => {
      switch (vars.op) {
        case "createCustom":
          return createCustomAddressBook(vars.body);
        case "updateCustom":
          return updateCustomAddressBookProfile(vars.body);
        case "deleteCustom":
          return deleteCustomAddressBooks(vars.guids);
        case "createShared":
          return createSharedAddressBook(vars.body);
        case "updateShared":
          return updateSharedAddressBook(vars.body);
        case "deleteShared":
          return deleteSharedAddressBooks(vars.guids);
      }
    },
    onSuccess: () => invalidateAb(queryClient),
  });
}
