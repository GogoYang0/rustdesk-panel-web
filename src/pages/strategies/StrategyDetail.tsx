/**
 * 策略详情页（M4-T05；v0.1.2 充实交互，路由门槛 strategies.view）。
 *
 * 职责：
 * - 基础信息（name/note）编辑（strategies.edit，全局码）；
 * - config_options 键值对编辑（strategies.edit）：独立受控状态 +
 *   Semi `Input`（修复 v0.1.1 在 Form 外使用 Form.Input 的失效问题）；
 * - 已分配目标：GET /api/strategies/{guid}/assignments?target_type=device|user|device_group，
 *   DataTable 展示 + 多选解绑；
 * - 添加目标：候选来自 GET /api/strategies/target-candidates?target_type=device|user
 *   （契约无 name 过滤参数，关键字在客户端过滤；device_group 目标复用
 *   GET /api/device-groups 列表），分配 / 解绑 POST /assign、/unassign
 *   （部分成功 AssignResult 展示）。
 *
 * ★ device_group scope 二次判定（§4.4）：目标类型为 device_group 时，
 *   分配 / 解绑按钮以**所选目标组 guid** 为上下文判定
 *   `can("strategies.assign", { deviceGroupGuid: targetGuid })`；
 *   device / user 目标为无组上下文的全局码判定。
 */
import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Form,
  Input,
  Modal,
  Notification,
  Select,
  Table,
  Tabs,
  TabPane,
  Typography,
} from "@douyinfe/semi-ui";
import type { ColumnProps } from "@douyinfe/semi-ui/lib/es/table";
import { IconArrowLeft, IconDelete, IconPlus } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { PermissionButton } from "@/components/PermissionButton";
import {
  useAssignStrategy,
  useStrategy,
  useStrategyAssignments,
  useUnassignStrategy,
  useUpdateStrategy,
} from "@/api/hooks/strategies";
import { useDeviceGroups } from "@/api/hooks/deviceGroups";
import { listStrategyTargetCandidates } from "@/api/endpoints/strategies";
import { toDisplayMessage } from "@/api/error";
import type { AssignTargetType } from "@/api/endpoints/strategies";
import { usePermission } from "@/hooks/usePermission";

/** 目标类型选项。 */
const TARGET_TYPES: readonly AssignTargetType[] = ["device", "user", "device_group"];

/** 候选拉取条数（契约 pageSize 上限 100；一次拉全后客户端过滤）。 */
const CANDIDATE_PAGE_SIZE = 100;

/** 键值对行形态（config_options 编辑态）。 */
interface OptionRow {
  key: string;
  value: string;
}

/** 已分配目标行（oneOf 三分支归一后的统一形态）。 */
interface AssignmentRow extends Record<string, unknown> {
  /** 目标 guid（device 为 uuid） */
  guid: string;
  /** 展示名（device 无 name → id） */
  name: string;
}

/** 候选目标行（添加目标弹窗 DataTable 行）。 */
interface CandidateRow extends Record<string, unknown> {
  guid: string;
  name: string;
  /** 用户目标的保护账号标记（其余目标恒 false） */
  isProtected: boolean;
}

/**
 * 策略详情页。
 *
 * @returns 信息 + 配置项编辑 + 已分配目标管理
 */
