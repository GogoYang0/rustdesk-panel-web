/**
 * 通讯录共享组件（M4-T06，personal / shared / custom 三页复用）。
 *
 * 契约要点：
 * - `AbPeer.tags` 兼容怪癖：可能为数组、JSON 编码串、legacy `'null'` 字符串或缺失，
 *   `parseAbTags` 统一归一化为 `string[]`（legacy `'null'` 特例不崩，验收项）；
 * - 规则级别 1=READ / 2=READ_WRITE / 3=FULL_CONTROL；user/group 互斥 409；
 * - 权限红线：前端只做 UI 显隐，address_books.edit / address_books.share 由后端实时复核。
 *
 * 组件选型（Semi 已查证）：Table / Form / Modal / Select / Tag / Popconfirm / Notification。
 */
import { useState } from "react";
import { Button, Form, Input, Modal, Notification, Popconfirm, Select, Tag } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import type { ColumnProps } from "@douyinfe/semi-ui/lib/es/table";
import { DataTable } from "@/components/DataTable";
import { FormModal } from "@/components/FormModal";
import { PermissionButton } from "@/components/PermissionButton";
import { SearchBar } from "@/components/SearchBar";
import { toDisplayMessage } from "@/api/error";
import type { AbPeer, AbRule } from "@/api/endpoints/addressBook";
import {
  useAbPeers,
  useAbRules,
  useAbTags,
  useAbTagMutation,
  useAbRuleMutation,
  useDeleteAbPeer,
  useUpsertAbPeer,
  type AbTag,
} from "@/api/hooks/addressBook";
import { useTableQuery } from "@/hooks/useTableQuery";

/**
 * 归一化 AbPeer.tags：数组 → 原样；JSON 编码串 → 解析；legacy `'null'` → 空数组。
 *
 * @param value 契约 tags 字段原始值
 * @returns 标签 guid 数组（永不抛异常）
 */
