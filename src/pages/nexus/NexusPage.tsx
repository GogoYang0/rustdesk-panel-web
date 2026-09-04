/**
 * Nexus 构建页（M4-T06；路由 /nexus，仅需登录；绑定/构建均为「当前用户」语义）。
 *
 * 契约要点：
 * - 绑定态 NexusBindStatus；未绑定时走 GitHub 设备码登录（startNexusLogin →
 *   轮询 getNexusLoginStatus，status==='authorized'（防御性大小写归一）视为完成）；
 * - 构建提交 ★201、取消 ★204；上游 401（重新绑定）/ 409（进行中 / 月度限额）由错误包络展示；
 * - 产物下载为 blob（Content-Disposition 由后端处理，前端用 a[download] 触发）。
 */
import { useEffect, useRef, useState } from "react";
import { Button, Descriptions, Form, Modal, Notification, Popconfirm, Tag } from "@douyinfe/semi-ui";
import { IconRefresh } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import type { ColumnProps } from "@douyinfe/semi-ui/lib/es/table";
import { DataTable } from "@/components/DataTable";
import { FormModal } from "@/components/FormModal";
import { PageHeader } from "@/components/PageHeader";
import { StatusTag } from "@/components/StatusTag";
import { toDisplayMessage } from "@/api/error";
import type { NexusBuildView, NexusDeviceCodePayload } from "@/api/endpoints/nexus";
import { NexusBuildDetail } from "@/pages/nexus/NexusBuildDetail";
import {
  useCancelNexusBuild,
  useCreateNexusBuild,
  useNexusBindStatus,
  useNexusBuilds,
  useNexusLoginStatus,
  useStartNexusLogin,
  useUnbindNexus,
} from "@/api/hooks/nexus";

/** 设备码轮询间隔（ms）。 */
const POLL_INTERVAL_MS = 3000;
/** 载荷未声明 expires_in 时的默认有效期（秒；GitHub device flow 常规值）。 */
const DEFAULT_POLL_EXPIRES_IN = 300;

/** 构建状态 → StatusTag kind。 */
function buildStatusKind(status: NexusBuildView["status"]): "active" | "online" | "enabled" | "disabled" | "expired" {
  switch (status) {
    case "completed":
      return "enabled";
    case "failed":
      return "disabled";
    case "cancelled":
      return "expired";
    default:
      return "active";
  }
}

/** 授权态归一（上游透传，大小写防御性归一）。 */
function isAuthorized(status: string | undefined): boolean {
  return typeof status === "string" && status.toLowerCase() === "authorized";
}

/**
 * Nexus 构建页。
 *
 * @returns 绑定卡片 + 构建列表 + 新建构建弹窗 + 产物弹窗
 */
