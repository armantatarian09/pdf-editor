# PDF Editor MVP

A privacy-first, client-side PDF editor built with React + TypeScript + Vite. The MVP focuses on
viewing, annotating, and exporting PDFs while keeping the UI extensible so you can later swap in
commercial SDKs (PSPDFKit/Apryse) without rewiring the interface.

## Why Vite?

Vite keeps the stack lightweight, deploys cleanly to Vercel as a static app, and keeps PDF.js usage
simple (no server runtime requirements). The architecture isolates the PDF engine so it can be
replaced later if needed.

## Folder Structure

```
public/
  sample.pdf
src/
  components/
    PdfPage.tsx
    SignatureModal.tsx
    ThumbnailSidebar.tsx
    Toolbar.tsx
  store/
    useProjectStore.ts
  tests/
    coords.test.ts
    serialize.test.ts
    e2e/
      smoke.spec.ts
  types/
    pdf.ts
  utils/
    coords.ts
    exportPdf.ts
    mergeSplit.ts
    pdfjs.ts
    persistence.ts
    serialize.ts
  App.tsx
  index.css
  main.tsx
```

## Features (MVP)

- **Viewer**: open local PDFs, zoom, rotate, thumbnails, page navigation.
- **Page operations**: reorder via drag/drop, rotate, duplicate/delete (delete in store), merge PDFs, split by page.
- **Annotation tools**: select/move, text, highlight, ink, shape (rect), note, image placement, signature capture.
- **Export**: download PDF with changes applied using pdf-lib.
- **Undo/redo**: project history in Zustand.
- **Autosave**: project state + PDF bytes in IndexedDB (idb-keyval).

## Tool Tutorial

### Select
1. Click **Select**.
2. Click any annotation overlay to select it.
3. Drag to move it.
4. Press **Delete** to remove the selected annotation.

### Text
1. Click **Text**.
2. Click on the page to place a text box.
3. Enter text in the prompt and confirm.

### Ink
1. Click **Ink**.
2. Press and drag to draw freehand strokes.

### Highlight
1. Click **Highlight**.
2. Click and drag to draw a translucent highlight rectangle.

### Underline
1. Click **Underline**.
2. Click and drag to draw an underline line. The line uses the bottom edge of the drag box.

### Shape
1. Click **Shape**.
2. Click and drag to draw a rectangle.

### Image
1. Click **Image**.
2. Click on the page to place the image.
3. Pick a PNG/JPG file from the file picker.

### Signature
1. Click **Signature**.
2. Click on the page to set a placement point.
3. Draw your signature in the modal and hit **Save**.

### Note
1. Click **Note**.
2. Click on the page to place a sticky note.
3. Enter the note text in the prompt.

### Redact
1. Click **Redact**.
2. Click and drag to draw a black rectangle.
3. This is visual-only in MVP; flattening is planned.

### Page Operations
- **Reorder pages**: drag thumbnails in the sidebar.
- **Rotate**: click **Rotate** in the toolbar.
- **Duplicate**: click **Duplicate** to clone the active page.
- **Delete**: click **Delete** to remove the active page.
- **Merge**: click **Merge** and select another PDF.
- **Split**: click **Split Page** to export the active page as its own PDF.

## Advanced Modules Roadmap (Feature Flags)

| Module | Flag | Status |
| --- | --- | --- |
| Form filling | `forms` | Placeholder (wire PDF-lib form read/write) |
| Form field creator | `formDesigner` | Placeholder |
| OCR text layer | `ocr` | Placeholder |
| Redaction (flatten) | `redactionFlatten` | Placeholder (rasterize page segments) |
| Compress/Optimize | `optimize` | Placeholder (image downsample + optional serverless API) |

## Architecture Notes

- **Operations model**: ops are stored per page and rendered on an overlay layer.
- **Coordinates**: utilities convert between viewport (top-left) and PDF coords (bottom-left).
- **Extensible tooling**: each tool is dispatched based on `tool` state and creates operations.

## Running Locally

```bash
npm install
npm run dev
```

## Tests

```bash
npm run test
npm run test:e2e
```

## Deploy to Vercel

1. Push the repo to GitHub.
2. In Vercel, import the repo and select the **Vite** preset.
3. Build command: `npm run build`
4. Output directory: `dist`

## Limitations

- Editing existing PDF text like a word processor is not supported.
- Redaction is visual-only in the MVP. Flattened redaction is a planned module.
- Image/signature ops are embedded as base64 and drawn in export, but full annotation embedding
  (PDF annotations) is a next step.