export function StrategyDetail() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const { guid = "" } = useParams<{ guid: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { can } = usePermission();

  // 预选目标类型：URL ?assign=<groupGuid>（设备组详情页跳转语义）→ device_group
  const initialTargetType: AssignTargetType = searchParams.get("assign") !== null ? "device_group" : "device";
  const [targetType, setTargetType] = useState<AssignTargetType>(initialTargetType);
  const [selectedTargets, setSelectedTargets] = useState<readonly string[]>([]);
  const [optionRows, setOptionRows] = useState<readonly OptionRow[] | null>(null);

  // 基础信息编辑草稿（null = 未改动，回显详情值）
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);

  // 添加目标弹窗
  const [pickOpen, setPickOpen] = useState(false);
  const [candidateKeyword, setCandidateKeyword] = useState("");
  const [pickedTargets, setPickedTargets] = useState<readonly string[]>([]);

  const strategy = useStrategy(guid);
  const assignments = useStrategyAssignments(guid, { target_type: targetType, current: 1, pageSize: 100 });
  const assignStrategy = useAssignStrategy(guid);
  const unassignStrategy = useUnassignStrategy(guid);
  const updateStrategy = useUpdateStrategy();

  // device_group 候选复用设备组列表；device/user 候选经 target-candidates（弹窗开启时拉取）
  const groupCandidates = useDeviceGroups(
    { current: 1, pageSize: CANDIDATE_PAGE_SIZE },
    targetType === "device_group" && pickOpen,
  );
  const remoteCandidates = useQuery({
    queryKey: ["strategies", "target-candidates", targetType],
    queryFn: () =>
      listStrategyTargetCandidates({
        target_type: targetType === "device_group" ? "device" : targetType,
        current: 1,
        pageSize: CANDIDATE_PAGE_SIZE,
      }),
    enabled: pickOpen && (targetType === "device" || targetType === "user"),
    placeholderData: (prev) => prev,
  });

  const onError = (err: unknown): void => {
    Notification.error({ content: toDisplayMessage(err), duration: 4 });
  };

  // ★ 已分配目标行统一形态（oneOf 三分支防御性归一）
  const assignmentRows: AssignmentRow[] = useMemo(() => {
    const data = assignments.data?.data ?? [];
    return data.map((row) => {
      if ("uuid" in row && "id" in row) {
        return { guid: (row as { uuid: string }).uuid, name: (row as { id: string }).id };
      }
      const r = row as { guid: string; name: string };
      return { guid: r.guid, name: r.name };
    });
  }, [assignments.data]);

  // ★ 候选行归一 + 客户端关键字过滤（契约无 name 查询参数）
  const candidateRows: CandidateRow[] = useMemo(() => {
    const raw: CandidateRow[] =
      targetType === "device_group"
        ? (groupCandidates.data?.data ?? []).map((g) => ({
            guid: g.guid,
            name: g.name,
            isProtected: false,
          }))
        : ((remoteCandidates.data?.data ?? []) as Array<{
            guid?: string;
            uuid?: string;
            id?: string;
            name?: string;
            is_protected?: boolean;
          }>)
            .map((row) => ({
              guid: row.guid ?? row.uuid ?? "",
              name: row.name ?? row.id ?? "",
              isProtected: row.is_protected === true,
            }))
            .filter((row) => row.guid.length > 0);
    const kw = candidateKeyword.trim().toLowerCase();
    if (kw.length === 0) return raw;
    return raw.filter(
      (row) => row.name.toLowerCase().includes(kw) || row.guid.toLowerCase().includes(kw),
    );
  }, [targetType, groupCandidates.data, remoteCandidates.data, candidateKeyword]);

  const candidatesLoading =
    targetType === "device_group" ? groupCandidates.isLoading : remoteCandidates.isLoading;

  /** 当前目标行是否允许分配/解绑（★ 组目标走二次判定）。 */
  const targetAllowed = (targetGuid: string): boolean =>
    targetType === "device_group"
      ? can("strategies.assign", { deviceGroupGuid: targetGuid })
      : can("strategies.assign");

  const strategyData = strategy.data;

  if (strategy.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <span className="semi-spin semi-spin-block semi-spin-large" />
      </div>
    );
  }
  if (strategyData === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader titleKey="menu:strategies" />
        <Typography.Text type="warning">{t("strategies.empty")}</Typography.Text>
      </div>
    );
  }

  // 编辑态兜底：未改动时回显详情快照（optionRows=null → 详情 config_options）
  const options: readonly OptionRow[] =
    optionRows ??
    Object.entries(strategyData.config_options ?? {}).map(([key, value]) => ({ key, value }));
  const nameValue = nameDraft ?? strategyData.name;
  const noteValue = noteDraft ?? strategyData.note;

  const setOption = (index: number, patch: Partial<OptionRow>): void => {
    setOptionRows(options.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const assignmentColumns: ColumnProps<AssignmentRow>[] = [
    { title: t("strategies.field.name"), dataIndex: "name" },
    { title: "GUID", dataIndex: "guid", width: 280 },
    {
      title: tc("table.actions"),
      width: 120,
      render: (_v: unknown, row: AssignmentRow) =>
        targetAllowed(row.guid) ? (
          <Button
            size="small"
            theme="borderless"
            type="danger"
            onClick={() =>
              unassignStrategy.mutate(
                { target_type: targetType, target_guids: [row.guid] },
                {
                  onSuccess: (r) =>
                    Notification.success({
                      content: t("strategies.partialResult", {
                        success: r.success.length,
                        errors: r.errors.length,
                      }),
                    }),
                  onError,
                },
              )
            }
          >
            {t("strategies.action.unassign")}
          </Button>
        ) : null,
    },
  ];

  const candidateColumns: ColumnProps<CandidateRow>[] = [
    { title: t("strategies.field.name"), dataIndex: "name" },
    { title: "GUID", dataIndex: "guid", width: 260 },
    {
      title: t("strategies.field.isProtected"),
      dataIndex: "isProtected",
      width: 110,
      render: (v: boolean) =>
        v ? <Typography.Text type="warning">{t("strategies.field.isProtected")}</Typography.Text> : "—",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("strategies.detailTitle")}
        description={strategyData.name}
        extra={
          <Button icon={<IconArrowLeft />} theme="borderless" onClick={() => navigate("/strategies")}>
            {t("strategies.backToList")}
          </Button>
        }
      />

      <Tabs type="line">
        <TabPane tab={t("strategies.tab.info")} itemKey="info">
          <div className="flex max-w-[720px] flex-col gap-4">
            <Form labelPosition="left" labelWidth={90} className="flex flex-col gap-1">
              <Form.Input
                field="name"
                label={t("strategies.field.name")}
                initValue={nameValue}
                onChange={(v) => setNameDraft(String(v ?? ""))}
              />
              <Form.TextArea
                field="note"
                label={t("strategies.field.note")}
                initValue={noteValue}
                rows={2}
                maxCount={255}
                onChange={(v) => setNoteDraft(String(v ?? ""))}
              />
            </Form>

            <div className="flex flex-col gap-2">
              <Typography.Text strong>{t("strategies.field.configOptions")}</Typography.Text>
              <Typography.Text type="tertiary" size="small">
                {t("strategies.optionsHint")}
              </Typography.Text>
              {options.length === 0 ? (
                <Typography.Text type="tertiary">{tc("state.noDescription")}</Typography.Text>
              ) : (
                options.map((row, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={row.key}
                      placeholder={t("strategies.field.key")}
                      style={{ width: 220 }}
                      aria-label={t("strategies.field.key")}
                      onChange={(v) => setOption(index, { key: v })}
                    />
                    <Input
                      value={row.value}
                      placeholder={t("strategies.field.value")}
                      style={{ width: 320 }}
                      aria-label={t("strategies.field.value")}
                      onChange={(v) => setOption(index, { value: v })}
                    />
                    <Button
                      icon={<IconDelete />}
                      theme="borderless"
                      type="danger"
                      aria-label={t("strategies.action.removeOption")}
                      onClick={() => setOptionRows(options.filter((_, i) => i !== index))}
                    />
                  </div>
                ))
              )}
              <div className="flex items-center gap-2">
                <Button
                  icon={<IconPlus />}
                  theme="borderless"
                  onClick={() => setOptionRows([...options, { key: "", value: "" }])}
                >
                  {t("strategies.action.addOption")}
                </Button>
                <PermissionButton
                  theme="solid"
                  code="strategies.edit"
                  loading={updateStrategy.isPending}
                  onClick={() =>
                    updateStrategy.mutate(
                      {
                        guid,
                        body: {
                          name: nameValue,
                          note: noteValue,
                          config_options: Object.fromEntries(
                            options
                              .filter((r) => r.key.trim().length > 0)
                              .map((r) => [r.key.trim(), r.value]),
                          ),
                        },
                      },
                      {
                        onSuccess: () => {
                          Notification.success({ content: t("strategies.updated") });
                          setOptionRows(null);
                          setNameDraft(null);
                          setNoteDraft(null);
                        },
                        onError,
                      },
                    )
                  }
                >
                  {tc("action.save")}
                </PermissionButton>
              </div>
            </div>
          </div>
        </TabPane>

        <TabPane tab={t("strategies.assignments")} itemKey="assignments">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={targetType}
                style={{ width: 150 }}
                aria-label={t("strategies.targetType")}
                onChange={(v) => {
                  setTargetType(v as AssignTargetType);
                  setSelectedTargets([]);
                  setPickedTargets([]);
                  setCandidateKeyword("");
                }}
                optionList={TARGET_TYPES.map((v) => ({ value: v, label: t(`strategies.target.${v}`) }))}
              />
              <PermissionButton
                icon={<IconPlus />}
                theme="solid"
                code="strategies.assign"
                deviceGroupGuid={targetType === "device_group" ? (selectedTargets[0] ?? null) : undefined}
                onClick={() => {
                  setPickedTargets([]);
                  setCandidateKeyword("");
                  setPickOpen(true);
                }}
              >
                {t("strategies.action.pickTarget")}
              </PermissionButton>
              {selectedTargets.length > 0 ? (
                <Button
                  type="danger"
                  theme="light"
                  disabled={!targetAllowed(selectedTargets[0]!)}
                  onClick={() =>
                    unassignStrategy.mutate(
                      { target_type: targetType, target_guids: [...selectedTargets] },
                      {
                        onSuccess: (r) => {
                          Notification.success({
                            content: t("strategies.partialResult", {
                              success: r.success.length,
                              errors: r.errors.length,
                            }),
                          });
                          setSelectedTargets([]);
                        },
                        onError,
                      },
                    )
                  }
                >
                  {t("strategies.action.unassign")}
                </Button>
              ) : null}
            </div>

            <Table<AssignmentRow>
              columns={assignmentColumns}
              dataSource={assignmentRows}
              loading={assignments.isLoading}
              rowKey="guid"
              pagination={false}
              empty={t("strategies.assignmentsEmpty")}
              rowSelection={{
                selectedRowKeys: [...selectedTargets],
                onChange: (keys) => setSelectedTargets(keys as string[]),
              }}
            />
          </div>
        </TabPane>
      </Tabs>

      {/* 添加目标弹窗：候选列表 + 多选 + 分配（部分成功展示） */}
      <Modal
        title={t("strategies.pickTargetTitle")}
        visible={pickOpen}
        width={640}
        okText={t("strategies.action.assign")}
        cancelText={tc("action.cancel")}
        confirmLoading={assignStrategy.isPending}
        okButtonProps={{ disabled: pickedTargets.length === 0 }}
        onOk={() =>
          assignStrategy.mutate(
            { target_type: targetType, target_guids: [...pickedTargets] },
            {
              onSuccess: (r) => {
                Notification.success({
                  content: t("strategies.partialResult", {
                    success: r.success.length,
                    errors: r.errors.length,
                  }),
                });
                setPickOpen(false);
                setSelectedTargets([]);
              },
              onError,
            },
          )
        }
        onCancel={() => setPickOpen(false)}
        afterClose={() => setPickedTargets([])}
        destroyOnClose
        aria-label={t("strategies.pickTargetTitle")}
      >
        <div className="flex flex-col gap-3">
          <Input
            value={candidateKeyword}
            placeholder={t("strategies.field.searchTarget")}
            showClear
            onChange={(v) => setCandidateKeyword(v)}
          />
          <Table<CandidateRow>
            columns={candidateColumns}
            dataSource={candidateRows}
            loading={candidatesLoading}
            rowKey="guid"
            pagination={false}
            empty={tc("state.empty")}
            rowSelection={{
              selectedRowKeys: [...pickedTargets],
              onChange: (keys) => setPickedTargets(keys as string[]),
            }}
          />
        </div>
      </Modal>
    </div>
  );
}
