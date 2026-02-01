import { useEffect, useMemo, useState } from "react";
import { getDocument } from "./utils/pdfjs";
import Toolbar from "./components/Toolbar";
import ThumbnailSidebar from "./components/ThumbnailSidebar";
import PdfPage from "./components/PdfPage";
import { useProjectStore } from "./store/useProjectStore";
import { exportPdf } from "./utils/exportPdf";
import { loadProject, saveProject } from "./utils/persistence";

const App = () => {
  const [pdfDoc, setPdfDoc] = useState<Awaited<ReturnType<typeof getDocument>> | null>(null);
  const project = useProjectStore((state) => state.present);
  const zoom = useProjectStore((state) => state.zoom);
  const loadPdf = useProjectStore((state) => state.loadPdf);
  const hydrateProject = useProjectStore((state) => state.hydrateProject);
  const setZoom = useProjectStore((state) => state.setZoom);
  const setActivePageIndex = useProjectStore((state) => state.setActivePageIndex);
  const activePageIndex = useProjectStore((state) => state.activePageIndex);
  const undo = useProjectStore((state) => state.undo);
  const redo = useProjectStore((state) => state.redo);

  useEffect(() => {
    const restore = async () => {
      const stored = await loadProject();
      if (stored) {
        hydrateProject(stored);
        const doc = await getDocument({ data: stored.pdfBytes }).promise;
        setPdfDoc(doc);
      }
    };
    restore();
  }, [hydrateProject, loadPdf]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        if (event.key === "z") {
          event.preventDefault();
          undo();
        }
        if (event.key === "y") {
          event.preventDefault();
          redo();
        }
        if (event.key === "+" || event.key === "=") {
          event.preventDefault();
          setZoom(Math.min(3, zoom + 0.1));
        }
        if (event.key === "-") {
          event.preventDefault();
          setZoom(Math.max(0.5, zoom - 0.1));
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [redo, setZoom, undo, zoom]);

  useEffect(() => {
    if (!project.pdfBytes) return;
    saveProject(project);
  }, [project]);

  const handleFile = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      alert("Large file detected. Performance may be impacted.");
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const doc = await getDocument({ data: bytes }).promise;
    loadPdf(bytes, doc.numPages);
    setPdfDoc(doc);
  };

  const handleDownload = async () => {
    if (!project.pdfBytes) return;
    const bytes = await exportPdf(
      project.pdfBytes,
      project.opsByPage,
      project.pagesMeta.map((page) => page.rotation)
    );
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${project.name || "edited"}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const pages = useMemo(
    () => project.pagesMeta.map((_, index) => index),
    [project.pagesMeta]
  );

  return (
    <div>
      <Toolbar onFileSelected={handleFile} onDownload={handleDownload} />
      <div className="app-shell">
        <ThumbnailSidebar pdfDoc={pdfDoc} pages={pages} />
        <main
          className="page-container"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
        >
          {pdfDoc ? (
            pages.map((pageIndex) => (
              <PdfPage
                key={project.pagesMeta[pageIndex]?.id ?? pageIndex}
                pdfDoc={pdfDoc}
                pageIndex={pageIndex}
                zoom={zoom}
                isActive={activePageIndex === pageIndex}
                onActivate={() => setActivePageIndex(pageIndex)}
              />
            ))
          ) : (
            <div className="notice">
              Drop a PDF or use the open button to get started. Your files stay in the browser.
            </div>
          )}
        </main>
      </div>
      <div className="panel">
        <div className="notice">
          Visual redaction is not permanent. Use flatten mode to rasterize pages for best-effort
          removal.
        </div>
      </div>
    </div>
  );
};

export default App;
