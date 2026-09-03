/**
 * 设置域 + OIDC React Query hooks（M4-T06）。
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getFrontendSettings,
  getGeneralSettings,
  getLdapSettings,
  getSmtpSettings,
  getUpdateCheck,
  testLdapSettings,
  testSmtpSettings,
  updateGeneralSettings,
  updateLdapSettings,
  updateSmtpSettings,
  type LdapConfig,
  type SmtpConfig,
  type UpdateGeneralSettings,
} from "@/api/endpoints/settings";
import {
  createOidcProvider,
  deleteOidcProvider,
  listOidcProviders,
  sortOidcProviders,
  testOidcProvider,
  toggleOidcProvider,
  updateOidcProvider,
  type OidcProviderUpsert,
} from "@/api/endpoints/oidc";
import { qk } from "@/api/queryKeys";

/** 前端公开设置（Public）。 */
export function useFrontendSettings(enabled = true) {
  return useQuery({ queryKey: qk.frontend, queryFn: () => getFrontendSettings(), enabled });
}

/** 通用设置。 */
export function useGeneralSettings(enabled = true) {
  return useQuery({
    queryKey: qk.generalSettings(),
    queryFn: () => getGeneralSettings(),
    enabled,
    retry: false,
  });
}

/** SMTP 配置（无配置 404 → 由页面按空表单处理，retry 关闭）。 */
export function useSmtpSettings(enabled = true) {
  return useQuery({
    queryKey: qk.smtpSettings(),
    queryFn: () => getSmtpSettings(),
    enabled,
    retry: false,
  });
}

/** LDAP 配置（无配置 404 → 由页面按空表单处理）。 */
export function useLdapSettings(enabled = true) {
  return useQuery({
    queryKey: qk.ldapSettings(),
    queryFn: () => getLdapSettings(),
    enabled,
    retry: false,
  });
}

/** 更新检查。 */
export function useUpdateCheck(frontendVersion?: string, enabled = true) {
  return useQuery({
    queryKey: qk.updateCheck(frontendVersion),
    queryFn: () => getUpdateCheck(frontendVersion),
    enabled,
    retry: false,
  });
}

function invalidateSettings(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: ["settings"] });
}

/** 更新通用设置。 */
export function useUpdateGeneralSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateGeneralSettings) => updateGeneralSettings(body),
    onSuccess: () => invalidateSettings(queryClient),
  });
}

/** 更新 SMTP 配置。 */
export function useUpdateSmtpSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SmtpConfig) => updateSmtpSettings(body),
    onSuccess: () => invalidateSettings(queryClient),
  });
}

/** SMTP 连通性测试（恒 200）。 */
export function useTestSmtpSettings() {
  return useMutation({ mutationFn: (body?: SmtpConfig) => testSmtpSettings(body) });
}

/** 更新 LDAP 配置。 */
export function useUpdateLdapSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: LdapConfig) => updateLdapSettings(body),
    onSuccess: () => invalidateSettings(queryClient),
  });
}

/** LDAP 连通性测试（恒 200）。 */
export function useTestLdapSettings() {
  return useMutation({ mutationFn: (body?: LdapConfig) => testLdapSettings(body) });
}

/** OIDC 提供者分页。 */
export function useOidcProviders(enabled = true) {
  return useQuery({
    queryKey: qk.oidcProviders(),
    queryFn: () => listOidcProviders(),
    enabled,
  });
}

/** OIDC 提供者写操作统一入口（create / update / delete / toggle / sort / test）。 */
export function useOidcMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      vars:
        | { op: "create"; body: OidcProviderUpsert }
        | { op: "update"; guid: string; body: OidcProviderUpsert }
        | { op: "delete"; guid: string }
        | { op: "toggle"; guid: string }
        | { op: "sort"; guids: string[] }
        | { op: "test"; guid: string },
    ) => {
      switch (vars.op) {
        case "create":
          return createOidcProvider(vars.body);
        case "update":
          return updateOidcProvider(vars.guid, vars.body);
        case "delete":
          return deleteOidcProvider(vars.guid);
        case "toggle":
          return toggleOidcProvider(vars.guid);
        case "sort":
          return sortOidcProviders(vars.guids);
        case "test":
          return testOidcProvider(vars.guid);
      }
    },
    onSuccess: () => invalidateSettings(queryClient),
  });
}