export function parseAbTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    // legacy 'null' 特例：客户端落库的字符串 'null' 不是 JSON 数组
    if (trimmed.length === 0 || trimmed === "null") return [];
    try {
      const parsed: unknown = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** 规则级别选项值。 */
const RULE_LEVELS: readonly { value: AbRule["rule"]; key: string }[] = [
  { value: 1, key: "addressBook.rule.read" },
  { value: 2, key: "addressBook.rule.readWrite" },
  { value: 3, key: "addressBook.rule.fullControl" },
];

/** 规则级别 Tag 颜色。 */
const RULE_COLOR: Record<AbRule["rule"], "grey" | "blue" | "green"> = {
  1: "grey",
  2: "blue",
  3: "green",
};

/** AbPeersSection 属性。 */
export interface AbPeersSectionProps {
  /** 地址簿 guid */
  abGuid: string;
  /** 是否可管理（编辑联系人 / 标签 / 规则按钮显隐） */
  editable: boolean;
}

/**
 * 地址簿联系人区块：联系人表格 + 增删改 + 标签管理 + 规则管理。
 */
export function AbPeersSection({ abGuid, editable }: AbPeersSectionProps) {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const { state, setKeyword } = useTableQuery();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editPeer, setEditPeer] = useState<AbPeer | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  const peersQuery = useAbPeers({
    ab: abGuid,
    id: state.keyword.length > 0 ? state.keyword : undefined,
  });

  const upsertPeer = useUpsertAbPeer();
  const removePeer = useDeleteAbPeer();

  const onError = (err: unknown): void => {
    Notification.error({ content: toDisplayMessage(err), duration: 4 });
  };

  const columns: ColumnProps<AbPeer>[] = [
    { title: t("addressBook.field.deviceId"), dataIndex: "device_id", width: 160 },
    { title: t("addressBook.field.alias"), dataIndex: "alias",
      render: (v: string | undefined) => v || tc("state.noDescription") },
    { title: t("addressBook.field.tags"), dataIndex: "tags",
      render: (v: unknown) => {
        const tags = parseAbTags(v);
        return tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => <Tag key={tag} color="blue">{tag.slice(0, 8)}</Tag>)}
          </div>
        ) : tc("state.noDescription");
      } },
    { title: t("addressBook.field.note"), dataIndex: "note",
      render: (v: string | undefined) => v || tc("state.noDescription") },
    {
      title: tc("table.actions"),
      width: editable ? 160 : 80,
      render: (_v: unknown, row: AbPeer) => (
        <div className="flex items-center gap-1">
          {editable ? (
            <PermissionButton size="small" theme="borderless" code="address_books.edit"
              onClick={() => {
                setEditPeer(row);
                setEditorOpen(true);
              }}>
              {t("addressBook.action.edit")}
            </PermissionButton>
          ) : null}
          {editable ? (
            <Popconfirm title={t("addressBook.peerDeleteConfirm")} onConfirm={() =>
              removePeer.mutate(row.guid, {
                onSuccess: () => Notification.success({ content: t("addressBook.peerDeleted") }),
                onError,
              })}>
              <PermissionButton size="small" theme="borderless" type="danger" code="address_books.edit">
                {t("addressBook.action.delete")}
              </PermissionButton>
            </Popconfirm>
          ) : null}
        </div>
      ),
    },
  ];

  /** 联系人提交（新增 / 编辑；tags 全量替换）。 */
  const submitPeer = (values: Record<string, unknown>): void => {
    const body = {
      id: String(values.device_id ?? editPeer?.device_id ?? ""),
      alias: typeof values.alias === "string" && values.alias.length > 0 ? values.alias : undefined,
      note: typeof values.note === "string" && values.note.length > 0 ? values.note : undefined,
      password: typeof values.password === "string" && values.password.length > 0 ? values.password : undefined,
    };
    upsertPeer.mutate(
      editPeer !== null
        ? { mode: "update", abGuid, peerGuid: editPeer.guid, body }
        : { mode: "add", abGuid, body },
      {
        onSuccess: () => {
          Notification.success({ content: editPeer !== null ? t("addressBook.peerUpdated") : t("addressBook.peerAdded") });
          setEditorOpen(false);
          setEditPeer(null);
        },
        onError,
      },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBar placeholder={t("addressBook.filter.deviceId")} onSearch={setKeyword} value={state.keyword} />
        {editable ? (
          <>
            <PermissionButton theme="solid" code="address_books.edit"
              onClick={() => {
                setEditPeer(null);
                setEditorOpen(true);
              }}>
              {t("addressBook.action.addPeer")}
            </PermissionButton>
            <PermissionButton theme="borderless" code="address_books.edit" onClick={() => setTagsOpen(true)}>
              {t("addressBook.action.tags")}
            </PermissionButton>
            <PermissionButton theme="borderless" code="address_books.share" onClick={() => setRulesOpen(true)}>
              {t("addressBook.action.rules")}
            </PermissionButton>
          </>
        ) : null}
      </div>

      <DataTable<AbPeer>
        columns={columns}
        dataSource={peersQuery.data?.data ?? []}
        loading={peersQuery.isLoading}
        rowKey="guid"
      />

      <FormModal
        visible={editorOpen}
        title={editPeer !== null ? t("addressBook.peerEditTitle") : t("addressBook.peerAddTitle")}
        onClose={() => {
          setEditorOpen(false);
          setEditPeer(null);
        }}
        onSubmit={submitPeer}
        initialValues={
          editPeer !== null
            ? { device_id: editPeer.device_id, alias: editPeer.alias ?? "", note: editPeer.note ?? "" }
            : undefined
        }
      >
        <Form.Input field="device_id" label={t("addressBook.field.deviceId")}
          rules={[{ required: true }]} disabled={editPeer !== null} maxLength={64} />
        <Form.Input field="alias" label={t("addressBook.field.alias")} maxLength={64} />
        {editPeer === null ? (
          <Form.Input field="password" label={t("addressBook.field.password")} mode="password"
            placeholder={t("addressBook.field.passwordPlaceholder")} />
        ) : null}
        <Form.TextArea field="note" label={t("addressBook.field.note")} rows={2} maxCount={255} />
      </FormModal>

      {tagsOpen ? <TagsModal abGuid={abGuid} onClose={() => setTagsOpen(false)} /> : null}
      {rulesOpen ? <RulesModal abGuid={abGuid} onClose={() => setRulesOpen(false)} /> : null}
    </div>
  );
}