export function NexusPage() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");

  const bindQuery = useNexusBindStatus();
  const buildsQuery = useNexusBuilds();

  const startLogin = useStartNexusLogin();
  const pollLogin = useNexusLoginStatus();
  const unbind = useUnbindNexus();
  const createBuild = useCreateNexusBuild();
  const cancelBuild = useCancelNexusBuild();

  const [deviceCode, setDeviceCode] = useState<NexusDeviceCodePayload | null>(null);
  const [creating, setCreating] = useState(false);
  const [filesRow, setFilesRow] = useState<NexusBuildView | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // M4-T07 MIN-03：并发防护——上一轮轮询请求未返回前不发起新请求
  const pollInFlight = useRef(false);

  const bound = bindQuery.data?.bound === true;

  // 设备码轮询：登录载荷存在时每 3s 轮询一次，授权完成即清载荷并刷新绑定态。
  // M4-T07 MIN-02：带过期上限——按载荷 expires_in（缺省 300s）计算截止时间，
  // 超时后停止轮询并给出提示，避免设备码长期失效后无限空转。
  useEffect(() => {
    if (deviceCode === null || deviceCode.login_id === undefined) return undefined;
    const loginId = deviceCode.login_id;
    const rawExpiresIn = deviceCode.expires_in;
    const expiresInSec =
      typeof rawExpiresIn === "number" && Number.isFinite(rawExpiresIn) && rawExpiresIn > 0
        ? rawExpiresIn
        : DEFAULT_POLL_EXPIRES_IN;
    const expiresAt = Date.now() + expiresInSec * 1000;
    pollTimer.current = setInterval(() => {
      // MIN-03：上一轮请求未返回时不叠加新请求
      if (pollInFlight.current) return;
      // MIN-02：到达过期时间即停止轮询
      if (Date.now() >= expiresAt) {
        setDeviceCode(null);
        Notification.error({ content: t("nexus.deviceCodeExpired"), duration: 4 });
        return;
      }
      pollInFlight.current = true;
      pollLogin.mutate(loginId, {
        onSuccess: (payload) => {
          if (isAuthorized(payload.status)) {
            setDeviceCode(null);
            void bindQuery.refetch();
            Notification.success({ content: t("nexus.bindSuccess") });
          }
        },
        onSettled: () => {
          pollInFlight.current = false;
        },
      });
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollTimer.current !== null) clearInterval(pollTimer.current);
      pollTimer.current = null;
    };
  }, [deviceCode]);

  const onError = (err: unknown): void => {
    Notification.error({ content: toDisplayMessage(err), duration: 4 });
  };

  const columns: ColumnProps<NexusBuildView>[] = [
    { title: t("nexus.field.uuid"), dataIndex: "uuid", width: 150,
      render: (v: string) => (v.length > 12 ? `${v.slice(0, 12)}…` : v) },
    { title: t("nexus.field.os"), dataIndex: "os", width: 90 },
    { title: t("nexus.field.arch"), dataIndex: "arch", width: 100 },
    { title: t("nexus.field.status"), dataIndex: "status", width: 120,
      render: (v: NexusBuildView["status"]) => <StatusTag status={buildStatusKind(v)} label={t("nexus.status." + v)} /> },
    { title: t("nexus.field.message"), dataIndex: "message",
      render: (v: string | undefined) => v || "—" },
    { title: t("nexus.field.createdAt"), dataIndex: "created_at", width: 170,
      render: (v: string | undefined) => (v ? new Date(v).toLocaleString() : "—") },
    {
      title: tc("table.actions"),
      width: 200,
      render: (_v: unknown, row: NexusBuildView) => (
        <div className="flex items-center gap-1">
          {row.status === "completed" ? (
            <Button size="small" theme="borderless" onClick={() => setFilesRow(row)}>
              {t("nexus.action.files")}
            </Button>
          ) : null}
          {row.status === "pending" || row.status === "building" ? (
            <Popconfirm title={t("nexus.cancelConfirm")} onConfirm={() =>
              cancelBuild.mutate(row.uuid, {
                onSuccess: () => Notification.success({ content: t("nexus.cancelled") }),
                onError,
              })}>
              <Button size="small" theme="borderless" type="danger">
                {t("nexus.action.cancel")}
              </Button>
            </Popconfirm>
          ) : null}
        </div>
      ),
    },
  ];

  /** 新建构建提交（os 固定 windows）。 */
  const submitBuild = (values: Record<string, unknown>): void => {
    setSubmitting(true);
    createBuild.mutate(
      {
        os: "windows",
        arch: (typeof values.arch === "string" ? values.arch : "x86_64") as "x86_64" | "aarch64" | "x86",
        custom: {
          "app-name": String(values.app_name ?? "RustDesk"),
          "conn-type": String(values.conn_type ?? "all"),
          // 可选扩展键：每行 key=value（契约 custom 为开放键值，键校验归上游）
          ...parseCustomExtra(typeof values.custom_extra === "string" ? values.custom_extra : ""),
        },
      },
      {
        onSuccess: () => {
          Notification.success({ content: t("nexus.created") });
          setSubmitting(false);
          setCreating(false);
        },
        onError: (err) => {
          onError(err);
          setSubmitting(false);
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titleKey="menu:nexus"
        extra={
          <Button theme="borderless" icon={<IconRefresh />} onClick={() => void buildsQuery.refetch()}>
            {tc("action.refresh")}
          </Button>
        }
      />

      {/* 绑定状态卡片 */}
      <div className="rounded border border-[var(--semi-color-border)] p-4">
        {bound ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Descriptions
              row
              size="small"
              data={[
                { key: t("nexus.field.nexusUser"), value: bindQuery.data?.nexus_username ?? "—" },
                { key: t("nexus.field.expiresAt"),
                  value: bindQuery.data?.expires_at ? new Date(bindQuery.data.expires_at).toLocaleString() : "—" },
              ]}
            />
            <Popconfirm title={t("nexus.unbindConfirm")} onConfirm={() =>
              unbind.mutate(undefined, {
                onSuccess: () => Notification.success({ content: t("nexus.unbound") }),
                onError,
              })}>
              <Button theme="borderless" type="danger">{t("nexus.action.unbind")}</Button>
            </Popconfirm>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Tag color="orange">{t("nexus.notBound")}</Tag>
            <Button theme="solid" disabled={deviceCode !== null}
              onClick={() =>
                startLogin.mutate(undefined, {
                  onSuccess: (payload) => setDeviceCode(payload),
                  onError,
                })
              }>
              {t("nexus.action.bind")}
            </Button>
          </div>
        )}
      </div>

      <DataTable<NexusBuildView>
        columns={columns}
        dataSource={buildsQuery.data ?? []}
        loading={buildsQuery.isLoading}
        rowKey="uuid"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button theme="solid" disabled={!bound} onClick={() => setCreating(true)}>
          {t("nexus.action.create")}
        </Button>
        {!bound ? <span className="text-xs text-[var(--semi-color-text-2)]">{t("nexus.bindRequired")}</span> : null}
      </div>

      {/* 设备码登录弹窗 */}
      <Modal title={t("nexus.deviceCodeTitle")} visible={deviceCode !== null}
        onCancel={() => setDeviceCode(null)} footer={null} width={480}>
        {deviceCode !== null ? (
          <div className="flex flex-col gap-3">
            <div className="text-center text-2xl font-mono font-bold tracking-widest">
              {deviceCode.user_code ?? "—"}
            </div>
            {typeof deviceCode.verification_uri === "string" ? (
              <div className="text-sm text-center">
                {t("nexus.visitUri")}：<a href={deviceCode.verification_uri} target="_blank" rel="noreferrer">{deviceCode.verification_uri}</a>
              </div>
            ) : null}
            <div className="text-xs text-center text-[var(--semi-color-text-2)]">{t("nexus.pollingHint")}</div>
          </div>
        ) : null}
      </Modal>

      {/* 新建构建弹窗 */}
      <FormModal
        visible={creating}
        title={t("nexus.createTitle")}
        submitting={submitting}
        onClose={() => setCreating(false)}
        onSubmit={submitBuild}
        initialValues={{ arch: "x86_64", app_name: "RustDesk", conn_type: "all" }}
      >
        <Form.Select field="arch" label={t("nexus.field.arch")} style={{ width: "100%" }}
          optionList={[
            { value: "x86_64", label: "x86_64" },
            { value: "aarch64", label: "aarch64" },
            { value: "x86", label: "x86" },
          ]}
        />
        <Form.Input field="app_name" label={t("nexus.field.appName")} maxLength={32} />
        <Form.Select field="conn_type" label={t("nexus.field.connType")} style={{ width: "100%" }}
          optionList={[
            { value: "all", label: t("nexus.connType.all") },
            { value: "direct", label: t("nexus.connType.direct") },
            { value: "relay", label: t("nexus.connType.relay") },
          ]}
        />
        <Form.TextArea field="custom_extra" label={t("nexus.field.customExtra")} rows={2}
          placeholder="key=value（每行一项，可选）" />
      </FormModal>

      {filesRow !== null ? <NexusBuildDetail uuid={filesRow.uuid} visible onClose={() => setFilesRow(null)} /> : null}
    </div>
  );
}

/** 可选扩展键解析：每行 key=value → 对象（非法行忽略）。 */
export function parseCustomExtra(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/u)) {
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key.length > 0 && value.length > 0) out[key] = value;
  }
  return out;
}
