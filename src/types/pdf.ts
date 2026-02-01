export type ToolType =
  | "select"
  | "text"
  | "ink"
  | "highlight"
  | "underline"
  | "shape"
  | "image"
  | "signature"
  | "note"
  | "redaction";

export type ShapeKind = "rect" | "ellipse" | "line" | "arrow";

export type BaseOp = {
  id: string;
  pageIndex: number;
  type:
    | "text"
    | "ink"
    | "highlight"
    | "underline"
    | "shape"
    | "image"
    | "signature"
    | "note"
    | "redaction";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  opacity?: number;
};

export type TextOp = BaseOp & {
  type: "text";
  text: string;
  fontSize: number;
  align: "left" | "center" | "right";
};

export type InkPoint = { x: number; y: number };

export type InkOp = BaseOp & {
  type: "ink";
  points: InkPoint[];
  strokeWidth: number;
};

export type HighlightOp = BaseOp & {
  type: "highlight";
};

export type UnderlineOp = BaseOp & {
  type: "underline";
  strokeWidth: number;
};

export type ShapeOp = BaseOp & {
  type: "shape";
  shape: ShapeKind;
  strokeWidth: number;
  fillColor?: string;
};

export type ImageOp = BaseOp & {
  type: "image";
  src: string;
};

export type SignatureOp = BaseOp & {
  type: "signature";
  src: string;
};

export type NoteOp = BaseOp & {
  type: "note";
  message: string;
};

export type RedactionOp = BaseOp & {
  type: "redaction";
  mode: "visual" | "flatten";
};

export type Op =
  | TextOp
  | InkOp
  | HighlightOp
  | UnderlineOp
  | ShapeOp
  | ImageOp
  | SignatureOp
  | NoteOp
  | RedactionOp;

export type PageMeta = {
  id: string;
  rotation: number;
  sourceIndex: number;
};

export type Project = {
  id: string;
  name: string;
  createdAt: string;
  pdfBytes: Uint8Array | null;
  pageCount: number;
  pagesMeta: PageMeta[];
  opsByPage: Record<number, Op[]>;
};

export type HistoryState = {
  past: Project[];
  present: Project;
  future: Project[];
};
