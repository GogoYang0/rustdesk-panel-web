/**
 * 设备「分配给用户」弹窗（GAP2 设计 §2.5）。
 *
 * 载入用户目录（useAdminUsers，name 过滤，需 users.view——devices.assign
 * 的 requires 链保证持码者可见）；含「解除归属」选项。转移 = 再次 assign。
 */
import { useEffect, useState } from "react";
import { Form, Modal, Notification, Spin, Typography } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { toDisplayMessage } from "@/api/error";
import { useAdminUsers } from "@/api/hooks/users";
import { useAssignDevice } from "@/api/hooks/mydevices";
import type { DeviceView } from "@/api/endpoints/devices";

/**
 * 分配用户弹窗属性。
 */
export interface AssignUserModalProps {
  /** 目标设备（null = 关闭） */
  device: DeviceView | null;
  /** 关闭回调 */
  onClose: () => void;
}

/**
 * 设备分配用户弹窗。
 *
 * @param props device + onClose
 * @returns 用户选择弹窗（分配 / 解除归属）
 */
export function AssignUserModal({ device, onClose }: AssignUserModalProps) {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const assign = useAssignDevice();

  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<string | undefined>(undefined);

  const usersQuery = useAdminUsers(
    { current: 1, pageSize: 50, name: keyword.length > 0 ? keyword : undefined },
    device !== null,
  );

  // 打开时回显当前属主。
  useEffect(() => {
    if (device !== null) {
      setSelected(device.userGuid ?? "");
      setKeyword("");
    }
  }, [device]);

  if (device === null) return null;

  const doAssign = (): void => {
    assign.mutate(
      {
        guid: device.guid,
        // 空选择 = 解绑（契约：userGuid 空/缺省 = 置 NULL）。
        body:
          selected === undefined || selected === "" ? { userGuid: null } : { userGuid: selected },
      },
      {
        onSuccess: () => {
          Notification.success({
            content:
              selected === undefined || selected === ""
                ? t("devices.assign.unassigned")
                : t("devices.assign.assigned"),
          });
          onClose();
        },
        onError: (err) => Notification.error({ content: toDisplayMessage(err), duration: 4 }),
      },
    );
  };

  const userOptions = (usersQuery.data?.data ?? []).map((u) => ({
    value: u.guid,
    label: u.username + (u.display_name ? ` (${u.display_name})` : ""),
  }));

  return (
    <Modal
      title={t("devices.assign.title", { id: device.id })}
      visible
      onOk={doAssign}
      onCancel={onClose}
      okText={tc("action.confirm")}
      cancelText={tc("action.cancel")}
      okButtonProps={{ loading: assign.isPending }}
      width={480}
    >
      {usersQuery.isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Spin size="small" />
        </div>
      ) : (
        <Form
          initValues={{ userGuid: device.userGuid ?? undefined }}
          labelPosition="left"
          labelWidth={110}
        >
          <Form.Select
            field="userGuid"
            label={t("devices.assign.userLabel")}
            placeholder={t("devices.assign.userPlaceholder")}
            filter
            showClear
            style={{ width: "100%" }}
            optionList={userOptions}
            onSearch={(v) => setKeyword(String(v))}
            onChange={(v) => setSelected(v === undefined ? "" : String(v))}
            emptyContent={t("devices.assign.noUsers")}
          />
          <Typography.Text type="tertiary" className="text-xs">
            {t("devices.assign.hint")}
          </Typography.Text>
        </Form>
      )}
    </Modal>
  );
}
