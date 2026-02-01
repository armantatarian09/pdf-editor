import { PDFDocument } from "pdf-lib";

export const mergePdfBytes = async (base: Uint8Array, extra: Uint8Array) => {
  const baseDoc = await PDFDocument.load(base);
  const extraDoc = await PDFDocument.load(extra);
  const extraPages = await baseDoc.copyPages(extraDoc, extraDoc.getPageIndices());
  extraPages.forEach((page) => baseDoc.addPage(page));
  const mergedBytes = await baseDoc.save();
  return { bytes: mergedBytes, addedPages: extraPages.length };
};

export const splitPdfBytes = async (bytes: Uint8Array, pageIndexes: number[]) => {
  const baseDoc = await PDFDocument.load(bytes);
  const splitDoc = await PDFDocument.create();
  const pages = await splitDoc.copyPages(baseDoc, pageIndexes);
  pages.forEach((page) => splitDoc.addPage(page));
  return splitDoc.save();
};
