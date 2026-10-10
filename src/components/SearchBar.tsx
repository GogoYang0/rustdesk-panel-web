/**
 * 统一搜索栏（M4-T05，T06 起全域复用）。
 *
 * 组件选型：Semi `Input`（已查证）。回车或点击搜索按钮回抛关键字；
 * 调用方（`useTableQuery.setKeyword`）负责置回第 1 页。
 */
import { useState } from "react";
import { Input } from "@douyinfe/semi-ui";
import { IconSearch } from "@douyinfe/semi-icons";

/** SearchBar 属性。 */
export interface SearchBarProps {
  /** 占位文案 */
  placeholder: string;
  /** 受控初值（外部状态回显） */
  value?: string;
  /** 搜索提交（回车 / 点击放大镜） */
  onSearch: (keyword: string) => void;
  /** 宽度（默认 280） */
  width?: number;
  /** 附加筛选项（Select 等，渲染在搜索框右侧） */
  children?: React.ReactNode;
}

/**
 * 统一搜索栏。
 *
 * @param props 占位 / 搜索回调 / 附加筛选
 * @returns 关键字搜索 + 可选筛选器
 */
export function SearchBar({ placeholder, value, onSearch, width = 280, children }: SearchBarProps) {
  const [inner, setInner] = useState(value ?? "");
  // 受控值优先（外部 reset 时同步清空输入框）
  const keyword = value !== undefined ? value : inner;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        prefix={<IconSearch />}
        value={keyword}
        placeholder={placeholder}
        showClear
        style={{ width }}
        aria-label={placeholder}
        onChange={(v) => {
          setInner(v);
          // 清空即重查（体验：一键回到全量列表）
          if (v.length === 0) onSearch("");
        }}
        onEnterPress={() => onSearch(keyword)}
      />
      {children}
    </div>
  );
}
