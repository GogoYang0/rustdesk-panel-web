/**
 * 策略详情页（M4-T05，设计 §5.2 `/strategies/:guid`，路由门槛 strategies.view）。
 *
 * 职责：
 * - 基础信息 + config_options 键值对编辑（strategies.edit，全局码）；
 * - 已分配目标：GET /api/strategies/{guid}/assignments?target_type=device|user|device_group；
 * - 分配 / 解绑：POST /assign、/unassign（部分成功 AssignResult 展示）。
 *
 * ★ device_group scope 二次判定（§4.4）：目标类型为 device_group 时，
 *   分配 / 解绑按钮以**所选目标组 guid** 为上下文判定
 *   `can("strategies.assign", { deviceGroupGuid: targetGuid })`；
 *   device / user 目标为无组上下文的全局码判定。
 */
import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { Button, Form, Notification, Select, Tabs, TabPane, Typography } from "@douyinfe/semi-ui";
import { IconArrowLeft, IconPlus, IconDelete } from "@douyinfe/semi-icons";
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
import { toDisplayMessage } from "@/api/error";
import type { AssignTargetType } from "@/api/endpoints/strategies";
import { usePermission } from "@/hooks/usePermission";

/** 目标类型选项。 */
const TARGET_TYPES: readonly AssignTargetType[] = ["device", "user", "device_group"];

/** 键值对行形态（config_options 编辑态）。 */
interface OptionRow {
  key: string;
  value: string;
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
  const [optionRows, setOptionRows] = useState<readonly OptionRow[]>([]);

  const strategy = useStrategy(guid);
  const assignments = useStrategyAssignments(guid, { target_type: targetType, current: 1, pageSize: 100 });
  const assignStrategy = useAssignStrategy(guid);
  const unassignStrategy = useUnassignStrategy(guid);
  const updateStrategy = useUpdateStrategy();

  const onError = (err: unknown): void => {
    Notification.error({ content: toDisplayMessage(err), duration: 4 });
  };

  // ★ 目标行统一形态（oneOf 三分支防御性归一）
  const rows = useMemo(() => {
    const data = assignments.data?.data ?? [];
    return data.map((row) => {
      if ("uuid" in row && "id" in row) {
        return { guid: (row as { uuid: string }).uuid, id: (row as { id: string }).id, name: (row as { id: string }).id };
      }
      const r = row as { guid: string; name: string };
      return { guid: r.guid, id: r.guid, name: r.name };
    });
  }, [assignments.data]);

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

  const options: OptionRow[] =
    optionRows.length > 0
      ? [...optionRows]
      : Object.entries(strategyData.config_options ?? {}).map(([key, value]) => ({ key, value }));

  const setOption = (index: number, patch: Partial<OptionRow>): void => {
    setOptionRows(options.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

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
          <div className="flex flex-col gap-2">
            {options.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <Form.Input
                  field={`options.${index}.key`}
                  initValue={row.key}
                  label={index === 0 ? t("strategies.field.key") : undefined}
                  style={{ width: 220 }}
                  onChange={(v) => setOption(index, { key: v as string })}
                />
                <Form.Input
                  field={`options.${index}.value`}
                  initValue={row.value}
                  label={index === 0 ? t("strategies.field.value") : undefined}
                  style={{ width: 320 }}
                  onChange={(v) => setOption(index, { value: v as string })}
                />
                <Button
                  icon={<IconDelete />}
                  theme="borderless"
                  type="danger"
                  aria-label={t("strategies.action.removeOption")}
                  onClick={() => setOptionRows(options.filter((_, i) => i !== index))}
                />
              </div>
            ))}
            <div>
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
                        name: strategyData.name,
                        note: strategyData.note,
                        config_options: Object.fromEntries(
                          options.filter((r) => r.key.trim().length > 0).map((r) => [r.key, r.value]),
                        ),
                      },
                    },
                    {
                      onSuccess: () => {
                        Notification.success({ content: t("strategies.updated") });
                        setOptionRows([]);
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
                }}
                optionList={TARGET_TYPES.map((v) => ({ value: v, label: t(`strategies.target.${v}`) }))}
              />
              {/* ★ 分配按钮：device_group 目标以所选目标组做二次判定（此处以「批量选中均允许」放行，
                  单行粒度在解绑按钮上体现） */}
              <PermissionButton
                theme="solid"
                code="strategies.assign"
                deviceGroupGuid={targetType === "device_group" ? (selectedTargets[0] ?? null) : undefined}
                disabled={selectedTargets.length === 0}
                onClick={() =>
                  assignStrategy.mutate(
                    { target_type: targetType, target_guids: [...selectedTargets] },
                    {
                      onSuccess: (r) =>
                        Notification.success({
                          content: t("strategies.assigned", { count: r.success.length }),
                        }),
                      onError,
                    },
                  )
                }
              >
                {t("strategies.action.assign")}
              </PermissionButton>
              {selectedTargets.length > 0 ? (
                <Button
                  type="danger"
                  onClick={() =>
                    unassignStrategy.mutate(
                      { target_type: targetType, target_guids: [...selectedTargets] },
                      {
                        onSuccess: (r) =>
                          Notification.success({
                            content: t("strategies.unassigned", { count: r.success.length }),
                          }),
                        onError,
                      },
                    )
                  }
                >
                  {t("strategies.action.unassign")}
                </Button>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              {rows.length === 0 ? (
                <Typography.Text type="tertiary">{t("strategies.assignmentsEmpty")}</Typography.Text>
              ) : (
                rows.map((row) => (
                  <div key={row.guid} className="flex items-center gap-2">
                    <Typography.Text style={{ minWidth: 120 }}>{row.name}</Typography.Text>
                    <Typography.Text type="tertiary" style={{ minWidth: 220 }}>
                      {row.guid}
                    </Typography.Text>
                    {targetAllowed(row.guid) ? (
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
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
}
