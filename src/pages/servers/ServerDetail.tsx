/**
 * 服务器详情页（M4-T05，设计 §5.2 `/servers/:node`，路由门槛 servers.view）。
 *
 * Tabs：peers（上游透传，只读 JSON 预览）/ sessions（断开：servers.disconnect）/
 * config（servers.config：键值 JSON + 动作）/ logs / bans（servers.ban）。
 *
 * ★ 转发错误映射（验收项）：上游 503 / 400 / 404 / 502 / 504 的 message 经
 * `describeServerError` 展示（后端 message 优先原样展示，缺失则本地化模板兜底）。
 */
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Banner,
  Button,
  Descriptions,
  Notification,
  Select,
  TabPane,
  Tabs,
  TextArea,
  Typography,
} from "@douyinfe/semi-ui";
import { IconArrowLeft } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { PermissionButton } from "@/components/PermissionButton";
import { StatusTag } from "@/components/StatusTag";
import type { NodeStatus, ServerService } from "@/api/endpoints/servers";
import { describeServerError } from "@/api/endpoints/servers";
import {
  useSaveServerServiceConfig,
  useDisconnectServerSession,
  useServerBans,
  useServerNode,
  useServerPeers,
  useServerServiceAction,
  useServerServiceConfig,
  useServerServiceLogs,
  useServerSessions,
  useUpdateServerBans,
} from "@/api/hooks/servers";

/** 从上游透传 JSON 防御性提取行数组。 */
function extractRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((x) => typeof x === "object" && x !== null) as Record<string, unknown>[];
  }
  if (payload !== null && typeof payload === "object") {
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data)) {
      return data.filter((x) => typeof x === "object" && x !== null) as Record<string, unknown>[];
    }
  }
  return [];
}

/** 从透传 JSON 提取日志文本。 */
function extractLogs(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (payload !== null && typeof payload === "object") {
    const logs = (payload as { logs?: unknown }).logs;
    if (typeof logs === "string") return logs;
    if (Array.isArray(logs)) return logs.map(String).join("\n");
  }
  return JSON.stringify(payload, null, 2);
}

/** 行数上限展示（透传数据防御性截断）。 */
const MAX_ROWS = 100;

/**
 * 服务器详情页。
 *
 * @returns 节点信息 + peers / sessions / config / logs / bans
 */
