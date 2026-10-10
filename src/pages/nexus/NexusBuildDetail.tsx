/**
 * Nexus 构建详情（M4-T06；产物清单 + blob 下载）。
 *
 * 独立组件（Modal 形态），由 NexusPage 从构建行「查看产物」唤起；
 * 下载走 `GET /api/nexus/builds/{uuid}/files/{filename}` 文件流。
 */
import { Button, Modal, Notification } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import type { ColumnProps } from "@douyinfe/semi-ui/lib/es/table";
import { DataTable } from "@/components/DataTable";
import { toDisplayMessage } from "@/api/error";
import { downloadNexusBuildFile } from "@/api/endpoints/nexus";
import { useNexusBuildFiles } from "@/api/hooks/nexus";

/** NexusBuildDetail 属性。 */
export interface NexusBuildDetailProps {
  /** 构建 uuid */
  uuid: string;
  /** 是否可见 */
  visible: boolean;
  /** 关闭回调 */
  onClose: () => void;
}

/**
 * 构建详情弹窗。
 *
 * @param props uuid / 可见性 / 关闭回调
 * @returns 产物清单表格 + 下载操作
 */
export function NexusBuildDetail({ uuid, visible, onClose }: NexusBuildDetailProps) {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const filesQuery = useNexusBuildFiles(uuid, visible);

  /** blob 下载（objectURL + a[download]；文件名由后端白名单剥离 CR/LF/引号）。 */
  const download = (filename: string): void => {
    downloadNexusBuildFile(uuid, filename)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((err: unknown) => Notification.error({ content: toDisplayMessage(err), duration: 4 }));
  };

  const columns: ColumnProps<{ filename: string; size?: number }>[] = [
    { title: t("nexus.field.filename"), dataIndex: "filename" },
    { title: t("nexus.field.size"), dataIndex: "size", width: 120,
      render: (v: number | undefined) => (v !== undefined ? `${(v / 1024 / 1024).toFixed(2)} MB` : "—") },
    {
      title: tc("table.actions"),
      width: 100,
      render: (_v: unknown, row: { filename: string }) => (
        <Button size="small" theme="borderless" onClick={() => download(row.filename)}>
          {t("nexus.action.download")}
        </Button>
      ),
    },
  ];

  return (
    <Modal title={t("nexus.filesTitle", { uuid: uuid.slice(0, 8) })} visible={visible}
      onCancel={onClose} footer={null} width={560}>
      <DataTable<{ filename: string; size?: number }>
        columns={columns}
        dataSource={filesQuery.data?.files ?? []}
        loading={filesQuery.isLoading}
        rowKey="filename"
        empty={tc("state.empty")}
      />
    </Modal>
  );
}
