import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Space, Typography } from "@douyinfe/semi-ui";
import { IconMoon, IconRefresh, IconSun } from "@douyinfe/semi-icons";

const { Title, Text } = Typography;

interface Health {
  status: string;
  version: string;
  time: string;
}

/**
 * M0 应用外壳：验证 React 19 + Semi Design 渲染链路、
 * react19-adapter 注入、暗色主题切换与后端健康检查连通性。
 * 完整页面（仪表盘/设备/通讯录/审计/设置等）按里程碑交付。
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

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.body.setAttribute("theme-mode", next ? "dark" : "light");
  };

  return (
    <div style={{ minHeight: "100vh", padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <Title heading={3}>RustDesk Panel</Title>
        <Button
          icon={dark ? <IconSun /> : <IconMoon />}
          onClick={toggleTheme}
          aria-label="切换主题"
        >
          {dark ? "亮色" : "暗色"}
        </Button>
      </div>

      <Card title="系统状态" style={{ maxWidth: 560 }}>
        <Space vertical align="start" spacing={12}>
          <Text>React 19 + Vite + Semi Design 已就绪。</Text>
          <Space>
            <Button
              icon={<IconRefresh />}
              loading={health.isFetching}
              onClick={() => health.refetch()}
            >
              检查后端健康
            </Button>
            {health.data && (
              <Text type="success">
                {health.data.status} · v{health.data.version}
              </Text>
            )}
            {health.isError && (
              <Text type="danger">后端不可达（将 dev proxy 指向 rustdesk-panel-api）</Text>
            )}
          </Space>
        </Space>
      </Card>
    </div>
  );
}
