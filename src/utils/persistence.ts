import { get, set } from "idb-keyval";
import { Project } from "../types/pdf";

const PROJECT_KEY = "pdf-editor-project";
const BYTES_KEY = "pdf-editor-bytes";
type StoredProject = Omit<Project, "pdfBytes">;

export const saveProject = async (project: Project) => {
  const { pdfBytes, ...rest } = project;
  await set(PROJECT_KEY, rest);
  if (pdfBytes) {
    await set(BYTES_KEY, pdfBytes);
  }
};

export const loadProject = async (): Promise<Project | null> => {
  const project = await get<StoredProject>(PROJECT_KEY);
  const bytes = await get<Uint8Array>(BYTES_KEY);
  if (!project || !bytes) return null;
  return { ...project, pdfBytes: bytes };
};

export const loadPdfBytes = async (): Promise<
  | { bytes: Uint8Array; pageCount: number }
  | null
> => {
  const project = await loadProject();
  if (!project || !project.pdfBytes) return null;
  return { bytes: project.pdfBytes, pageCount: project.pageCount };
};
