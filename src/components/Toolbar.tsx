import { useRef } from "react";
import { useProjectStore } from "../store/useProjectStore";
import { mergePdfBytes, splitPdfBytes } from "../utils/mergeSplit";
import { toolRegistry } from "../tools/registry";

type ToolbarProps = {
  onFileSelected: (file: File) => void;
  onDownload: () => void;
};

const Toolbar = ({ onFileSelected, onDownload }: ToolbarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mergeInputRef = useRef<HTMLInputElement>(null);
  const tool = useProjectStore((state) => state.tool);
  const setTool = useProjectStore((state) => state.setTool);
  const undo = useProjectStore((state) => state.undo);
  const redo = useProjectStore((state) => state.redo);
  const zoom = useProjectStore((state) => state.zoom);
  const setZoom = useProjectStore((state) => state.setZoom);
  const rotatePage = useProjectStore((state) => state.rotatePage);
  const activePageIndex = useProjectStore((state) => state.activePageIndex);
  const project = useProjectStore((state) => state.present);
  const mergeProject = useProjectStore((state) => state.mergeProject);
  const deletePages = useProjectStore((state) => state.deletePages);
  const duplicatePage = useProjectStore((state) => state.duplicatePage);

  const handleMerge = async (file: File) => {
    if (!project.pdfBytes) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await mergePdfBytes(project.pdfBytes, bytes);
    mergeProject(result.bytes, result.addedPages);
  };

  const handleSplit = async () => {
    if (!project.pdfBytes) return;
    const bytes = await splitPdfBytes(project.pdfBytes, [activePageIndex]);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `page-${activePageIndex + 1}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="toolbar">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFileSelected(file);
        }}
      />
      <input
        ref={mergeInputRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleMerge(file);
        }}
      />
      <button onClick={() => fileInputRef.current?.click()}>Open</button>
      <button onClick={() => mergeInputRef.current?.click()}>Merge</button>
      <button onClick={handleSplit}>Split Page</button>
      <button onClick={() => duplicatePage(activePageIndex)}>Duplicate</button>
      <button onClick={() => deletePages([activePageIndex])}>Delete</button>
      <button onClick={onDownload}>Download PDF</button>
      <button onClick={undo}>Undo</button>
      <button onClick={redo}>Redo</button>
      <button onClick={() => rotatePage(activePageIndex, 90)}>Rotate</button>
      <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}>-</button>
      <span>Zoom {Math.round(zoom * 100)}%</span>
      <button onClick={() => setZoom(Math.min(3, zoom + 0.1))}>+</button>
      {toolRegistry.map((item) => (
        <button
          key={item.id}
          className={tool === item.id ? "active" : ""}
          onClick={() => setTool(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default Toolbar;
