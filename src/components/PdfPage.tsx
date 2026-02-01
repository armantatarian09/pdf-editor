import { useEffect, useMemo, useRef, useState } from "react";
import { getDocument } from "../utils/pdfjs";
import { useProjectStore } from "../store/useProjectStore";
import { clamp, pdfToViewport, viewportToPdf } from "../utils/coords";
import { InkPoint, Op, ShapeKind } from "../types/pdf";
import SignatureModal from "./SignatureModal";

const createBaseOp = (pageIndex: number, type: Op["type"]) => ({
  id: crypto.randomUUID(),
  pageIndex,
  type,
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  rotation: 0,
  color: "#38bdf8",
  opacity: 0.4
});

type PdfPageProps = {
  pdfDoc: Awaited<ReturnType<typeof getDocument>>;
  pageIndex: number;
  sourceIndex: number;
  rotation: number;
  zoom: number;
  isActive: boolean;
  onActivate: () => void;
};

const PdfPage = ({
  pdfDoc,
  pageIndex,
  sourceIndex,
  rotation,
  zoom,
  isActive,
  onActivate
}: PdfPageProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewport, setViewport] = useState<{ width: number; height: number; scale: number } | null>(
    null
  );
  const [drawingInk, setDrawingInk] = useState<InkPoint[]>([]);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [imageAnchor, setImageAnchor] = useState<{ x: number; y: number } | null>(null);
  const [signatureAnchor, setSignatureAnchor] = useState<{ x: number; y: number } | null>(null);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [draggingOp, setDraggingOp] = useState<{ id: string; offsetX: number; offsetY: number } | null>(
    null
  );
  const imageInputRef = useRef<HTMLInputElement>(null);
  const tool = useProjectStore((state) => state.tool);
  const addOp = useProjectStore((state) => state.addOp);
  const updateOp = useProjectStore((state) => state.updateOp);
  const removeOp = useProjectStore((state) => state.removeOp);
  const selectOp = useProjectStore((state) => state.selectOp);
  const selectedOpId = useProjectStore((state) => state.selectedOpId);
  const ops = useProjectStore((state) => state.present.opsByPage[pageIndex] ?? []);

  useEffect(() => {
    const renderPage = async () => {
      const page = await pdfDoc.getPage(sourceIndex + 1);
      const nextViewport = page.getViewport({ scale: zoom, rotation });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = nextViewport.width;
      canvas.height = nextViewport.height;
      const context = canvas.getContext("2d");
      if (!context) return;
      await page.render({ canvasContext: context, viewport: nextViewport }).promise;
      setViewport({
        width: nextViewport.width,
        height: nextViewport.height,
        scale: nextViewport.scale
      });
    };
    renderPage();
  }, [pageIndex, pdfDoc, rotation, sourceIndex, zoom]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!viewport) return;
    onActivate();
    const rect = event.currentTarget.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const pdfPoint = viewportToPdf(point, {
      width: viewport.width,
      height: viewport.height,
      rotation: 0,
      scale: viewport.scale
    });
    if (tool === "select") {
      const hit = ops.find((opItem) =>
        pdfPoint.x >= opItem.x &&
        pdfPoint.x <= opItem.x + opItem.width &&
        pdfPoint.y >= opItem.y &&
        pdfPoint.y <= opItem.y + opItem.height
      );
      if (hit) {
        selectOp(hit.id);
        setDraggingOp({ id: hit.id, offsetX: pdfPoint.x - hit.x, offsetY: pdfPoint.y - hit.y });
      } else {
        selectOp(null);
      }
      return;
    }
    if (tool === "text") {
      const text = window.prompt("Text");
      if (!text) return;
      addOp(pageIndex, {
        ...createBaseOp(pageIndex, "text"),
        x: pdfPoint.x,
        y: pdfPoint.y,
        width: 120,
        height: 20,
        text,
        fontSize: 16,
        align: "left",
        color: "#f8fafc",
        opacity: 1
      });
      return;
    }
    if (tool === "note") {
      const message = window.prompt("Note");
      if (!message) return;
      addOp(pageIndex, {
        ...createBaseOp(pageIndex, "note"),
        x: pdfPoint.x,
        y: pdfPoint.y,
        width: 18,
        height: 18,
        message,
        color: "#facc15",
        opacity: 1
      });
      return;
    }
    if (tool === "image") {
      setImageAnchor(pdfPoint);
      imageInputRef.current?.click();
      return;
    }
    if (tool === "signature") {
      setSignatureAnchor(pdfPoint);
      setSignatureOpen(true);
      return;
    }
    if (tool === "ink") {
      setDrawingInk([pdfPoint]);
      return;
    }
    if (tool === "highlight" || tool === "underline" || tool === "shape" || tool === "redaction") {
      setDragStart(pdfPoint);
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!viewport) return;
    if (tool === "ink" && drawingInk.length > 0) {
      const rect = event.currentTarget.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const pdfPoint = viewportToPdf(point, {
        width: viewport.width,
        height: viewport.height,
        rotation: 0,
        scale: viewport.scale
      });
      setDrawingInk((prev) => [...prev, pdfPoint]);
    }
    if (tool === "select" && draggingOp) {
      const rect = event.currentTarget.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const pdfPoint = viewportToPdf(point, {
        width: viewport.width,
        height: viewport.height,
        rotation: 0,
        scale: viewport.scale
      });
      const op = ops.find((item) => item.id === draggingOp.id);
      if (!op) return;
      updateOp(pageIndex, {
        ...op,
        x: clamp(pdfPoint.x - draggingOp.offsetX, 0, Number.POSITIVE_INFINITY),
        y: clamp(pdfPoint.y - draggingOp.offsetY, 0, Number.POSITIVE_INFINITY)
      });
    }
  };

