/**
 * Vitest 全局测试环境准备。
 *
 * 1. `@testing-library/jest-dom` matcher 扩展（`toBeInTheDocument` 等）；
 * 2. jsdom 的 `HTMLCanvasElement#getContext` 默认返回 `null`，而 Semi Design
 *    依赖的 `lottie-web`（`Spin` / `Empty` 等组件内部）在模块加载期即调用
 *    `canvas.getContext("2d").fillStyle`，会抛
 *    `TypeError: Cannot set properties of null (setting 'fillStyle')` 导致整个
 *    测试文件无法收集。此处提供最小 2D context 替身。
 */
import "@testing-library/jest-dom/vitest";

/** 最小 Canvas 2D context 替身（仅满足 lottie-web 的探测调用）。 */
const canvasContextStub = {
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 1,
  globalAlpha: 1,
  font: "",
  textAlign: "left",
  textBaseline: "alphabetic",
  globalCompositeOperation: "source-over",
  lineCap: "butt",
  lineJoin: "miter",
  miterLimit: 10,
  shadowBlur: 0,
  shadowColor: "",
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  fillRect: () => undefined,
  clearRect: () => undefined,
  strokeRect: () => undefined,
  beginPath: () => undefined,
  closePath: () => undefined,
  moveTo: () => undefined,
  lineTo: () => undefined,
  bezierCurveTo: () => undefined,
  quadraticCurveTo: () => undefined,
  arc: () => undefined,
  rect: () => undefined,
  fill: () => undefined,
  stroke: () => undefined,
  clip: () => undefined,
  save: () => undefined,
  restore: () => undefined,
  scale: () => undefined,
  rotate: () => undefined,
  translate: () => undefined,
  transform: () => undefined,
  setTransform: () => undefined,
  drawImage: () => undefined,
  createLinearGradient: () => ({ addColorStop: () => undefined }),
  createRadialGradient: () => ({ addColorStop: () => undefined }),
  createPattern: () => null,
  measureText: () => ({ width: 0 }),
  fillText: () => undefined,
  strokeText: () => undefined,
  getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
  putImageData: () => undefined,
  createImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
} as unknown as CanvasRenderingContext2D;

if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = function getContextStub(): CanvasRenderingContext2D {
    return canvasContextStub;
  } as unknown as HTMLCanvasElement["getContext"];
}
