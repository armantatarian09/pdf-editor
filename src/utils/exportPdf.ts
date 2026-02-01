import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { Op, PageMeta } from "../types/pdf";

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.substring(0, 2), 16) / 255;
  const g = parseInt(normalized.substring(2, 4), 16) / 255;
  const b = parseInt(normalized.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
};

export const exportPdf = async (
  bytes: Uint8Array,
  opsByPage: Record<number, Op[]>,
  pagesMeta: PageMeta[]
) => {
  const sourceDoc = await PDFDocument.load(bytes);
  const outputDoc = await PDFDocument.create();
  const copiedPages = await outputDoc.copyPages(
    sourceDoc,
    pagesMeta.map((page) => page.sourceIndex)
  );
  copiedPages.forEach((page) => outputDoc.addPage(page));

  const font = await outputDoc.embedFont(StandardFonts.Helvetica);

  outputDoc.getPages().forEach((page, index) => {
    const rotation = pagesMeta[index]?.rotation ?? 0;
    if (rotation !== 0) {
      page.setRotation({ type: "degrees", angle: rotation });
    }
    const ops = opsByPage[index] ?? [];
    ops.forEach((op) => {
      const color = hexToRgb(op.color);
      switch (op.type) {
        case "text":
          page.drawText(op.text, {
            x: op.x,
            y: op.y,
            size: op.fontSize,
            font,
            color
          });
          break;
        case "ink":
          for (let i = 1; i < op.points.length; i += 1) {
            const start = op.points[i - 1];
            const end = op.points[i];
            page.drawLine({
              start: { x: start.x, y: start.y },
              end: { x: end.x, y: end.y },
              thickness: op.strokeWidth,
              color
            });
          }
          break;
        case "highlight":
        case "redaction":
          page.drawRectangle({
            x: op.x,
            y: op.y,
            width: op.width,
            height: op.height,
            color: op.type === "highlight" ? color : rgb(0, 0, 0),
            opacity: op.opacity ?? 0.3
          });
          break;
        case "underline":
          page.drawLine({
            start: { x: op.x, y: op.y + op.height },
            end: { x: op.x + op.width, y: op.y + op.height },
            thickness: op.strokeWidth,
            color
          });
          break;
        case "shape":
          if (op.shape === "rect") {
            page.drawRectangle({
              x: op.x,
              y: op.y,
              width: op.width,
              height: op.height,
              borderColor: color,
              borderWidth: op.strokeWidth,
              color: op.fillColor ? hexToRgb(op.fillColor) : undefined
            });
          }
          if (op.shape === "line" || op.shape === "arrow") {
            page.drawLine({
              start: { x: op.x, y: op.y },
              end: { x: op.x + op.width, y: op.y + op.height },
              thickness: op.strokeWidth,
              color
            });
          }
          break;
        case "note":
          page.drawRectangle({
            x: op.x,
            y: op.y,
            width: 18,
            height: 18,
            color
          });
          break;
        default:
          break;
      }
    });
  });

  for (const [pageIndex, ops] of Object.entries(opsByPage)) {
    const page = outputDoc.getPages()[Number(pageIndex)];
    for (const op of ops) {
      if (op.type === "image" || op.type === "signature") {
        const data = op.src.split(",")[1];
        const isPng = op.src.startsWith("data:image/png");
        const image = isPng
          ? await outputDoc.embedPng(data)
          : await outputDoc.embedJpg(data);
        page.drawImage(image, {
          x: op.x,
          y: op.y,
          width: op.width,
          height: op.height
        });
      }
    }
  }

  return outputDoc.save();
};
