import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Space, Typography } from "@douyinfe/semi-ui";
import { IconMoon, IconSun } from "@douyinfe/semi-icons";
import { ThemeProvider } from "@/components/ThemeProvider";

const { Title, Text } = Typography;

interface Health {
  status: string;
  version: string;
  time: string;
}

/**
 * M4 应用外壳（T01 骨架）。
 *
 * T01 阶段职责：
 * 1. 验证 Tailwind v4 + Semi CSS Layer 接入（下方 `px-8` / `bg-transparent` 即实测用例）；
 * 2. 验证 react19-adapter 生效（`Modal.confirm()` / `Toast` 可点击验证）；
 * 3. 验证暗色切换与 Tailwind `dark:` 变体；
 * 4. 保留 M0 的后端健康检查卡片作为占位内容。
 *
 * 结构预留：`ThemeProvider` + `QueryClientProvider`（在 main.tsx）已就位，
 * T03 将在此处接入路由（BrowserRouter / Routes）与布局（AppLayout）。
 *
 * ⚠️ 权限红线：前端只做 UI 显隐/禁用，后端每次实时查库为准，前端不是安全边界。
 */
export default function App() {
  const [dark, setDark] = useState(false);

  const health = useQuery({
    queryKey: ["healthz"],
    queryFn: async (): Promise<Health> => {
      const res = await fetch("/api/healthz");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: false,
  });

  return (
    <ThemeProvider dark={dark} onChange={setDark}>
      <div className="min-h-full bg-semi-color-bg-1 p-6">
        <header className="mb-6 flex items-center justify-between">
          <Title heading={3} className="m-0">
            RustDesk Panel
          </Title>
          <Space>
            {/* 实测用例 1：Tailwind 原子类 px-8 应能覆盖 Semi Button 的 padding（依赖 @layer semi 包裹） */}
            <Button onClick={() => health.refetch()} className="px-8">
              Tailwind 原子类（px-8）
            </Button>
            {/* 实测用例 2：bg-transparent 应能覆盖 Semi light 态 Button 的默认背景（依赖 layer 顺序） */}
            <Button className="bg-transparent">bg-transparent</Button>
            <Button icon={<IconMoon />} onClick={() => setDark(true)} aria-label="切换为暗色">
              暗色
            </Button>
            <Button icon={<IconSun />} onClick={() => setDark(false)} aria-label="切换为亮色">
              亮色
            </Button>
          </Space>
        </header>

        <Card title="系统状态" className="max-w-[560px]">
          <Space vertical align="start" spacing={12}>
            <Text>React 19 + Vite + Semi Design + TailwindCSS v4 已就绪。</Text>
            <Text className="dark:text-semi-color-warning">
              本行使用 dark: 变体（暗色下变为 warning 色），用于验证 @custom-variant 生效。
            </Text>
            <Space>
              <Button onClick={() => health.refetch()} loading={health.isFetching}>
                检查后端健康
              </Button>
              {health.data && (
                <Text type="success">
                  {health.data.status} · v{health.data.version}
                </Text>
              )}
              {health.isError && (
                <Text type="danger">后端不可达（请将 dev proxy 指向 rustdesk-panel-api）</Text>
              )}
            </Space>
          </Space>
        </Card>
      </div>
    </ThemeProvider>
  );
}
