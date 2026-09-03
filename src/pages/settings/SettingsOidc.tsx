/**
 * 单点登录（OIDC 提供者）页（M4-T06；路由 /settings/oidc，门槛 is_admin）。
 *
 * 契约要点：
 * - 列表分页（priority ASC + name ASC）；clientSecret 契约为明文（admin 可见）；
 * - 创建 POST 200；启用切换走 toggle；★ 排序 = guid 数组（PATCH /sort，顺序即 priority）；
 * - discovery 测试恒 200 {success,message,endpoints?}。
 */
import { useState } from "react";
import { Button, Form, Notification, Popconfirm, Switch, Tag } from "@douyinfe/semi-ui";
import { IconArrowUp, IconPlus } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import type { ColumnProps } from "@douyinfe/semi-ui/lib/es/table";
import { DataTable } from "@/components/DataTable";
import { Modal } from "@douyinfe/semi-ui";
import { PageHeader } from "@/components/PageHeader";
import { toDisplayMessage } from "@/api/error";
import type { OidcProviderDto, OidcProviderUpsert } from "@/api/endpoints/oidc";
import { useOidcMutation, useOidcProviders } from "@/api/hooks/settings";

/**
 * 单点登录页。
 *
 * @returns 提供者表格 + 新建/编辑弹窗 + 排序（上移）+ 测试/启停/删除
 */
