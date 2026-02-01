import { DndContext, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState } from "react";
import { useProjectStore } from "../store/useProjectStore";
import { getDocument } from "../utils/pdfjs";
import { PageMeta } from "../types/pdf";

type ThumbnailSidebarProps = {
  pdfDoc: Awaited<ReturnType<typeof getDocument>> | null;
  pages: PageMeta[];
};

const SortableThumbnail = ({
  id,
  index,
  sourceIndex,
  pdfDoc
}: {
  id: string;
  index: number;
  sourceIndex: number;
  pdfDoc: any;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const activePageIndex = useProjectStore((state) => state.activePageIndex);
  const setActivePageIndex = useProjectStore((state) => state.setActivePageIndex);

  useEffect(() => {
    const renderThumb = async () => {
      if (!pdfDoc) return;
      const page = await pdfDoc.getPage(sourceIndex + 1);
      const viewport = page.getViewport({ scale: 0.2 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport }).promise;
      setThumbUrl(canvas.toDataURL("image/png"));
    };
    renderThumb();
  }, [index, pdfDoc]);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`thumbnail ${activePageIndex === index ? "active" : ""}`}
      {...attributes}
      {...listeners}
      onClick={() => setActivePageIndex(index)}
    >
      <div>Page {index + 1}</div>
      {thumbUrl && <img src={thumbUrl} alt={`Page ${index + 1}`} width="180" />}
    </div>
  );
};

const ThumbnailSidebar = ({ pdfDoc, pages }: ThumbnailSidebarProps) => {
  const pagesMeta = useProjectStore((state) => state.present.pagesMeta);
  const reorderPages = useProjectStore((state) => state.reorderPages);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = pagesMeta.findIndex((page) => page.id === active.id);
    const newIndex = pagesMeta.findIndex((page) => page.id === over.id);
    const newOrder = pages.map((_, index) => index);
    newOrder.splice(newIndex, 0, newOrder.splice(oldIndex, 1)[0]);
    reorderPages(newOrder);
  };

  return (
    <aside className="sidebar">
      <div className="panel">
        <strong>Pages</strong>
      </div>
      <DndContext onDragEnd={handleDragEnd}>
        <SortableContext items={pagesMeta.map((page) => page.id)} strategy={verticalListSortingStrategy}>
          <div className="thumbnail-list">
            {pagesMeta.map((page, index) => (
              <SortableThumbnail
                key={page.id}
                id={page.id}
                index={index}
                sourceIndex={page.sourceIndex}
                pdfDoc={pdfDoc}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="panel">
        <button onClick={() => reorderPages(pages.map((_, index) => index))}>Reset Order</button>
      </div>
    </aside>
  );
};

export default ThumbnailSidebar;
