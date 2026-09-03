/**
 * Nexus 构建扩展键解析单测（M4-T06）。
 */
import { describe, expect, it } from "vitest";
import { parseCustomExtra } from "@/pages/nexus/NexusPage";

describe("parseCustomExtra", () => {
  it("解析每行 key=value", () => {
    expect(parseCustomExtra("app-name=MyDesk\ntheme=dark")).toEqual({
      "app-name": "MyDesk",
      "theme": "dark",
    });
  });

  it("value 中包含等号时保留首个等号后全部内容", () => {
    expect(parseCustomExtra("k=a=b=c")).toEqual({ k: "a=b=c" });
  });

  it("忽略无等号 / 空键 / 空值的行", () => {
    expect(parseCustomExtra("noequal\n=x\nk=\n\n ok=yes ")).toEqual({ ok: "yes" });
  });

  it("支持 \\r\\n 换行", () => {
    expect(parseCustomExtra("a=1\r\nb=2")).toEqual({ a: "1", b: "2" });
  });

  it("空串返回空对象", () => {
    expect(parseCustomExtra("")).toEqual({});
  });
});
