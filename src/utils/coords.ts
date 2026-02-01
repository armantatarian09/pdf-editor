export type Viewport = {
  width: number;
  height: number;
  rotation: number;
  scale: number;
};

export type Point = { x: number; y: number };

export const viewportToPdf = (point: Point, viewport: Viewport): Point => {
  const { height, scale } = viewport;
  return {
    x: point.x / scale,
    y: (height - point.y) / scale
  };
};

export const pdfToViewport = (point: Point, viewport: Viewport): Point => {
  const { height, scale } = viewport;
  return {
    x: point.x * scale,
    y: height - point.y * scale
  };
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);
