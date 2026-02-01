import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { HistoryState, Op, PageMeta, Project, ToolType } from "../types/pdf";

const createEmptyProject = (): Project => ({
  id: crypto.randomUUID(),
  name: "Untitled",
  createdAt: new Date().toISOString(),
  pdfBytes: null,
  pageCount: 0,
  pagesMeta: [],
  opsByPage: {}
});

const cloneProject = (project: Project): Project => ({
  ...project,
  pdfBytes: project.pdfBytes ? new Uint8Array(project.pdfBytes) : null,
  pagesMeta: project.pagesMeta.map((page) => ({ ...page })),
  opsByPage: Object.fromEntries(
    Object.entries(project.opsByPage).map(([key, ops]) => [
      Number(key),
      ops.map((op) => ({
        ...op,
        ...(op.type === "ink" ? { points: op.points.map((pt) => ({ ...pt })) } : {})
      }))
    ])
  )
});

export type ProjectStore = HistoryState & {
  tool: ToolType;
  selectedOpId: string | null;
  zoom: number;
  activePageIndex: number;
  setTool: (tool: ToolType) => void;
  setZoom: (zoom: number) => void;
  setActivePageIndex: (index: number) => void;
  hydrateProject: (project: Project) => void;
  loadPdf: (bytes: Uint8Array, pageCount: number) => void;
  updatePageMeta: (pagesMeta: PageMeta[]) => void;
  addOp: (pageIndex: number, op: Op) => void;
  updateOp: (pageIndex: number, op: Op) => void;
  removeOp: (pageIndex: number, opId: string) => void;
  selectOp: (opId: string | null) => void;
  reorderPages: (order: number[]) => void;
  rotatePage: (pageIndex: number, delta: number) => void;
  deletePages: (pageIndexes: number[]) => void;
  duplicatePage: (pageIndex: number) => void;
  mergeProject: (bytes: Uint8Array, addedPages: number) => void;
  undo: () => void;
  redo: () => void;
};

const createHistory = (): HistoryState => ({
  past: [],
  present: createEmptyProject(),
  future: []
});

const pushHistory = (state: HistoryState, next: Project): HistoryState => ({
  past: [...state.past, cloneProject(state.present)],
  present: next,
  future: []
});

export const useProjectStore = create<ProjectStore>()(
  devtools((set) => ({
    ...createHistory(),
    tool: "select",
    selectedOpId: null,
    zoom: 1,
    activePageIndex: 0,
    setTool: (tool) => set({ tool }),
    setZoom: (zoom) => set({ zoom }),
    setActivePageIndex: (index) => set({ activePageIndex: index }),
    hydrateProject: (project) =>
      set(() => ({
        past: [],
        present: project,
        future: []
      })),
    loadPdf: (bytes, pageCount) =>
      set((state) => {
        const pagesMeta: PageMeta[] = Array.from({ length: pageCount }, (_, index) => ({
          id: crypto.randomUUID(),
          rotation: 0
        }));
        const present: Project = {
          ...state.present,
          pdfBytes: bytes,
          pageCount,
          pagesMeta,
          opsByPage: {}
        };
        return pushHistory(state, present);
      }),
    updatePageMeta: (pagesMeta) =>
      set((state) => pushHistory(state, { ...state.present, pagesMeta })),
    addOp: (pageIndex, op) =>
      set((state) => {
        const ops = state.present.opsByPage[pageIndex] ?? [];
        const next = {
          ...state.present,
          opsByPage: {
            ...state.present.opsByPage,
            [pageIndex]: [...ops, op]
          }
        };
        return pushHistory(state, next);
      }),
    updateOp: (pageIndex, op) =>
      set((state) => {
        const ops = state.present.opsByPage[pageIndex] ?? [];
        const nextOps = ops.map((item) => (item.id === op.id ? op : item));
        const next = {
          ...state.present,
          opsByPage: {
            ...state.present.opsByPage,
            [pageIndex]: nextOps
          }
        };
        return pushHistory(state, next);
      }),
    removeOp: (pageIndex, opId) =>
      set((state) => {
        const ops = state.present.opsByPage[pageIndex] ?? [];
        const nextOps = ops.filter((item) => item.id !== opId);
        const next = {
          ...state.present,
          opsByPage: {
            ...state.present.opsByPage,
            [pageIndex]: nextOps
          }
        };
        return pushHistory(state, next);
      }),
    selectOp: (opId) => set({ selectedOpId: opId }),
    reorderPages: (order) =>
      set((state) => {
        const pagesMeta = order.map((index) => state.present.pagesMeta[index]);
        const opsByPage: Project["opsByPage"] = {};
        order.forEach((oldIndex, newIndex) => {
          opsByPage[newIndex] = state.present.opsByPage[oldIndex] ?? [];
        });
        return pushHistory(state, {
          ...state.present,
          pagesMeta,
          opsByPage
        });
      }),
    rotatePage: (pageIndex, delta) =>
      set((state) => {
        const pagesMeta = state.present.pagesMeta.map((page, index) =>
          index === pageIndex ? { ...page, rotation: (page.rotation + delta) % 360 } : page
        );
        return pushHistory(state, { ...state.present, pagesMeta });
      }),
    deletePages: (pageIndexes) =>
      set((state) => {
        const remaining = state.present.pagesMeta.filter((_, index) => !pageIndexes.includes(index));
        const opsByPage: Project["opsByPage"] = {};
        let newIndex = 0;
        state.present.pagesMeta.forEach((_, index) => {
          if (!pageIndexes.includes(index)) {
            opsByPage[newIndex] = state.present.opsByPage[index] ?? [];
            newIndex += 1;
          }
        });
        return pushHistory(state, {
          ...state.present,
          pagesMeta: remaining,
          pageCount: remaining.length,
          opsByPage
        });
      }),
    duplicatePage: (pageIndex) =>
      set((state) => {
        const pagesMeta = [...state.present.pagesMeta];
        pagesMeta.splice(pageIndex + 1, 0, {
          id: crypto.randomUUID(),
          rotation: pagesMeta[pageIndex]?.rotation ?? 0
        });
        const opsByPage: Project["opsByPage"] = {};
        pagesMeta.forEach((_, index) => {
          const sourceIndex = index <= pageIndex ? index : index - 1;
          opsByPage[index] = (state.present.opsByPage[sourceIndex] ?? []).map((op) => ({
            ...op,
            id: crypto.randomUUID(),
            pageIndex: index
          }));
        });
        return pushHistory(state, {
          ...state.present,
          pagesMeta,
          pageCount: pagesMeta.length,
          opsByPage
        });
      }),
    mergeProject: (bytes, addedPages) =>
      set((state) => {
        const pagesMeta = [...state.present.pagesMeta];
        for (let i = 0; i < addedPages; i += 1) {
          pagesMeta.push({ id: crypto.randomUUID(), rotation: 0 });
        }
        return pushHistory(state, {
          ...state.present,
          pdfBytes: bytes,
          pagesMeta,
          pageCount: pagesMeta.length
        });
      }),
    undo: () =>
      set((state) => {
        if (state.past.length === 0) return state;
        const previous = state.past[state.past.length - 1];
        return {
          ...state,
          past: state.past.slice(0, -1),
          present: previous,
          future: [cloneProject(state.present), ...state.future]
        };
      }),
    redo: () =>
      set((state) => {
        if (state.future.length === 0) return state;
        const next = state.future[0];
        return {
          ...state,
          past: [...state.past, cloneProject(state.present)],
          present: next,
          future: state.future.slice(1)
        };
      })
  }))
);
