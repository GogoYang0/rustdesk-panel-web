/**
 * 轮询 Hook（M5-T05 交付物，M4-T04 仪表盘先行消费）。
 *
 * ★ React 19 `useEffectEvent` 落地（设计 §1.4 / §6.2.4）：
 *   回调 `callback` 通过 `useEffectEvent` 包装，使定时器**始终调用最新版本**，
 *   而**不进入 effect 依赖数组**（避免依赖膨胀 + 反复重建定时器）。
 *
 * 行为：
 * - 页面不可见（`document.hidden`）时**暂停**（省流量、避免无意义请求）；
 * - 窗口重新可见时立即触发一次，随后恢复周期；
 * - `enabled=false` 时不启动定时器。
 *
 * ⚠️ 降级：若运行时不支持 `useEffectEvent`（React < 19.2），可退回「`useRef` 保存最新回调」；
 *    本环境实测 React 19.3 已提供该 API，故直接使用（OQ-5 批复「实测优先」）。
 */
import { useEffect, useRef, useState } from "react";
import { useEffectEvent } from "react";

/** `usePolling` 选项。 */
export interface UsePollingOptions {
  /** 轮询间隔（毫秒，默认 30s） */
  interval?: number;
  /** 是否启用（默认 true） */
  enabled?: boolean;
  /** 是否在页面隐藏时暂停（默认 true） */
  pauseWhenHidden?: boolean;
  /** 是否挂载后立即触发一次（默认 false） */
  immediate?: boolean;
}

/**
 * 周期性执行回调。
 *
 * @param callback 每次 tick 执行的回调（通过 `useEffectEvent` 保持最新）
 * @param options 间隔 / 启用开关 / 隐藏暂停 / 立即执行
 */
export function usePolling(callback: () => void, options: UsePollingOptions = {}): void {
  const { interval = 30_000, enabled = true, pauseWhenHidden = true, immediate = false } = options;
  const [visible, setVisible] = useState<boolean>(() =>
    typeof document === "undefined" ? true : !document.hidden,
  );

  // ★ useEffectEvent：回调不参与依赖数组，定时器不会被反复重建
  const onTick = useEffectEvent(() => {
    callback();
  });

  // 监听页面可见性
  useEffect(() => {
    if (!pauseWhenHidden || typeof document === "undefined") return;
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onChange);
    return () => {
      document.removeEventListener("visibilitychange", onChange);
    };
  }, [pauseWhenHidden]);

  const active = enabled && (!pauseWhenHidden || visible);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      firedRef.current = false;
      return;
    }
    if (immediate && !firedRef.current) {
      firedRef.current = true;
      onTick();
    }
    const timer = window.setInterval(() => onTick(), interval);
    return () => {
      window.clearInterval(timer);
    };
  }, [active, interval, immediate, onTick]);
}
