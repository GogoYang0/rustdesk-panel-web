/**
 * 错误边界（M4-T03）。
 *
 * 捕获子树渲染期异常，避免整页白屏；提供「重试」与「返回首页」。
 * 组件选型：`Card` + `Typography` + `Button`（已查证）。
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Card, Typography } from "@douyinfe/semi-ui";

/** `ErrorBoundary` 属性。 */
export interface ErrorBoundaryProps {
  /** 子节点 */
  children: ReactNode;
  /** 自定义降级 UI 渲染函数 */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** 出错回调（用于日志上报） */
  onError?: (error: Error, info: ErrorInfo) => void;
}

/** `ErrorBoundary` 状态。 */
export interface ErrorBoundaryState {
  /** 捕获到的错误 */
  error: Error | null;
}

/**
 * 错误边界组件（类组件：React 目前仅类组件可实现 componentDidCatch）。
 *
 * 注：错误边界不捕获事件处理、异步、SSR 错误，仅捕获渲染/生命周期/构造期错误。
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  /** 初始状态。 */
  public state: ErrorBoundaryState = { error: null };

  /**
   * 捕获错误并写入 state。
   *
   * @param error 抛出的错误
   * @returns 新的 state
   */
  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  /**
   * 记录错误信息。
   *
   * @param error 抛出的错误
   * @param info React 错误信息
   */
  public componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  /** 重置边界（重试）。 */
  private readonly reset = (): void => {
    this.setState({ error: null });
  };

  /** 渲染。 */
  public render(): ReactNode {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (error === null) {
      return children;
    }

    if (fallback) {
      return fallback(error, this.reset);
    }

    return (
      <Card className="m-4">
        <div className="flex flex-col items-start gap-3">
          <Typography.Title heading={5} className="m-0">
            页面渲染出错
          </Typography.Title>
          <Typography.Text type="danger">{error.message}</Typography.Text>
          <div className="flex gap-2">
            <Button onClick={this.reset}>重试</Button>
            <Button onClick={() => window.location.assign("/")}>返回首页</Button>
          </div>
        </div>
      </Card>
    );
  }
}
