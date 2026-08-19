/**
 * 错误边界（M4-T03）。
 *
 * 捕获子树渲染期异常，避免整页白屏；提供「重试」与「返回首页」。
 * 组件选型：`Card` + `Typography` + `Button`（已查证）。
 *
 * ★ DEF-02：文案全部走 i18n。本组件为**类组件**（React 目前仅类组件可实现
 *   componentDidCatch），无法使用 `useTranslation` Hook，故用
 *   `<I18nextProvider>` + 渲染提取组件（函数组件）的方式绑定 i18n，
 *   避免在类组件上新增类型字段带来的初始化顺序问题。
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Card, Typography } from "@douyinfe/semi-ui";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { getErrorText } from "@/utils/errorText";

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

/** 降级 UI 属性。 */
interface ErrorFallbackProps {
  /** 捕获到的错误 */
  error: Error;
  /** 重试回调（清空边界错误） */
  reset: () => void;
}

/**
 * 降级 UI（函数组件，走 `useTranslation`）。
 *
 * @param props 错误与重试回调
 * @returns 错误卡片
 */
function ErrorFallback({ error, reset }: ErrorFallbackProps) {
  const { t } = useTranslation("common");
  return (
    <Card className="m-4">
      <div className="flex flex-col items-start gap-3">
        <Typography.Title heading={5} className="m-0">
          {t("errors.renderFailedTitle")}
        </Typography.Title>
        <Typography.Text type="danger">{getErrorText(error)}</Typography.Text>
        <div className="flex gap-2">
          <Button onClick={reset}>{t("action.retry")}</Button>
          <Button onClick={() => window.location.assign("/")}>{t("action.backHome")}</Button>
        </div>
      </div>
    </Card>
  );
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

    // 显式绑定 i18n 实例，使类组件子树也能拿到 t()（语言切换仍可响应）
    return (
      <I18nextProvider i18n={i18n}>
        <ErrorFallback error={error} reset={this.reset} />
      </I18nextProvider>
    );
  }
}
