/**
 * nexus 域 React Query hooks（M4-T06）。
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelNexusBuild,
  createNexusBuild,
  getNexusBindStatus,
  getNexusLoginStatus,
  listNexusBuildFiles,
  listNexusBuilds,
  startNexusLogin,
  unbindNexus,
  type NexusGenerateDto,
} from "@/api/endpoints/nexus";
import { qk } from "@/api/queryKeys";

/** nexus 绑定态。 */
export function useNexusBindStatus(enabled = true) {
  return useQuery({
    queryKey: qk.nexusBindStatus,
    queryFn: () => getNexusBindStatus(),
    enabled,
  });
}

/** 构建列表（本库，当前用户）。 */
export function useNexusBuilds(enabled = true) {
  return useQuery({
    queryKey: qk.nexusBuilds(),
    queryFn: () => listNexusBuilds(),
    enabled,
  });
}

/** 构建产物清单。 */
export function useNexusBuildFiles(uuid: string, enabled = true) {
  return useQuery({
    queryKey: qk.nexusBuildFiles(uuid),
    queryFn: () => listNexusBuildFiles(uuid),
    enabled: enabled && uuid.length > 0,
  });
}

/** 发起设备码登录（无缓存，直接返回载荷）。 */
export function useStartNexusLogin() {
  return useMutation({ mutationFn: () => startNexusLogin() });
}

/** 轮询授权态（无缓存）。 */
export function useNexusLoginStatus() {
  return useMutation({
    mutationFn: (loginId: string) => getNexusLoginStatus(loginId),
  });
}

/** 解绑 nexus。 */
export function useUnbindNexus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unbindNexus(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["nexus"] });
    },
  });
}

/** 提交构建（201）→ 失效构建列表。 */
export function useCreateNexusBuild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: NexusGenerateDto) => createNexusBuild(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["nexus"] });
    },
  });
}

/** 取消构建（204）→ 失效构建列表。 */
export function useCancelNexusBuild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) => cancelNexusBuild(uuid),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["nexus"] });
    },
  });
}
