import { ToolType } from "../types/pdf";

export type ToolDefinition = {
  id: ToolType;
  label: string;
  description: string;
};

export const toolRegistry: ToolDefinition[] = [
  { id: "select", label: "Select", description: "Select and move annotations" },
  { id: "text", label: "Text", description: "Add text boxes" },
  { id: "ink", label: "Ink", description: "Freehand drawing" },
  { id: "highlight", label: "Highlight", description: "Highlight regions" },
  { id: "underline", label: "Underline", description: "Underline text" },
  { id: "shape", label: "Shape", description: "Draw rectangles" },
  { id: "image", label: "Image", description: "Place an image" },
  { id: "signature", label: "Signature", description: "Draw signatures" },
  { id: "note", label: "Note", description: "Add sticky notes" },
  { id: "redaction", label: "Redact", description: "Visual redaction" }
];
