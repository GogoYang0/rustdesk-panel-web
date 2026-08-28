/**
 * 统一数据表格（M4-T05，T06 起全域复用）。
 *
 * 组件选型：Semi `Table`（已查证）。分页契约保真（OQ-9）：
 * - 受控分页状态由调用方持有（推荐 `useTableQuery`，UI 形态 `page`/`pageSize`）；
 * - 出网映射**唯一**发生在 `toPageParams`（本组件不产出请求参数，只回抛 UI 事件）。
 *
 * 样式分工：Semi 管表格交互与主题令牌；Tailwind 管外层留白（`flex flex-col`）。
 */
import { Table } from "@douyinfe/semi-ui";
import type { ColumnProps, RowKey, TableProps } from "@douyinfe/semi-ui/lib/es/table";
import { useTranslation } from "react-i18next";

/** DataTable 属性。 */
export interface DataTableProps<RecordType extends Record<string, unknown> = Record<string, unknown>> {
  /** 列定义（Semi ColumnProps） */
  columns: ColumnProps<RecordType>[];
  /** 数据源 */
  dataSource: RecordType[] | undefined;
  /** 行键取值函数或字段名 */
  rowKey: string | ((record: RecordType) => string);
  /** 加载态 */
  loading?: boolean;
  /** 总条数（受控分页） */
  total?: number;
  /** 当前页（1 起，UI 形态） */
  page?: number;
  /** 每页条数 */
  pageSize?: number;
  /** 页码变化（UI 形态，1 起） */
  onPageChange?: (page: number) => void;
  /** 每页条数变化（回第 1 页由调用方 Hook 处理） */
  onPageSizeChange?: (pageSize: number) => void;
  /** 行选择配置（批量操作场景） */
  rowSelection?: TableProps<RecordType>["rowSelection"];
  /** 空态描述（默认取 common:state.empty） */
  empty?: React.ReactNode;
  /** 追加透传给 Semi Table 的属性 */
  tableProps?: Omit<TableProps<RecordType>, "columns" | "dataSource" | "rowKey" | "pagination">;
}

/**
 * 统一数据表格。
 *
 * @param props 列 / 数据 / 受控分页 / 行选择
 * @returns Semi Table 封装
 */
export function DataTable<RecordType extends Record<string, unknown> = Record<string, unknown>>({
  columns,
  dataSource,
  rowKey,
  loading = false,
  total = 0,
  page = 1,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  rowSelection,
  empty,
  tableProps,
}: DataTableProps<RecordType>) {
  const { t } = useTranslation("common");

  return (
    <Table<RecordType>
      columns={columns}
      dataSource={dataSource ?? []}
      rowKey={rowKey as RowKey<RecordType>}
      loading={loading}
      empty={empty ?? t("state.empty")}
      rowSelection={rowSelection}
      pagination={
        total > 0
          ? {
              currentPage: page,
              pageSize,
              total,
              onPageChange: (p: number) => onPageChange?.(p),
              onPageSizeChange: (s: number) => onPageSizeChange?.(s),
              showSizeChanger: true,
              pageSizeOpts: [10, 20, 50, 100],
              formatPageText: () => "",
            }
          : false
      }
      {...tableProps}
    />
  );
}

export type { ColumnProps };