/** 标签管理弹窗（新增 / 改名 / 换色 / 删除）。 */
function TagsModal({ abGuid, onClose }: { abGuid: string; onClose: () => void }) {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const tagsQuery = useAbTags(abGuid);
  const tagMutation = useAbTagMutation();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(0xff0000ff);
  // 行内改名态：editingGuid 非空时该行显示输入框
  const [editingGuid, setEditingGuid] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const onError = (err: unknown): void => {
    Notification.error({ content: toDisplayMessage(err), duration: 4 });
  };

  const run = (vars: Parameters<ReturnType<typeof useAbTagMutation>["mutate"]>[0]): void => {
    tagMutation.mutate(vars, {
      onSuccess: () => {
        if (vars.op === "add") setNewName("");
        Notification.success({ content: tc("action.save") });
      },
      onError,
    });
  };

  return (
    <Modal title={t("addressBook.tagsTitle")} visible width={560} onCancel={onClose} footer={null}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Input value={newName} onChange={(v) => setNewName(v)}
            placeholder={t("addressBook.field.tagName")} style={{ width: 200 }}
            aria-label={t("addressBook.field.tagName")} />
          <Select value={newColor} style={{ width: 120 }} onChange={(v) => setNewColor(Number(v))}
            optionList={[
              { value: 0xff0000ff, label: t("addressBook.color.red") },
              { value: 0xff00a2ff, label: t("addressBook.color.blue") },
              { value: 0xff00b578, label: t("addressBook.color.green") },
              { value: 0xfff7ba1e, label: t("addressBook.color.yellow") },
            ]}
          />
          <PermissionButton theme="solid" size="small" code="address_books.edit"
            disabled={newName.trim().length === 0}
            onClick={() => run({ op: "add", abGuid, body: { name: newName.trim(), color: newColor } })}>
            {t("addressBook.action.addTag")}
          </PermissionButton>
        </div>
        <DataTable<AbTag>
          columns={[
            { title: t("addressBook.field.tagName"), dataIndex: "name" },
            { title: t("addressBook.field.tagColor"), dataIndex: "color",
              render: (v: number) => <Tag color={colorName(v)}>{t("addressBook.color." + colorName(v))}</Tag> },
            {
              title: tc("table.actions"),
              width: 160,
              render: (_v: unknown, row: AbTag) => (
                <div className="flex items-center gap-1">
                  {editingGuid === row.guid ? (
                    <span className="flex items-center gap-1">
                      <Input value={editingName} onChange={(v) => setEditingName(v)} style={{ width: 110 }} size="small" />
                      <Button size="small" theme="borderless" disabled={editingName.trim().length === 0}
                        onClick={() => run({ op: "rename", tagGuid: row.guid, name: editingName.trim() })}>
                        {tc("action.save")}
                      </Button>
                    </span>
                  ) : (
                    <PermissionButton size="small" theme="borderless" code="address_books.edit"
                      onClick={() => {
                        setEditingGuid(row.guid);
                        setEditingName(row.name);
                      }}>
                      {t("addressBook.action.renameTag")}
                    </PermissionButton>
                  )}
                  <Popconfirm title={t("addressBook.tagDeleteConfirm")} onConfirm={() =>
                    run({ op: "delete", tagGuid: row.guid })}>
                    <PermissionButton size="small" theme="borderless" type="danger" code="address_books.edit">
                      {t("addressBook.action.deleteTag")}
                    </PermissionButton>
                  </Popconfirm>
                </div>
              ),
            },
          ]}
          dataSource={tagsQuery.data?.data ?? []}
          loading={tagsQuery.isLoading}
          rowKey="guid"
        />
      </div>
    </Modal>
  );
}

/** ARGB uint → Semi Tag 颜色名（展示层近似映射）。 */
function colorName(argb: number): "red" | "blue" | "green" | "yellow" {
  const b = argb & 0xff;
  const g = (argb >> 8) & 0xff;
  const r = (argb >> 16) & 0xff;
  if (r >= g && r >= b) return "red";
  if (g >= r && g >= b) return "green";
  if (b >= r && b >= g) return "blue";
  return "yellow";
}

