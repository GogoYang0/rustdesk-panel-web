/**
 * 设备详情页（M4-T05，设计 §5.2 `/devices/:guid`，路由门槛 devices.view）。
 *
 * 数据源：`GET /api/peers?id={guid}`（路由表 listPeers 语义，契约无单设备 GET）。
 * 行为（全部按设备所属组二次判定，无组保守隐藏）：
 * - 备注编辑（devices.edit）；
 * - 断开连接（devices.disconnect）；
 * - 启/停（devices.status）。
 */
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Banner, Button, Descriptions, Form, Notification, Spin } from "@douyinfe/semi-ui";
import { IconArrowLeft } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import { FormModal } from "@/components/FormModal";
import { PageHeader } from "@/components/PageHeader";
import { PermissionButton } from "@/components/PermissionButton";
import { StatusTag } from "@/components/StatusTag";
import type { DeviceView } from "@/api/endpoints/devices";
import {
  useDevice,
  useDisconnectDevice,
  useUpdateDevice,
  useUpdateDeviceStatus,
} from "@/api/hooks/devices";
import { toDisplayMessage } from "@/api/error";

/**
 * 设备详情页。
 *
 * @returns 设备字段描述列表 + 组内权限按钮
 */
export function DeviceDetail() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const { guid = "" } = useParams<{ guid: string }>();
  const navigate = useNavigate();

  const query = useDevice(guid);
  const row: DeviceView | null = query.data ?? null;
  // ★ 二次判定上下文：所属组 guid（可为 null，原样透传；hook 对 null 保守返回 false）
  const groupGuid: string | null = row?.deviceGroupGuid ?? null;

  const disconnect = useDisconnectDevice();
  const updateDevice = useUpdateDevice();
  const updateStatus = useUpdateDeviceStatus();
  const [noteOpen, setNoteOpen] = useState(false);

  const onError = (err: unknown): void => {
    Notification.error({ content: toDisplayMessage(err), duration: 4 });
  };

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spin size="large" />
      </div>
    );
  }
  if (row === null) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader titleKey="menu:devices" />
        <Banner type="warning" description={t("devices.empty")} closeIcon={null} />
      </div>
    );
  }

  const desc = (value: string | null | undefined): string =>
    value === null || value === undefined || value.length === 0 ? tc("state.noDescription") : value;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("devices.detailTitle")}
        description={row.info.device_name}
        extra={
          <Button icon={<IconArrowLeft />} theme="borderless" onClick={() => navigate("/devices")}>
            {t("devices.backToList")}
          </Button>
        }
      />

      <Descriptions
        align="left"
        data={[
          { key: t("devices.field.id"), value: row.id },
          { key: t("devices.field.deviceName"), value: desc(row.info.device_name) },
          { key: t("devices.field.username"), value: desc(row.info.username) },
          { key: t("devices.field.os"), value: desc(row.info.os) },
          { key: t("devices.field.version"), value: desc(row.info.version) },
          { key: t("devices.field.cpu"), value: desc(row.info.cpu) },
          { key: t("devices.field.memory"), value: desc(row.info.memory) },
          { key: t("devices.field.user"), value: desc(row.user_name) },
          { key: t("devices.field.group"), value: desc(row.device_group_name) },
          { key: t("devices.field.strategy"), value: desc(row.strategy_name) },
          {
            key: t("devices.field.online"),
            value: <StatusTag status={row.is_online ? "online" : "offline"} />,
          },
          {
            key: t("devices.field.status"),
            value: <StatusTag status={row.status === 1 ? "enabled" : "disabled"} />,
          },
          { key: t("devices.field.lastOnline"), value: desc(row.last_online) },
          { key: t("devices.field.note"), value: desc(row.note) },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        {/* ★ 二次判定：设备所属组上下文（无组 → 保守隐藏） */}
        <PermissionButton
          code="devices.edit"
          deviceGroupGuid={groupGuid}
          onClick={() => setNoteOpen(true)}
        >
          {t("devices.action.edit")}
        </PermissionButton>
        <PermissionButton
          code="devices.disconnect"
          deviceGroupGuid={groupGuid}
          onClick={() =>
            disconnect.mutate(row.guid, {
              onSuccess: () => Notification.success({ content: t("devices.disconnected") }),
              onError,
            })
          }
        >
          {t("devices.action.disconnect")}
        </PermissionButton>
        <PermissionButton
          code="devices.status"
          deviceGroupGuid={groupGuid}
          onClick={() =>
            updateStatus.mutate(
              { guids: [row.guid], status: row.status === 1 ? "disabled" : "enabled" },
              {
                onSuccess: () => Notification.success({ content: t("devices.statusUpdated") }),
                onError,
              },
            )
          }
        >
          {row.status === 1 ? t("devices.action.disable") : t("devices.action.enable")}
        </PermissionButton>
      </div>

      <FormModal<{ note: string }>
        visible={noteOpen}
        title={t("devices.editTitle")}
        initialValues={{ note: row.note }}
        submitting={updateDevice.isPending}
        onClose={() => setNoteOpen(false)}
        onSubmit={(values) =>
          updateDevice.mutate(
            { guid: row.guid, body: { note: values.note } },
            {
              onSuccess: () => {
                Notification.success({ content: t("devices.updated") });
                setNoteOpen(false);
                void query.refetch();
              },
              onError,
            },
          )
        }
      >
        <Form.Input
          field="note"
          label={t("devices.note")}
          placeholder={t("devices.notePlaceholder")}
        />
      </FormModal>
    </div>
  );
}