const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!viewport) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const pdfPoint = viewportToPdf(point, {
      width: viewport.width,
      height: viewport.height,
      rotation: 0,
      scale: viewport.scale
    });
    if (tool === "ink" && drawingInk.length > 1) {
      addOp(pageIndex, {
        ...createBaseOp(pageIndex, "ink"),
        points: drawingInk,
        strokeWidth: 2,
        color: "#38bdf8",
        x: drawingInk[0].x,
        y: drawingInk[0].y,
        width: 1,
        height: 1
      });
      setDrawingInk([]);
    }
    if ((tool === "highlight" || tool === "underline" || tool === "shape" || tool === "redaction") && dragStart) {
      const width = pdfPoint.x - dragStart.x;
      const height = pdfPoint.y - dragStart.y;
      const opType =
        tool === "redaction" ? "redaction" : tool === "shape" ? "shape" : tool === "underline" ? "underline" : "highlight";
      addOp(pageIndex, {
        ...createBaseOp(pageIndex, opType),
        x: Math.min(dragStart.x, pdfPoint.x),
        y: Math.min(dragStart.y, pdfPoint.y),
        width: Math.abs(width),
        height: Math.max(2, Math.abs(height)),
        color: tool === "highlight" || tool === "underline" ? "#facc15" : "#111827",
        opacity: tool === "highlight" ? 0.35 : 1,
        ...(tool === "shape" ? { shape: "rect" as ShapeKind, strokeWidth: 2 } : {}),
        ...(tool === "underline" ? { strokeWidth: 2 } : {}),
        ...(tool === "redaction" ? { mode: "visual" as const } : {})
      } as Op);
      setDragStart(null);
    }
    if (tool === "select") {
      setDraggingOp(null);
    }
  };

