import { describe, expect, it } from "vitest";
import { deserializeOps, serializeOps } from "../utils/serialize";
import { Op } from "../types/pdf";

describe("serialize ops", () => {
  it("round trips ops", () => {
    const ops: Op[] = [
      {
        id: "1",
        pageIndex: 0,
        type: "text",
        x: 10,
        y: 20,
        width: 100,
        height: 20,
        rotation: 0,
        color: "#ffffff",
        text: "Hello",
        fontSize: 12,
        align: "left"
      }
    ];
    const serialized = serializeOps(ops);
    const restored = deserializeOps(serialized);
    expect(restored[0].type).toBe("text");
    if (restored[0].type === "text") {
      expect(restored[0].text).toBe("Hello");
    }
  });
});