/** 规则管理弹窗（列出该地址簿规则 + 新建 + 删除）。 */
function RulesModal({ abGuid, onClose }: { abGuid: string; onClose: () => void }) {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const rulesQuery = useAbRules();
  const ruleMutation = useAbRuleMutation();

  const onError = (err: unknown): void => {
    Notification.error({ content: toDisplayMessage(err), duration: 4 });
  };

  const mine = (rulesQuery.data?.data ?? []).filter((r) => r.address_book_guid === abGuid);

  return (
    <Modal title={t("addressBook.rulesTitle")} visible width={640} onCancel={onClose} footer={null}>
      <div className="flex flex-col gap-3">
        <RuleCreateForm abGuid={abGuid} />
        <DataTable<AbRule>
          columns={[
            { title: t("addressBook.field.target"), dataIndex: "target_user_id",
              render: (_v: unknown, row: AbRule) =>
                row.target_user_id ? `${t("addressBook.target.user")}: ${row.target_user_id.slice(0, 8)}…`
                  : row.target_group_id ? `${t("addressBook.target.group")}: ${row.target_group_id.slice(0, 8)}…`
                    : t("addressBook.target.everyone") },
            { title: t("addressBook.field.ruleLevel"), dataIndex: "rule",
              render: (v: AbRule["rule"]) => {
                const item = RULE_LEVELS.find((l) => l.value === v);
                return <Tag color={RULE_COLOR[v]}>{item ? t(item.key) : String(v)}</Tag>;
              } },
            {
              title: tc("table.actions"),
              width: 100,
              render: (_v: unknown, row: AbRule) => (
                <Popconfirm title={t("addressBook.ruleDeleteConfirm")} onConfirm={() =>
                  ruleMutation.mutate({ op: "delete", guids: [row.guid] }, {
                    onSuccess: () => Notification.success({ content: t("addressBook.ruleDeleted") }),
                    onError,
                  })}>
                  <PermissionButton size="small" theme="borderless" type="danger" code="address_books.share">
                    {t("addressBook.action.deleteRule")}
                  </PermissionButton>
                </Popconfirm>
              ),
            },
          ]}
          dataSource={mine}
          loading={rulesQuery.isLoading}
          rowKey="guid"
        />
      </div>
    </Modal>
  );
}

/** 规则新建表单（user/group 互斥；everyone = 双空）。 */
function RuleCreateForm({ abGuid }: { abGuid: string }) {
  const { t } = useTranslation("pages");
  const ruleMutation = useAbRuleMutation();
  const [target, setTarget] = useState<"everyone" | "user" | "group">("everyone");
  const [targetId, setTargetId] = useState("");
  const [level, setLevel] = useState<AbRule["rule"]>(1);

  const onError = (err: unknown): void => {
    Notification.error({ content: toDisplayMessage(err), duration: 4 });
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <Select value={target} style={{ width: 140 }} aria-label={t("addressBook.field.target")}
          onChange={(v) => setTarget(v as typeof target)}
          optionList={[
            { value: "everyone", label: t("addressBook.target.everyone") },
            { value: "user", label: t("addressBook.target.user") },
            { value: "group", label: t("addressBook.target.group") },
          ]}
        />
        {target !== "everyone" ? (
          <Input value={targetId} onChange={(v) => setTargetId(v)}
            placeholder={t("addressBook.field.targetGuid")} style={{ width: 240 }}
            aria-label={t("addressBook.field.targetGuid")} />
        ) : null}
        <Select value={level} style={{ width: 140 }} aria-label={t("addressBook.field.ruleLevel")}
          onChange={(v) => setLevel(Number(v) as AbRule["rule"])}
          optionList={RULE_LEVELS.map((l) => ({ value: l.value, label: t(l.key) }))}
        />
      </div>
      <PermissionButton theme="solid" size="small" code="address_books.share"
        disabled={target !== "everyone" && targetId.trim().length === 0}
        onClick={() =>
          ruleMutation.mutate(
            {
              op: "create",
              body: {
                guid: abGuid,
                user: target === "user" ? targetId.trim() : undefined,
                group: target === "group" ? targetId.trim() : undefined,
                rule: level,
              },
            },
            {
              onSuccess: () => {
                setTargetId("");
                Notification.success({ content: t("addressBook.ruleCreated") });
              },
              onError,
            },
          )
        }>
        {t("addressBook.action.addRule")}
      </PermissionButton>
    </div>
  );
}