const renderedOps = useMemo(() => {
    if (!viewport) return [] as Array<Op & { style: React.CSSProperties }>;
    return ops.map((op) => {
      const topLeft = pdfToViewport(
        { x: op.x, y: op.y + op.height },
        {
          width: viewport.width,
          height: viewport.height,
          rotation: 0,
          scale: viewport.scale
        }
      );
      return {
        ...op,
        style: {
          left: `${topLeft.x}px`,
          top: `${topLeft.y}px`,
          width: `${op.width * viewport.scale}px`,
          height: `${op.height * viewport.scale}px`
        }
      };
    });
  }, [ops, viewport]);

  const handleSelect = (opId: string) => {
    selectOp(opId);
  };

  const handleDelete = () => {
    if (selectedOpId) {
      removeOp(pageIndex, selectedOpId);
      selectOp(null);
    }
  };

  const handleImageSelected = async (file: File) => {
    if (!imageAnchor) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      addOp(pageIndex, {
        ...createBaseOp(pageIndex, "image"),
        x: imageAnchor.x,
        y: imageAnchor.y,
        width: 120,
        height: 120,
        src,
        color: "#ffffff",
        opacity: 1
      });
      setImageAnchor(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSignatureSave = (src: string) => {
    if (!signatureAnchor) return;
    addOp(pageIndex, {
      ...createBaseOp(pageIndex, "signature"),
      x: signatureAnchor.x,
      y: signatureAnchor.y,
      width: 140,
      height: 60,
      src,
      color: "#ffffff",
      opacity: 1
    });
    setSignatureAnchor(null);
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Delete") handleDelete();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedOpId]);

  return (
    <div className="page-wrapper">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleImageSelected(file);
        }}
      />
      <div
        className="canvas-stack"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <canvas ref={canvasRef} />
        {viewport && (
          <svg className="overlay" width={viewport.width} height={viewport.height}>
            {renderedOps.map((op) => {
              switch (op.type) {
                case "text":
                  return (
                    <text
                      key={op.id}
                      x={parseFloat(op.style.left)}
                      y={parseFloat(op.style.top) + 16}
                      fill={op.color}
                      fontSize={op.fontSize * viewport.scale}
                      onClick={() => handleSelect(op.id)}
                    >
                      {op.text}
                    </text>
                  );
                case "highlight":
                case "redaction":
                  return (
                    <rect
                      key={op.id}
                      x={parseFloat(op.style.left)}
                      y={parseFloat(op.style.top)}
                      width={parseFloat(op.style.width)}
                      height={parseFloat(op.style.height)}
                      fill={op.type === "redaction" ? "#000" : op.color}
                      fillOpacity={op.opacity ?? 0.4}
                      onClick={() => handleSelect(op.id)}
                    />
                  );
                case "underline":
                  return (
                    <line
                      key={op.id}
                      x1={parseFloat(op.style.left)}
                      y1={parseFloat(op.style.top) + parseFloat(op.style.height)}
                      x2={parseFloat(op.style.left) + parseFloat(op.style.width)}
                      y2={parseFloat(op.style.top) + parseFloat(op.style.height)}
                      stroke={op.color}
                      strokeWidth={op.strokeWidth}
                      onClick={() => handleSelect(op.id)}
                    />
                  );
                case "shape":
                  return (
                    <rect
                      key={op.id}
                      x={parseFloat(op.style.left)}
                      y={parseFloat(op.style.top)}
                      width={parseFloat(op.style.width)}
                      height={parseFloat(op.style.height)}
                      stroke={op.color}
                      strokeWidth={op.strokeWidth}
                      fill={op.fillColor ?? "transparent"}
                      onClick={() => handleSelect(op.id)}
                    />
                  );
                case "ink":
                  return (
                    <polyline
                      key={op.id}
                      points={op.points
                        .map((point) => {
                          const view = pdfToViewport(point, {
                            width: viewport.width,
                            height: viewport.height,
                            rotation: 0,
                            scale: viewport.scale
                          });
                          return `${view.x},${view.y}`;
                        })
                        .join(" ")}
                      fill="none"
                      stroke={op.color}
                      strokeWidth={op.strokeWidth}
                      onClick={() => handleSelect(op.id)}
                    />
                  );
                case "note":
                  return (
                    <g key={op.id} onClick={() => handleSelect(op.id)}>
                      <rect
                        x={parseFloat(op.style.left)}
                        y={parseFloat(op.style.top)}
                        width={18}
                        height={18}
                        fill={op.color}
                      />
                      <title>{op.message}</title>
                    </g>
                  );
                case "image":
                case "signature":
                  return (
                    <image
                      key={op.id}
                      href={op.src}
                      x={parseFloat(op.style.left)}
                      y={parseFloat(op.style.top)}
                      width={parseFloat(op.style.width)}
                      height={parseFloat(op.style.height)}
                      onClick={() => handleSelect(op.id)}
                    />
                  );
                default:
                  return null;
              }
            })}
            {drawingInk.length > 1 && (
              <polyline
                points={drawingInk
                  .map((point) => {
                    const view = pdfToViewport(point, {
                      width: viewport.width,
                      height: viewport.height,
                      rotation: 0,
                      scale: viewport.scale
                    });
                    return `${view.x},${view.y}`;
                  })
                  .join(" ")}
                fill="none"
                stroke="#38bdf8"
                strokeWidth={2}
              />
            )}
          </svg>
        )}
      </div>
      {isActive && (
        <div className="notice">Active page. Tool: {tool}</div>
      )}
      <SignatureModal
        open={signatureOpen}
        onClose={() => setSignatureOpen(false)}
        onSave={handleSignatureSave}
      />
    </div>
  );
};

export default PdfPage;