export function ServerDetail() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const { node = "" } = useParams<{ node: string }>();
  const navigate = useNavigate();

  const status: NodeStatus | undefined = useServerNode(node);
  const peers = useServerPeers(node);
  const sessions = useServerSessions(node);
  const [service, setService] = useState<ServerService>("hbbs");
  const config = useServerServiceConfig(node, service);
  const logs = useServerServiceLogs(node, service);
  const bans = useServerBans(node);

  const saveConfig = useSaveServerServiceConfig(node, service);
  const runAction = useServerServiceAction(node, service);
  const disconnectSession = useDisconnectServerSession(node);
  const updateBans = useUpdateServerBans(node);

  const [configText, setConfigText] = useState("");
  const [deviceIdsText, setDeviceIdsText] = useState("");
  const [ipsText, setIpsText] = useState("");

  const onError = (err: unknown): void => {
    // ★ 服务器转发错误映射（503/400/404/502/504 的 message 展示）
    Notification.error({ content: describeServerError(err), duration: 5 });
  };

  const sessionRows = extractRows(sessions.data).slice(0, MAX_ROWS);
  const sessionKeys = ["uuid", "conn_id", "peer_id", "ip", "created_at"].filter((k) =>
    sessionRows.some((r) => k in r),
  );
  const peerRows = extractRows(peers.data).slice(0, MAX_ROWS);
  const logText = extractLogs(logs.data);

  if (status === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader titleKey="menu:servers" />
        <Banner type="warning" description={t("servers.empty")} closeIcon={null} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("servers.detailTitle")}
        description={status.name}
        extra={
          <Button icon={<IconArrowLeft />} theme="borderless" onClick={() => navigate("/servers")}>
            {t("servers.action.backToList")}
          </Button>
        }
      />

      <Descriptions
        data={[
          { key: t("servers.field.id"), value: status.id },
          {
            key: t("servers.field.reachable"),
            value: <StatusTag status={status.reachable ? "online" : "offline"} />,
          },
          {
            key: t("servers.field.services"),
            value: status.services.join(" / ") || tc("state.noDescription"),
          },
          { key: t("servers.field.version"), value: status.version ?? tc("state.noDescription") },
          {
            key: t("servers.field.apiVersion"),
            value: status.api_version === undefined ? tc("state.noDescription") : String(status.api_version),
          },
          { key: t("servers.field.error"), value: status.error ?? tc("state.noDescription") },
        ]}
      />

      {!status.reachable ? (
        <Banner type="warning" description={t("servers.unreachable")} closeIcon={null} />
      ) : null}

      <Tabs type="line">
        <TabPane tab={t("servers.tabs.peers")} itemKey="peers">
          {peerRows.length === 0 ? (
            <Typography.Text type="tertiary">{t("servers.peersEmpty")}</Typography.Text>
          ) : (
            <pre className="max-h-[480px] overflow-auto rounded bg-semi-color-fill-0 p-3 text-xs">
              {JSON.stringify(peerRows, null, 2)}
            </pre>
          )}
        </TabPane>

        <TabPane tab={t("servers.tabs.sessions")} itemKey="sessions">
          {sessionRows.length === 0 ? (
            <Typography.Text type="tertiary">{t("servers.sessionsEmpty")}</Typography.Text>
          ) : (
            <div className="flex flex-col gap-1">
              {sessionRows.map((row, i) => (
                <div key={i} className="flex items-center gap-3 rounded p-1">
                  <Typography.Text style={{ minWidth: 320 }}>
                    {sessionKeys.map((k) => `${k}=${String(row[k])}`).join("  ")}
                  </Typography.Text>
                  <PermissionButton
                    size="small"
                    theme="borderless"
                    type="danger"
                    code="servers.disconnect"
                    onClick={() =>
                      disconnectSession.mutate(String(row.uuid ?? row.id ?? ""), {
                        onSuccess: () => Notification.success({ content: t("servers.sessionDisconnected") }),
                        onError,
                      })
                    }
                  >
                    {t("servers.action.disconnect")}
                  </PermissionButton>
                </div>
              ))}
            </div>
          )}
        </TabPane>

        <TabPane tab={t("servers.tabs.config")} itemKey="config">
          <div className="flex flex-col gap-3">
            <Select
              value={service}
              style={{ width: 220 }}
              aria-label={t("servers.tabs.config")}
              onChange={(v) => setService(v as ServerService)}
              optionList={[
                { value: "hbbs", label: t("servers.service.hbbs") },
                { value: "hbbr", label: t("servers.service.hbbr") },
              ]}
            />
            {config.data !== undefined ? (
              <TextArea
                value={configText.length > 0 ? configText : JSON.stringify(config.data.values ?? {}, null, 2)}
                rows={12}
                aria-label={t("servers.tabs.config")}
                onChange={(v) => setConfigText(v)}
              />
            ) : (
              <Typography.Text type="tertiary">{tc("state.loading")}</Typography.Text>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <PermissionButton
                code="servers.config"
                theme="solid"
                loading={saveConfig.isPending}
                onClick={() => {
                  let values: Record<string, string>;
                  try {
                    const parsed: unknown = JSON.parse(
                      configText.length > 0 ? configText : JSON.stringify(config.data?.values ?? {}),
                    );
                    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
                      throw new TypeError("not an object");
                    }
                    values = parsed as Record<string, string>;
                  } catch {
                    Notification.error({ content: tc("state.unknownError"), duration: 4 });
                    return;
                  }
                  saveConfig.mutate(values, {
                    onSuccess: () => Notification.success({ content: t("servers.configSaved") }),
                    onError,
                  });
                }}
              >
                {t("servers.action.save")}
              </PermissionButton>
              {(["start", "stop", "restart", "apply"] as const).map((action) => (
                <PermissionButton
                  key={action}
                  code="servers.control"
                  size="small"
                  loading={runAction.isPending && runAction.variables === action}
                  onClick={() =>
                    runAction.mutate(action, {
                      onSuccess: () => Notification.success({ content: t("servers.actionDone") }),
                      onError,
                    })
                  }
                >
                  {t(`servers.action.${action}`)}
                </PermissionButton>
              ))}
            </div>
          </div>
        </TabPane>

        <TabPane tab={t("servers.tabs.logs")} itemKey="logs">
          {logText.length === 0 ? (
            <Typography.Text type="tertiary">{t("servers.logsEmpty")}</Typography.Text>
          ) : (
            <pre className="max-h-[480px] overflow-auto rounded bg-semi-color-fill-0 p-3 text-xs">{logText}</pre>
          )}
        </TabPane>

        <TabPane tab={t("servers.tabs.bans")} itemKey="bans">
          {bans.data !== undefined ? (
            <div className="flex flex-col gap-3">
              <TextArea
                value={deviceIdsText.length > 0 ? deviceIdsText : bans.data.device_ids.join("\n")}
                rows={6}
                aria-label={t("servers.bannedDeviceIds")}
                onChange={(v) => setDeviceIdsText(v)}
              />
              <TextArea
                value={ipsText.length > 0 ? ipsText : bans.data.ips.join("\n")}
                rows={6}
                aria-label={t("servers.bannedIps")}
                onChange={(v) => setIpsText(v)}
              />
              <PermissionButton
                code="servers.ban"
                theme="solid"
                loading={updateBans.isPending}
                onClick={() => {
                  const parseLines = (text: string): string[] =>
                    text
                      .split("\n")
                      .map((s) => s.trim())
                      .filter((s) => s.length > 0);
                  updateBans.mutate(
                    {
                      device_ids:
                        deviceIdsText.length > 0
                          ? parseLines(deviceIdsText)
                          : bans.data.device_ids,
                      ips: ipsText.length > 0 ? parseLines(ipsText) : bans.data.ips,
                    },
                    {
                      onSuccess: () => {
                        Notification.success({ content: t("servers.bansSaved") });
                        setDeviceIdsText("");
                        setIpsText("");
                        void bans.refetch();
                      },
                      onError,
                    },
                  );
                }}
              >
                {tc("action.save")}
              </PermissionButton>
            </div>
          ) : (
            <Typography.Text type="tertiary">{t("servers.bansEmpty")}</Typography.Text>
          )}
        </TabPane>
      </Tabs>
    </div>
  );
}
