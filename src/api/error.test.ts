/**
 * 单测：统一错误包络处理（M4-T02）。
 *
 * ⚠️ 必须真实断言 message 的**三种形态**：字符串 / 字符串数组 / 业务对象。
 */
import { describe, expect, it } from "vitest";
import { ApiError, isApiError, normalizeMessage, toDisplayMessage, unwrap } from "@/api/error";

/** 构造一个最小可用的 Response（仅需 status）。 */
function fakeResponse(status: number): Response {
  return new Response(null, { status });
}

describe("normalizeMessage —— message 三形态归一化", () => {
  it("形态①：字符串 message 原样返回", () => {
    expect(normalizeMessage({ statusCode: 400, message: "Username already exists" }, 400)).toBe(
      "Username already exists",
    );
  });

  it("形态②：字符串数组 message 以「；」连接", () => {
    expect(normalizeMessage({ statusCode: 400, message: ["name should not be empty", "email must be an email"] }, 400)).toBe(
      "name should not be empty；email must be an email",
    );
  });

  it("形态②：数组含非字符串项时，仅连接字符串项", () => {
    expect(normalizeMessage({ statusCode: 400, message: ["第一项", 123, null, "第二项"] }, 400)).toBe("第一项；第二项");
  });

  it("形态③：业务对象 message 序列化为 JSON 文本", () => {
    const obj = { field: "username", reason: "duplicate" };
    expect(normalizeMessage({ statusCode: 409, message: obj }, 409)).toBe(JSON.stringify(obj));
  });

  it("形态③：业务对象不可序列化（循环引用）时回退 error 字段", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(normalizeMessage({ statusCode: 500, message: circular, error: "Internal Error" }, 500)).toBe("Internal Error");
  });

  it("空数组 message 回退 error 字段", () => {
    expect(normalizeMessage({ statusCode: 400, message: [], error: "Bad Request" }, 400)).toBe("Bad Request");
  });

  it("message 缺失时回退 error 字段", () => {
    expect(normalizeMessage({ statusCode: 404, error: "Not Found" }, 404)).toBe("Not Found");
  });

  it("message 与 error 均缺失时回退状态码兜底文案", () => {
    expect(normalizeMessage({ statusCode: 403 }, 403)).toContain("403");
  });

  it("payload 为 undefined / null 时回退状态码兜底文案", () => {
    expect(normalizeMessage(undefined, 500)).toContain("500");
    expect(normalizeMessage(null, 401)).toContain("401");
  });
});

describe("ApiError —— 三形态 display", () => {
  it("字符串形态：Error.message 与 display 均为原文本", () => {
    const err = new ApiError(400, { statusCode: 400, message: "Invalid credentials" }, fakeResponse(400));
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Invalid credentials");
    expect(err.display).toBe("Invalid credentials");
    expect(err.statusCode).toBe(400);
    expect(err.name).toBe("ApiError");
  });

  it("数组形态：display 以「；」连接", () => {
    const err = new ApiError(400, { statusCode: 400, message: ["字段 A 必填", "字段 B 非法"] }, fakeResponse(400));
    expect(err.display).toBe("字段 A 必填；字段 B 非法");
  });

  it("对象形态：display 为 JSON 文本", () => {
    const payload = { statusCode: 409, message: { code: "DUPLICATE" }, error: "Conflict" };
    const err = new ApiError(409, payload, fakeResponse(409));
    expect(err.display).toBe(JSON.stringify({ code: "DUPLICATE" }));
  });

  it("保留原始 payload 与 raw Response 引用", () => {
    const res = fakeResponse(403);
    const err = new ApiError(403, { statusCode: 403, message: "Access denied", error: "Forbidden" }, res);
    expect(err.raw).toBe(res);
    expect(err.payload.error).toBe("Forbidden");
  });
});

describe("unwrap —— openapi-fetch 结果解包", () => {
  it("成功：返回 data", () => {
    const data = { ok: true };
    expect(unwrap({ data, error: undefined, response: fakeResponse(200) })).toBe(data);
  });

  it("失败：error 为包络对象时抛 ApiError 且 display 正确", () => {
    const response = fakeResponse(400);
    let caught: unknown;
    try {
      unwrap({ data: undefined, error: { statusCode: 400, message: "Bad input" }, response });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).display).toBe("Bad input");
    expect((caught as ApiError).statusCode).toBe(400);
  });

  it("失败：error 为非对象（字符串）时仍抛 ApiError", () => {
    const response = fakeResponse(500);
    let caught: unknown;
    try {
      unwrap({ data: undefined, error: "boom", response });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).display).toBe("boom");
  });
});

describe("工具函数", () => {
  it("isApiError 正确识别", () => {
    expect(isApiError(new ApiError(400, { message: "x" }, fakeResponse(400)))).toBe(true);
    expect(isApiError(new Error("x"))).toBe(false);
    expect(isApiError("x")).toBe(false);
  });

  it("toDisplayMessage 处理 ApiError / Error / 字符串 / 未知", () => {
    expect(toDisplayMessage(new ApiError(400, { message: "A" }, fakeResponse(400)))).toBe("A");
    expect(toDisplayMessage(new Error("B"))).toBe("B");
    expect(toDisplayMessage("C")).toBe("C");
    expect(toDisplayMessage(42)).toBe("未知错误");
  });
});