export function SettingsOidc() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const query = useOidcProviders();
  const mutation = useOidcMutation();

  const [editorGuid, setEditorGuid] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const providers = query.data?.data ?? [];

  const onError = (err: unknown): void => {
    Notification.error({ content: toDisplayMessage(err), duration: 4 });
  };

  /** 上移一位：重排 guid 数组后按顺序提交排序（数组顺序即 priority）。 */
  const moveUp = (index: number): void => {
    if (index <= 0) return;
    const guids = providers.map((p) => p.guid);
    [guids[index - 1], guids[index]] = [guids[index], guids[index - 1]];
    mutation.mutate({ op: "sort", guids }, { onSuccess: () => undefined, onError });
  };

  /** 新建/编辑提交。 */
  const submitUpsert = (values: Record<string, unknown>): void => {
    const body: OidcProviderUpsert = {
      name: String(values.name ?? ""),
      type: values.type === "oauth2" ? "oauth2" : "oidc",
      issuer: String(values.issuer ?? ""),
      clientId: String(values.clientId ?? ""),
      clientSecret: String(values.clientSecret ?? ""),
      scope: typeof values.scope === "string" && values.scope.length > 0 ? values.scope : undefined,
      enabled: values.enabled !== false,
      priority: typeof values.priority === "number" ? values.priority : undefined,
    };
    setSubmitting(true);
    mutation.mutate(
      editorGuid !== null ? { op: "update", guid: editorGuid, body } : { op: "create", body },
      {
        onSuccess: () => {
          Notification.success({ content: editorGuid !== null ? t("settings.oidcUpdated") : t("settings.oidcCreated") });
          setSubmitting(false);
          setEditorGuid(null);
          setCreating(false);
        },
        onError: (err) => {
          onError(err);
          setSubmitting(false);
        },
      },
    );
  };

  const columns: ColumnProps<OidcProviderDto>[] = [
    { title: t("settings.field.oidcName"), dataIndex: "name", width: 140 },
    { title: t("settings.field.oidcType"), dataIndex: "type", width: 90,
      render: (v: OidcProviderDto["type"]) => <Tag color={v === "oidc" ? "blue" : "cyan"}>{v}</Tag> },
    { title: t("settings.field.oidcIssuer"), dataIndex: "issuer",
      render: (v: string) => (v.length > 40 ? `${v.slice(0, 40)}…` : v) },
    { title: t("settings.field.oidcClientId"), dataIndex: "clientId", width: 160 },
    { title: t("settings.field.oidcPriority"), dataIndex: "priority", width: 90 },
    { title: t("settings.field.oidcEnabled"), dataIndex: "enabled", width: 90,
      render: (v: boolean, row: OidcProviderDto) => (
        <Switch checked={v} size="small" aria-label={t("settings.field.oidcEnabled")}
          onChange={() => mutation.mutate({ op: "toggle", guid: row.guid }, { onError })} />
      ) },
    {
      title: tc("table.actions"),
      width: 260,
      render: (_v: unknown, row: OidcProviderDto) => {
        const index = providers.findIndex((p) => p.guid === row.guid);
        return (
          <div className="flex items-center gap-1">
            <Button size="small" theme="borderless" disabled={index <= 0}
              icon={<IconArrowUp />} aria-label={t("settings.action.moveUp")}
              onClick={() => moveUp(index)} />
            <Button size="small" theme="borderless"
              onClick={() => mutation.mutate({ op: "test", guid: row.guid }, {
                onSuccess: (raw) => {
                  // 联合写操作统一入口使回调参数为 unknown，此处按测试结果契约窄化
                  const r = raw as { success: boolean; message: string };
                  if (r.success) {
                    Notification.success({ content: `${t("settings.testDone")}：${r.message}` });
                  } else {
                    Notification.warning({ content: `${t("settings.testFailed")}：${r.message}`, duration: 6 });
                  }
                },
                onError,
              })}>
              {t("settings.action.testOidc")}
            </Button>
            <Button size="small" theme="borderless" onClick={() => setEditorGuid(row.guid)}>
              {t("settings.action.edit")}
            </Button>
            <Popconfirm title={t("settings.oidcDeleteConfirm")} onConfirm={() =>
              mutation.mutate({ op: "delete", guid: row.guid }, {
                onSuccess: () => Notification.success({ content: t("settings.oidcDeleted") }),
                onError,
              })}>
              <Button size="small" theme="borderless" type="danger">{t("settings.action.delete")}</Button>
            </Popconfirm>
          </div>
        );
      },
    },
  ];

  /** 编辑目标（从列表取行数据）。 */
  const editing = editorGuid !== null ? (providers.find((p) => p.guid === editorGuid) ?? null) : null;
  const editorOpen = creating || editing !== null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titleKey="menu:settingsOidc"
        description={t("settings.oidcDesc")}
        extra={
          <Button theme="solid" icon={<IconPlus />} onClick={() => setCreating(true)}>
            {t("settings.action.createOidc")}
          </Button>
        }
      />

      <DataTable<OidcProviderDto>
        columns={columns}
        dataSource={providers}
        loading={query.isLoading}
        rowKey="guid"
      />

      <Modal
        title={editing !== null ? t("settings.oidcEditTitle", { name: editing.name }) : t("settings.oidcCreateTitle")}
        visible={editorOpen}
        width={560}
        onCancel={() => {
          setCreating(false);
          setEditorGuid(null);
        }}
        closeOnEsc
      >
        <Form
          key={editorGuid ?? "create"}
          initValues={
            editing !== null
              ? { ...editing }
              : { type: "oidc", enabled: true, scope: "openid email profile" }
          }
          onSubmit={(values) => submitUpsert(values as Record<string, unknown>)}
          labelPosition="left"
          labelWidth={140}
        >
          <Form.Input field="name" label={t("settings.field.oidcName")} rules={[{ required: true }]} maxLength={64} />
          <Form.Select field="type" label={t("settings.field.oidcType")} style={{ width: 220 }}
            optionList={[
              { value: "oidc", label: "OIDC" },
              { value: "oauth2", label: "OAuth2" },
            ]}
          />
          <Form.Input field="issuer" label={t("settings.field.oidcIssuer")} rules={[{ required: true }]}
            placeholder="https://accounts.example.com" />
          <Form.Input field="clientId" label={t("settings.field.oidcClientId")} rules={[{ required: true }]} />
          <Form.Input field="clientSecret" label={t("settings.field.oidcClientSecret")} mode="password"
            rules={[{ required: true }]} />
          <Form.Input field="scope" label={t("settings.field.oidcScope")} />
          <Form.InputNumber field="priority" label={t("settings.field.oidcPriority")} hideButtons style={{ width: 220 }} />
          <Form.Switch field="enabled" label={t("settings.field.oidcEnabled")} />
          <Button htmlType="submit" theme="solid" loading={submitting} className="mt-2">
            {tc("action.save")}
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
