import { describe, expect, it } from "vitest";
import { pdfToViewport, viewportToPdf } from "../utils/coords";

describe("coords", () => {
  it("converts between viewport and pdf coordinates", () => {
    const viewport = { width: 800, height: 1000, rotation: 0, scale: 2 };
    const point = { x: 120, y: 480 };
    const pdfPoint = viewportToPdf(point, viewport);
    const back = pdfToViewport(pdfPoint, viewport);
    expect(Math.round(back.x)).toBe(point.x);
    expect(Math.round(back.y)).toBe(point.y);
  });
});
