"use client";

import JSZip from "jszip";
import {
  Download,
  FileImage,
  FileText,
  GripVertical,
  ImagePlus,
  LoaderCircle,
  Moon,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";
import { ChangeEvent, DragEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import {
  convertImage,
  convertToTarget,
  formatBytes,
  formatLabel,
  makeItFit,
  makeOutputName,
  normalizeImage,
  presets,
  recommendImageSettings,
  savingsPercent,
  type PresetName,
  type Watermark,
  validateImage,
} from "@/lib/image";
import { responsiveSnippet, type SnippetKind } from "@/lib/responsive-code";
import { inspectMetadata, preserveJpegMetadata } from "@/lib/metadata";
import type { ImageItem, ImageOutput, OutputFormat, PreservedMetadataField } from "@/types/image";

const formats: OutputFormat[] = [
  "image/webp",
  "image/jpeg",
  "image/png",
  "image/avif",
];
const responsive = [
  { suffix: "-sm", width: 640 },
  { suffix: "-md", width: 1280 },
  { suffix: "-lg", width: 1920 },
];
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function pathFor(item: ImageItem, name: string) {
  const relative = (item.file as File & { webkitRelativePath?: string })
    .webkitRelativePath;
  return relative ? `${relative.replace(/[^/]+$/, "")}${name}` : name;
}

type CropValues = { x: number; y: number; width: number; height: number };
type SavedWorkflow = { format: OutputFormat; quality: number; width: string; height: string; scalePercent: string; maxHeight: string; aspectRatio: string; fitMode: boolean; rotation: 0 | 90 | 180 | 270; flipX: boolean; flipY: boolean; cropX: string; cropY: string; cropWidth: string; cropHeight: string; suffix: string; targetKB: string; responsivePack: boolean; background: string; canvasPadding: string; watermarkText: string; watermarkColor: string; watermarkOpacity: number; watermarkPosition: Watermark["position"] };
const workflowStorageKey = "image-convertor-workflows";
function Comparison({ item }: { item: ImageItem }) {
  const [split, setSplit] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; pan: { x: number; y: number } } | null>(null);
  const output = item.result || { url: item.sourceUrl, width: item.width || 0, height: item.height || 0, blob: item.file };
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setPan({ x: Math.max(-45, Math.min(45, drag.current.pan.x + ((event.clientX - drag.current.x) / rect.width) * 100)), y: Math.max(-45, Math.min(45, drag.current.pan.y + ((event.clientY - drag.current.y) / rect.height) * 100)) });
  };
  const transform = `translate(${pan.x}%, ${pan.y}%) scale(${zoom})`;
  return <div className="comparison-tool"><div className="compare-stage" role="group" aria-label="Comparison canvas" onPointerDown={(event) => { drag.current = { x: event.clientX, y: event.clientY, pan }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onWheel={(event) => { event.preventDefault(); setZoom((value) => Math.max(1, Math.min(4, value + (event.deltaY < 0 ? 0.2 : -0.2)))); }}><img className="compare-image" style={{ transform }} src={output.url} alt={`Output ${item.file.name}`} /><div className="compare-before" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}><img className="compare-image" style={{ transform }} src={item.sourceUrl} alt={`Original ${item.file.name}`} /></div><span className="compare-label before">Original</span><span className="compare-label after">Output</span><span className="compare-divider" style={{ left: `${split}%` }} /></div><label className="compare-range">Before / after <input aria-label="Before and after split" type="range" min="0" max="100" value={split} onChange={(event) => setSplit(Number(event.target.value))} /></label><div className="comparison-facts"><span>Original · {item.width || "—"} × {item.height || "—"} px · {formatBytes(item.file.size)}</span><span>Output · {output.width || "—"} × {output.height || "—"} px · {formatBytes(output.blob.size)}</span><span>Zoom {Math.round(zoom * 100)}%</span><button className="text-button" type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reset view</button></div></div>;
}
function PdfTools() {
  const [files, setFiles] = useState<File[]>([]);
  const [pageOrder, setPageOrder] = useState("");
  const [watermarkText, setWatermarkText] = useState("");
  const [watermarkPosition, setWatermarkPosition] = useState<"top-left" | "top-right" | "bottom-left" | "bottom-right">("bottom-right");
  const [notice, setNotice] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const addFiles = (next: FileList | null) => setFiles(Array.from(next || []).filter((file) => file.type === "application/pdf"));
  const save = (bytes: Uint8Array, name: string) => { const buffer = new Uint8Array(bytes.length); buffer.set(bytes); download(new Blob([buffer.buffer], { type: "application/pdf" }), name); };
  async function merge() {
    if (!files.length) return;
    const { PDFDocument } = await import("pdf-lib");
    const merged = await PDFDocument.create();
    for (const file of files) { const source = await PDFDocument.load(await file.arrayBuffer()); const pages = await merged.copyPages(source, source.getPageIndices()); pages.forEach((page) => merged.addPage(page)); }
    save(await merged.save(), "image-convertor-merged.pdf");
  }
  async function split() {
    if (!files.length) return;
    const { PDFDocument } = await import("pdf-lib");
    const archive = new JSZip();
    for (const file of files) { const source = await PDFDocument.load(await file.arrayBuffer()); for (const index of source.getPageIndices()) { const pageDocument = await PDFDocument.create(); const [page] = await pageDocument.copyPages(source, [index]); pageDocument.addPage(page); archive.file(`${file.name.replace(/\.pdf$/i, "")}-page-${index + 1}.pdf`, await pageDocument.save()); } }
    download(await archive.generateAsync({ type: "blob" }), "image-convertor-split-pages.zip");
  }
  async function reorder() {
    if (files.length !== 1) { setNotice("Choose exactly one PDF to reorder its pages."); return; }
    const indexes = pageOrder.split(",").map((value) => Number(value.trim()) - 1);
    if (!indexes.length || indexes.some((index) => !Number.isInteger(index) || index < 0)) { setNotice("Use comma-separated page numbers, for example: 3, 1, 2."); return; }
    const { PDFDocument } = await import("pdf-lib");
    const source = await PDFDocument.load(await files[0].arrayBuffer());
    if (indexes.some((index) => index >= source.getPageCount()) || new Set(indexes).size !== source.getPageCount()) { setNotice(`List every page exactly once (1 to ${source.getPageCount()}).`); return; }
    const reordered = await PDFDocument.create();
    const pages = await reordered.copyPages(source, indexes); pages.forEach((page) => reordered.addPage(page));
    save(await reordered.save(), `${files[0].name.replace(/\.pdf$/i, "")}-reordered.pdf`);
  }
  async function clean() {
    if (!files.length) return;
    const { PDFDocument } = await import("pdf-lib");
    const archive = new JSZip();
    const cleanedOutputs: { name: string; bytes: Uint8Array }[] = [];
    for (const file of files) { const source = await PDFDocument.load(await file.arrayBuffer()); const cleaned = await PDFDocument.create(); const pages = await cleaned.copyPages(source, source.getPageIndices()); pages.forEach((page) => cleaned.addPage(page)); cleaned.setTitle(""); cleaned.setAuthor(""); cleaned.setSubject(""); cleaned.setKeywords([]); cleaned.setCreator("Image Convertor"); cleaned.setProducer("Image Convertor"); cleanedOutputs.push({ name: `${file.name.replace(/\.pdf$/i, "")}-clean.pdf`, bytes: await cleaned.save() }); }
    if (cleanedOutputs.length === 1) { save(cleanedOutputs[0].bytes, cleanedOutputs[0].name); return; }
    cleanedOutputs.forEach((output) => archive.file(output.name, output.bytes));
    download(await archive.generateAsync({ type: "blob" }), "image-convertor-clean-pdfs.zip");
  }
  async function exportPagesAsPng() {
    if (!files.length) return;
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
    const archive = new JSZip();
    for (const file of files) {
      const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
      const pdf = await task.promise;
      for (let index = 1; index <= pdf.numPages; index += 1) {
        const page = await pdf.getPage(index);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d");
        if (!context) { setNotice("Canvas is not available in this browser."); return; }
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (!png) { setNotice("The browser could not render a PDF page."); return; }
        archive.file(`${file.name.replace(/\.pdf$/i, "")}-page-${index}.png`, png);
      }
      await task.destroy();
    }
    download(await archive.generateAsync({ type: "blob" }), "image-convertor-pdf-pages.zip");
  }
  async function watermark() {
    if (!files.length || !watermarkText.trim()) { setNotice("Choose PDF files and enter watermark text."); return; }
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const archive = new JSZip();
    const outputs: { name: string; bytes: Uint8Array }[] = [];
    for (const file of files) {
      const source = await PDFDocument.load(await file.arrayBuffer());
      const marked = await PDFDocument.create();
      const pages = await marked.copyPages(source, source.getPageIndices());
      const font = await marked.embedFont(StandardFonts.HelveticaBold);
      pages.forEach((page) => { marked.addPage(page); const { width, height } = page.getSize(); const size = Math.max(12, Math.min(width, height) * 0.035); const textWidth = font.widthOfTextAtSize(watermarkText, size); const padding = Math.max(18, size); const bottom = watermarkPosition.startsWith("bottom"); const right = watermarkPosition.endsWith("right"); page.drawText(watermarkText, { x: right ? width - padding - textWidth : padding, y: bottom ? padding : height - padding - size, size, font, color: rgb(0.12, 0.16, 0.11), opacity: 0.65 }); });
      outputs.push({ name: `${file.name.replace(/\.pdf$/i, "")}-watermarked.pdf`, bytes: await marked.save() });
    }
    if (outputs.length === 1) { save(outputs[0].bytes, outputs[0].name); return; }
    outputs.forEach((output) => archive.file(output.name, output.bytes));
    download(await archive.generateAsync({ type: "blob" }), "image-convertor-watermarked-pdfs.zip");
  }
  return <section className="pdf-tools" aria-labelledby="pdf-tools-title"><div><p className="eyebrow">PDF TOOLS</p><h2 id="pdf-tools-title">Keep documents local, too.</h2><p>Merge, split, reorder, convert, watermark, and clean PDFs in your browser.</p></div><div className="pdf-actions"><input ref={input} aria-label="Choose PDF files" type="file" accept="application/pdf" multiple onChange={(event) => addFiles(event.target.files)} /><button className="download-all" type="button" onClick={() => input.current?.click()}><FileText size={17} /> Choose PDFs</button>{files.length > 0 && <p>{files.length} PDF{files.length === 1 ? "" : "s"} selected</p>}<div className="pdf-buttons"><button className="text-button" type="button" onClick={merge}>Merge PDFs</button><button className="text-button" type="button" onClick={split}>Split into pages</button><button className="text-button" type="button" onClick={exportPagesAsPng}>PDF to PNG pages</button><button className="text-button" type="button" onClick={clean}>Clean metadata</button></div><label>Page order (one PDF) <input aria-label="PDF page order" placeholder="e.g. 3, 1, 2" value={pageOrder} onChange={(event) => setPageOrder(event.target.value)} /></label><button className="text-button" type="button" onClick={reorder}>Export reordered PDF</button><div className="pdf-watermark"><label>Watermark text <input aria-label="PDF watermark text" placeholder="e.g. Confidential" value={watermarkText} onChange={(event) => setWatermarkText(event.target.value)} /></label><label>Position <select aria-label="PDF watermark position" value={watermarkPosition} onChange={(event) => setWatermarkPosition(event.target.value as typeof watermarkPosition)}><option value="bottom-right">Bottom right</option><option value="bottom-left">Bottom left</option><option value="top-right">Top right</option><option value="top-left">Top left</option></select></label><button className="text-button" type="button" onClick={watermark}>Watermark every page</button></div>{notice && <p className="notice">{notice}</p>}</div></section>;
}
function CropEditor({ item, crop, onApply, onClose }: { item: ImageItem; crop: CropValues; onApply: (crop: CropValues) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(crop);
  const drag = useRef<{ mode: "move" | "resize"; startX: number; startY: number; crop: CropValues } | null>(null);
  const update = (event: ReactPointerEvent, mode: "move" | "resize") => {
    const frame = event.currentTarget.closest(".crop-canvas") as HTMLElement | null;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    if (!drag.current) { if (event.type !== "pointerdown") return; drag.current = { mode, startX: event.clientX, startY: event.clientY, crop: draft }; event.currentTarget.setPointerCapture(event.pointerId); return; }
    const dx = ((event.clientX - drag.current.startX) / rect.width) * 100;
    const dy = ((event.clientY - drag.current.startY) / rect.height) * 100;
    const initial = drag.current.crop;
    if (drag.current.mode === "move") setDraft({ ...initial, x: Math.max(0, Math.min(100 - initial.width, initial.x + dx)), y: Math.max(0, Math.min(100 - initial.height, initial.y + dy)) });
    else setDraft({ ...initial, width: Math.max(5, Math.min(100 - initial.x, initial.width + dx)), height: Math.max(5, Math.min(100 - initial.y, initial.height + dy)) });
  };
  return <div className="modal" role="dialog" aria-modal="true" aria-label="Visual crop editor" onClick={onClose}><div className="crop-dialog" onClick={(event) => event.stopPropagation()}><button aria-label="Close crop editor" onClick={onClose}><X size={20}/></button><h2>Crop {item.file.name}</h2><p>Drag the frame to move it. Drag the lower-right handle to resize.</p><div className="crop-canvas"><img src={item.sourceUrl} alt="Crop source" draggable={false}/><div className="crop-frame" style={{ left: `${draft.x}%`, top: `${draft.y}%`, width: `${draft.width}%`, height: `${draft.height}%` }} onPointerDown={(event) => update(event, "move")} onPointerMove={(event) => update(event, "move")} onPointerUp={() => { drag.current = null; }}><span className="crop-handle" aria-label="Resize crop area" onPointerDown={(event) => { event.stopPropagation(); update(event, "resize"); }} onPointerMove={(event) => { event.stopPropagation(); update(event, "resize"); }} onPointerUp={() => { drag.current = null; }} /></div></div><p className="crop-readout">{Math.round(draft.x)}% left · {Math.round(draft.y)}% top · {Math.round(draft.width)}% × {Math.round(draft.height)}%</p><button className="button" onClick={() => { onApply(draft); onClose(); }}>Apply crop</button></div></div>;
}

export function Converter() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [format, setFormat] = useState<OutputFormat>("image/webp");
  const [quality, setQuality] = useState(82);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [scalePercent, setScalePercent] = useState("");
  const [maxHeight, setMaxHeight] = useState("");
  const [aspectRatio, setAspectRatio] = useState("");
  const [fitMode, setFitMode] = useState(false);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [cropX, setCropX] = useState("0");
  const [cropY, setCropY] = useState("0");
  const [cropWidth, setCropWidth] = useState("100");
  const [cropHeight, setCropHeight] = useState("100");
  const [suffix, setSuffix] = useState("");
  const [targetKB, setTargetKB] = useState("");
  const [responsivePack, setResponsivePack] = useState(false);
  const [background, setBackground] = useState("#ffffff");
  const [canvasPadding, setCanvasPadding] = useState("0");
  const [preservedMetadata, setPreservedMetadata] = useState<PreservedMetadataField[]>([]);
  const [notice, setNotice] = useState("");
  const [dark, setDark] = useState(false);
  const [preview, setPreview] = useState<ImageItem | null>(null);
  const [cropEditor, setCropEditor] = useState<ImageItem | null>(null);
  const [snippetKind, setSnippetKind] = useState<SnippetKind>("picture");
  const [copied, setCopied] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ completed: number; total: number } | null>(null);
  const [watermarkText, setWatermarkText] = useState("");
  const [watermarkColor, setWatermarkColor] = useState("#ffffff");
  const [watermarkOpacity, setWatermarkOpacity] = useState(70);
  const [watermarkPosition, setWatermarkPosition] = useState<Watermark["position"]>("bottom-right");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [savedWorkflows, setSavedWorkflows] = useState<Record<string, SavedWorkflow>>({});
  const [workflowName, setWorkflowName] = useState("");
  const cancelled = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const itemRef = useRef<ImageItem[]>([]);
  useEffect(() => {
    itemRef.current = items;
  }, [items]);
  useEffect(
    () => () =>
      itemRef.current.forEach((item) => {
        URL.revokeObjectURL(item.sourceUrl);
        [item.result, ...(item.variants || [])].forEach(
          (result) => result && URL.revokeObjectURL(result.url),
        );
      }),
    [],
  );
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  useEffect(() => {
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.register("/sw.js");
  }, []);
  useEffect(() => {
    try {
      setSavedWorkflows(JSON.parse(localStorage.getItem(workflowStorageKey) || "{}"));
    } catch {
      localStorage.removeItem(workflowStorageKey);
    }
  }, []);
  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files || []).filter(
        (file) => file.type.startsWith("image/"),
      );
      if (files.length) addFiles(files);
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  });
  async function addFiles(files: FileList | File[]) {
    setNotice("");
    for (const file of Array.from(files)) {
      try {
        const metadata = await inspectMetadata(file).catch(() => []);
        const normalized = await normalizeImage(file);
        const dimensions = await validateImage(normalized);
        setItems((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            file: normalized,
            ...dimensions,
            metadata,
            sourceUrl: URL.createObjectURL(normalized),
            status: "ready",
          },
        ]);
      } catch (error) {
        setNotice(
          error instanceof Error ? error.message : "Could not read that image.",
        );
      }
    }
  }
  function remove(id: string) {
    setItems((current) =>
      current.filter((item) => {
        if (item.id === id) {
          URL.revokeObjectURL(item.sourceUrl);
          [item.result, ...(item.variants || [])].forEach(
            (result) => result && URL.revokeObjectURL(result.url),
          );
          return false;
        }
        return true;
      }),
    );
  }
  function clear() {
    items.forEach((item) => {
      URL.revokeObjectURL(item.sourceUrl);
      [item.result, ...(item.variants || [])].forEach(
        (result) => result && URL.revokeObjectURL(result.url),
      );
    });
    setItems([]);
  }
  function reorderItems(fromId: string, toId: string) {
    if (fromId === toId) return;
    setItems((current) => {
      const fromIndex = current.findIndex((item) => item.id === fromId);
      const toIndex = current.findIndex((item) => item.id === toId);
      if (fromIndex < 0 || toIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }
  function updateOverride(id: string, outputOverride: ImageItem["outputOverride"]) {
    setItems((current) => current.map((item) => {
      if (item.id !== id) return item;
      [item.result, ...(item.variants || [])].forEach((result) => result && URL.revokeObjectURL(result.url));
      return { ...item, outputOverride, progress: undefined, result: undefined, variants: undefined, status: "ready" };
    }));
  }
  function applyPreset(name: PresetName) {
    const preset = presets[name] as { format: OutputFormat; quality: number; width?: number; aspectRatio?: number };
    setFormat(preset.format);
    setQuality(preset.quality);
    setWidth(preset.width ? String(preset.width) : "");
    setHeight("");
    setScalePercent("");
    setTargetKB("");
    setFitMode(Boolean(preset.aspectRatio));
    setAspectRatio(preset.aspectRatio ? String(preset.aspectRatio) : "");
    setMaxHeight("");
  }
  function saveWorkflow() {
    const name = workflowName.trim();
    if (!name) { setNotice("Name this workflow before saving it."); return; }
    const workflow: SavedWorkflow = { format, quality, width, height, scalePercent, maxHeight, aspectRatio, fitMode, rotation, flipX, flipY, cropX, cropY, cropWidth, cropHeight, suffix, targetKB, responsivePack, background, canvasPadding, watermarkText, watermarkColor, watermarkOpacity, watermarkPosition };
    try {
      const next = { ...savedWorkflows, [name]: workflow };
      localStorage.setItem(workflowStorageKey, JSON.stringify(next));
      setSavedWorkflows(next);
      setNotice(`Saved “${name}” locally. Images and logo files are never included.`);
    } catch { setNotice("This browser could not save the workflow."); }
  }
  function loadWorkflow(name: string) {
    const workflow = savedWorkflows[name];
    if (!workflow) return;
    setFormat(workflow.format); setQuality(workflow.quality); setWidth(workflow.width); setHeight(workflow.height); setScalePercent(workflow.scalePercent); setMaxHeight(workflow.maxHeight); setAspectRatio(workflow.aspectRatio); setFitMode(workflow.fitMode); setRotation(workflow.rotation); setFlipX(workflow.flipX); setFlipY(workflow.flipY); setCropX(workflow.cropX); setCropY(workflow.cropY); setCropWidth(workflow.cropWidth); setCropHeight(workflow.cropHeight); setSuffix(workflow.suffix); setTargetKB(workflow.targetKB); setResponsivePack(workflow.responsivePack); setBackground(workflow.background); setCanvasPadding(workflow.canvasPadding || "0"); setWatermarkText(workflow.watermarkText); setWatermarkColor(workflow.watermarkColor); setWatermarkOpacity(workflow.watermarkOpacity); setWatermarkPosition(workflow.watermarkPosition); setLogoFile(null);
    if (logoInput.current) logoInput.current.value = "";
    setWorkflowName(name);
    setNotice(`Loaded “${name}”. Add a logo again if this workflow needs one.`);
  }
  async function oneOutput(
    item: ImageItem,
    outputWidth?: number,
    outputSuffix = "",
  ): Promise<ImageOutput> {
    const targetBytes = Number(targetKB) * 1024;
    const outputFormat = item.outputOverride?.format || format;
    const outputQuality = item.outputOverride?.quality ?? quality;
    const logo = logoFile ? await createImageBitmap(logoFile) : undefined;
    const watermark = watermarkText || logo ? { text: watermarkText || undefined, logo, color: watermarkColor, opacity: watermarkOpacity, position: watermarkPosition } : undefined;
    const options = {
      format: outputFormat,
      background,
      width: outputWidth || (width ? Number(width) : undefined),
      height: height ? Number(height) : undefined,
      scale: scalePercent ? Number(scalePercent) / 100 : undefined,
      canvasPadding: Number(canvasPadding) / 100,
      watermark,
    };
    const hasEdits = rotation !== 0 || flipX || flipY || cropX !== "0" || cropY !== "0" || cropWidth !== "100" || cropHeight !== "100";
    try {
    const result = fitMode || hasEdits
      ? await makeItFit(item.file, {
          format: outputFormat,
          background,
          quality: outputQuality,
          targetBytes: targetBytes || undefined,
          maxWidth: options.width,
          maxHeight: fitMode ? (maxHeight ? Number(maxHeight) : undefined) : options.height,
          scale: options.scale,
          canvasPadding: options.canvasPadding,
          watermark,
          aspectRatio: aspectRatio ? Number(aspectRatio) : undefined,
          rotation,
          flipX,
          flipY,
          crop: { x: Number(cropX) / 100, y: Number(cropY) / 100, width: Number(cropWidth) / 100, height: Number(cropHeight) / 100 },
        })
      : targetBytes
        ? await convertToTarget(item.file, { ...options, targetBytes })
        : {
            ...(await convertImage(item.file, { ...options, quality: outputQuality })),
            quality: outputQuality,
          };
    if (targetBytes && "reachedTarget" in result && !result.reachedTarget)
      setNotice(
        "One or more images could not reach the requested size at usable quality.",
      );
    const blob = outputFormat === "image/jpeg" ? await preserveJpegMetadata(result.blob, item.metadata || [], preservedMetadata) : result.blob;
    return {
      ...result,
      blob,
      url: URL.createObjectURL(blob),
      name: makeOutputName(item.file.name, outputFormat, `${suffix}${outputSuffix}`),
    };
    } finally { logo?.close(); }
  }
  async function processAll() {
    cancelled.current = false;
    const resizeWidth = width ? Number(width) : undefined;
    const resizeHeight = fitMode
      ? (maxHeight ? Number(maxHeight) : undefined)
      : (height ? Number(height) : undefined);
    if (
      resizeWidth &&
      (!Number.isInteger(resizeWidth) || resizeWidth < 1 || resizeWidth > 16000)
    ) {
      setNotice("Enter a width between 1 and 16,000 pixels.");
      return;
    }
    if (
      resizeHeight &&
      (!Number.isInteger(resizeHeight) ||
        resizeHeight < 1 ||
        resizeHeight > 16000)
    ) {
      setNotice("Enter a height between 1 and 16,000 pixels.");
      return;
    }
    if (
      scalePercent &&
      (!Number.isFinite(Number(scalePercent)) || Number(scalePercent) < 1 || Number(scalePercent) > 100)
    ) {
      setNotice("Resize percentage must be between 1 and 100.");
      return;
    }
    if (
      aspectRatio &&
      (!Number.isFinite(Number(aspectRatio)) ||
        Number(aspectRatio) < 0.1 ||
        Number(aspectRatio) > 10)
    ) {
      setNotice("Aspect ratio must be between 0.1 and 10.");
      return;
    }
    const cropValues = [Number(cropX), Number(cropY), Number(cropWidth), Number(cropHeight)];
    if (cropValues.some((value) => !Number.isFinite(value)) || cropValues[0] < 0 || cropValues[1] < 0 || cropValues[2] <= 0 || cropValues[3] <= 0 || cropValues[0] + cropValues[2] > 100 || cropValues[1] + cropValues[3] > 100) {
      setNotice("Crop values must stay within the image bounds.");
      return;
    }
    if (
      targetKB &&
      (!Number.isInteger(Number(targetKB)) || Number(targetKB) < 10)
    ) {
      setNotice("Target size must be at least 10 KB.");
      return;
    }
    if (!Number.isFinite(Number(canvasPadding)) || Number(canvasPadding) < 0 || Number(canvasPadding) > 40) {
      setNotice("Canvas padding must be between 0 and 40%.");
      return;
    }
    const queuedItems = items.filter(
      (entry) =>
        entry.status === "ready" ||
        entry.status === "failed" ||
        entry.status === "cancelled",
    );
    setBatchProgress({ completed: 0, total: queuedItems.length });
    for (const item of queuedItems) {
      if (cancelled.current) {
        setItems((current) =>
          current.map((entry) =>
            entry.status === "ready"
              ? { ...entry, status: "cancelled" }
              : entry,
          ),
        );
        break;
      }
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, status: "processing", error: undefined, progress: { completed: 0, total: responsivePack ? responsive.length : 1 } }
            : entry,
        ),
      );
      try {
        const variants: ImageOutput[] = [];
        if (responsivePack) {
          for (const [index, size] of responsive.entries()) {
            variants.push(await oneOutput(item, Math.min(size.width, resizeWidth || size.width), size.suffix));
            setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, progress: { completed: index + 1, total: responsive.length } } : entry));
          }
        }
        const result = responsivePack ? variants[variants.length - 1] : await oneOutput(item);
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  status: "complete",
                  result,
                  variants: responsivePack ? variants : undefined,
                }
              : entry,
          ),
        );
        setBatchProgress((current) => current ? { ...current, completed: current.completed + 1 } : current);
      } catch (error) {
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  status: "failed",
                  error:
                    error instanceof Error
                      ? error.message
                      : "Conversion failed.",
                }
              : entry,
          ),
        );
        setBatchProgress((current) => current ? { ...current, completed: current.completed + 1 } : current);
      }
    }
  }
  function cancel() {
    cancelled.current = true;
    setNotice("Remaining conversions cancelled.");
  }
  async function downloadAll() {
    const outputs = items.flatMap((item) =>
      (item.variants?.length
        ? item.variants
        : item.result
          ? [item.result]
          : []
      ).map((result) => ({ item, result })),
    );
    if (outputs.length === 1)
      return download(outputs[0].result.blob, outputs[0].result.name);
    const zip = new JSZip();
    outputs.forEach(({ item, result }) =>
      zip.file(pathFor(item, result.name), result.blob),
    );
    download(
      await zip.generateAsync({ type: "blob" }),
      "image-convertor-results.zip",
    );
  }
  async function downloadContactSheet() {
    const outputs = items.flatMap((item) => item.variants?.length ? item.variants : item.result ? [item.result] : []);
    if (!outputs.length) return;
    const columns = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(outputs.length))));
    const tileWidth = 280;
    const tileHeight = 220;
    const labelHeight = 28;
    const padding = 18;
    const rows = Math.ceil(outputs.length / columns);
    const canvas = document.createElement("canvas");
    canvas.width = columns * tileWidth + (columns + 1) * padding;
    canvas.height = rows * (tileHeight + labelHeight) + (rows + 1) * padding;
    const context = canvas.getContext("2d");
    if (!context) { setNotice("Canvas is not available in this browser."); return; }
    context.fillStyle = "#f4f2ed";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = "12px ui-monospace, monospace";
    context.fillStyle = "#202a1d";
    for (const [index, output] of outputs.entries()) {
      const bitmap = await createImageBitmap(output.blob);
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = padding + column * (tileWidth + padding);
      const y = padding + row * (tileHeight + labelHeight + padding);
      const scale = Math.min(tileWidth / bitmap.width, tileHeight / bitmap.height);
      const width = Math.round(bitmap.width * scale);
      const height = Math.round(bitmap.height * scale);
      context.fillStyle = "#ffffff";
      context.fillRect(x, y, tileWidth, tileHeight);
      context.drawImage(bitmap, x + (tileWidth - width) / 2, y + (tileHeight - height) / 2, width, height);
      bitmap.close();
      context.fillStyle = "#202a1d";
      context.fillText(output.name.slice(0, 35), x, y + tileHeight + 18);
    }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) { setNotice("The browser could not create the contact sheet."); return; }
    download(blob, "image-convertor-contact-sheet.png");
  }
  async function downloadPdf() {
    const outputs = items.flatMap((item) => item.variants?.length ? item.variants : item.result ? [item.result] : []);
    if (!outputs.length) return;
    const { PDFDocument } = await import("pdf-lib");
    const pdfDocument = await PDFDocument.create();
    for (const output of outputs) {
      const bitmap = await createImageBitmap(output.blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) { bitmap.close(); setNotice("Canvas is not available in this browser."); return; }
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
      const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!png) { setNotice("The browser could not prepare an image for PDF export."); return; }
      const image = await pdfDocument.embedPng(await png.arrayBuffer());
      const scale = Math.min(1, 595 / image.width, 842 / image.height);
      const page = pdfDocument.addPage([image.width * scale, image.height * scale]);
      page.drawImage(image, { x: 0, y: 0, width: image.width * scale, height: image.height * scale });
    }
    const pdfBytes = await pdfDocument.save();
    const pdfBuffer = new Uint8Array(pdfBytes.length);
    pdfBuffer.set(pdfBytes);
    download(new Blob([pdfBuffer.buffer], { type: "application/pdf" }), "image-convertor-images.pdf");
  }
  const completed = items.filter((item) => item.status === "complete");
  const qualityRecommendation = items.length ? recommendImageSettings({ name: items[0].file.name, type: items[0].file.type, width: items[0].width, height: items[0].height }) : null;
  const exportedFiles = completed.flatMap((item) => item.variants?.length ? item.variants : item.result ? [item.result] : []);
  const exportedBytes = exportedFiles.reduce((total, output) => total + output.blob.size, 0);
  const responsiveOutput = completed.find((item) => item.variants?.length)?.variants || [];
  const code = responsiveSnippet(responsiveOutput, snippetKind, "Describe this image");
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setNotice("Copy is unavailable in this browser. Select the code manually.");
    }
  }
  const onFiles = (event: ChangeEvent<HTMLInputElement>) =>
    event.target.files && addFiles(event.target.files);
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  };
  return (
    <main>
      <nav>
        <a className="brand" href="#top">
          IMAGE<span>CONVERTOR</span>
        </a>
        <div className="nav-links">
          <a href="#workspace">Convert</a>
          <a href="/privacy">Privacy</a>
          <a href="/about">About</a>
          <button
            className="theme"
            aria-label="Toggle dark mode"
            onClick={() => setDark((value) => !value)}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </nav>
      <section className="hero" id="top">
        <p className="eyebrow">
          <ShieldCheck size={15} /> LOCAL-ONLY PROCESSING
        </p>
        <h1>
          Your images.
          <br />
          <em>Your formats.</em>
          <br />
          Your privacy.
        </h1>
        <p className="lede">
          Convert, compress, and resize images in your browser. Nothing gets
          uploaded to a server.
        </p>
        <a className="button" href="#workspace">
          Convert images <span>↓</span>
        </a>
        <p className="privacy-line">No account · No uploads · No tracking</p>
      </section>
      <section className="workspace" id="workspace">
        <div className="workspace-head">
          <div>
            <p className="eyebrow">WORKSPACE</p>
            <h2>Make your images lighter.</h2>
          </div>
          {items.length > 0 && (
            <button className="text-button" onClick={clear}>
              Clear queue
            </button>
          )}
        </div>
        <div className="columns">
          <div>
            <div
              className="dropzone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDrop}
              onClick={() => fileInput.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(event) =>
                event.key === "Enter" && fileInput.current?.click()
              }
            >
              <ImagePlus size={28} />
              <strong>Drop images here</strong>
              <span>or click to choose files</span>
              <small>JPG, PNG, WebP, AVIF, GIF, BMP, TIFF, JPEG XL, SVG, HEIC · up to 25 MB each</small>
              <input
                ref={fileInput}
                onChange={onFiles}
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/bmp,image/tiff,image/jxl,image/svg+xml,image/heic,image/heif,.bmp,.tif,.tiff,.jxl,.heic,.heif"
                multiple
                type="file"
              />
              <input
                ref={folderInput}
                onChange={onFiles}
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/bmp,image/tiff,image/jxl,image/svg+xml,image/heic,image/heif,.bmp,.tif,.tiff,.jxl,.heic,.heif"
                multiple
                type="file"
                webkitdirectory=""
              />
            </div>
            <button
              className="folder-button"
              onClick={() => folderInput.current?.click()}
            >
              Choose folder · keep ZIP structure
            </button>
            {notice && <p className="notice">{notice}</p>}
            {batchProgress && (
              <div className="batch-progress" role="status" aria-live="polite">
                <div>
                  <span>Batch progress</span>
                  <strong>{batchProgress.completed} of {batchProgress.total} images processed</strong>
                </div>
                <progress aria-label="Batch progress" value={batchProgress.completed} max={batchProgress.total} />
              </div>
            )}
            <div className="queue">
              {items.map((item) => (
                <article
                  className={`queue-item${draggedId === item.id ? " is-dragging" : ""}`}
                  key={item.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (draggedId) reorderItems(draggedId, item.id);
                    setDraggedId(null);
                  }}
                >
                  <button
                    className="drag-handle"
                    draggable
                    aria-label={`Drag to reorder ${item.file.name}`}
                    title="Drag to reorder"
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      setDraggedId(item.id);
                    }}
                    onDragEnd={() => setDraggedId(null)}
                  >
                    <GripVertical size={18} />
                  </button>
                  <button
                    className="thumbnail"
                    aria-label={`Preview ${item.file.name}`}
                    onClick={() => setPreview(item)}
                  >
                    <img src={item.result?.url || item.sourceUrl} alt="" />
                  </button>
                  <button className="crop-button" onClick={() => setCropEditor(item)}>
                    Edit crop
                  </button>
                  <div className="file-info">
                    <strong>{item.file.name}</strong>
                    <span>
                      {formatBytes(item.file.size)}{" "}
                      {item.result &&
                        `→ ${item.result.width} × ${item.result.height}px · ${formatBytes(item.result.blob.size)} · ${savingsPercent(item.file.size, item.result.blob.size)}% saved`}
                      {item.variants && ` · ${item.variants.length} variants`}
                    </span>
                    <details className="file-override">
                      <summary>{item.outputOverride ? "Custom output settings" : "Override output settings"}</summary>
                      <label>
                        Format
                        <select
                          aria-label={`Output format for ${item.file.name}`}
                          value={item.outputOverride?.format || ""}
                          onChange={(event) => { const next = { ...item.outputOverride, format: event.target.value ? event.target.value as OutputFormat : undefined }; updateOverride(item.id, next.format || next.quality !== undefined ? next : undefined); }}
                        >
                          <option value="">Batch default ({formatLabel(format)})</option>
                          {formats.map((value) => <option value={value} key={value}>{formatLabel(value)}</option>)}
                        </select>
                      </label>
                      <label>
                        Quality {item.outputOverride?.quality ?? quality}
                        <input
                          aria-label={`Output quality for ${item.file.name}`}
                          type="range"
                          min="1"
                          max="100"
                          value={item.outputOverride?.quality ?? quality}
                          onChange={(event) => updateOverride(item.id, { ...item.outputOverride, quality: Number(event.target.value) })}
                        />
                      </label>
                      {item.outputOverride && <button className="text-button" onClick={() => updateOverride(item.id, undefined)}>Use batch defaults</button>}
                    </details>
                    {item.error && (
                      <small className="error">{item.error}</small>
                    )}
                    {item.status === "processing" && (
                      <small className="item-progress">
                        {item.progress && item.progress.total > 1
                          ? `Creating responsive export ${item.progress.completed + 1} of ${item.progress.total}`
                          : "Converting image…"}
                      </small>
                    )}
                    <details className="metadata-summary">
                      <summary>
                        {item.metadata?.length
                          ? `${item.metadata.length} metadata field${item.metadata.length === 1 ? "" : "s"} found`
                          : "No readable metadata found"}
                      </summary>
                      {item.metadata?.length ? (
                        <ul>
                          {item.metadata.map((entry) => (
                            <li key={entry.label}>
                              <strong>{entry.label}:</strong> {entry.value}
                              {entry.sensitive ? " · removed on export" : ""}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>Every converted output is also metadata-free.</p>
                      )}
                    </details>
                  </div>
                  <div className="item-actions">
                    {item.status === "processing" && (
                      <LoaderCircle className="spin" size={18} />
                    )}{" "}
                    {item.result && (
                      <button
                        aria-label={`Download ${item.result.name}`}
                        onClick={() =>
                          download(item.result!.blob, item.result!.name)
                        }
                      >
                        <Download size={17} />
                      </button>
                    )}
                    <button
                      aria-label={`Remove ${item.file.name}`}
                      onClick={() => remove(item.id)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <aside className="controls">
            <p className="eyebrow">OUTPUT</p>
            <label>
              Output preset
              <select
                aria-label="Output preset"
                defaultValue="custom"
                onChange={(event) =>
                  applyPreset(event.target.value as PresetName)
                }
              >
                {Object.entries(presets).map(([name, preset]) => (
                  <option key={name} value={name}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Format
              <select
                value={format}
                onChange={(event) =>
                  setFormat(event.target.value as OutputFormat)
                }
              >
                {formats.map((value) => (
                  <option value={value} key={value}>
                    {formatLabel(value)}
                  </option>
                ))}
              </select>
            </label>
            {qualityRecommendation && (
              <div className="quality-recommendation">
                <strong>{qualityRecommendation.label}</strong>
                <span>{qualityRecommendation.reason}</span>
                <button className="text-button" type="button" onClick={() => { setFormat(qualityRecommendation.format); setQuality(qualityRecommendation.quality); setTargetKB(""); }}>Use {formatLabel(qualityRecommendation.format)} · {qualityRecommendation.quality}</button>
              </div>
            )}
            <label>
              Quality <b>{quality}</b>
              <input
                aria-label="Quality"
                type="range"
                min="1"
                max="100"
                value={quality}
                onChange={(event) => {
                  setQuality(Number(event.target.value));
                  setTargetKB("");
                }}
              />
            </label>
            <label>
              Target size (optional)
              <input
                aria-label="Target size in KB"
                type="number"
                min="10"
                placeholder="e.g. 100 KB"
                value={targetKB}
                onChange={(event) => setTargetKB(event.target.value)}
              />
              <small>Finds the highest usable quality under this size.</small>
            </label>
            <label>
              Resize width
              <input
                type="number"
                min="1"
                max="16000"
                placeholder="Keep original"
                value={width}
                onChange={(event) => { setWidth(event.target.value); setHeight(""); setScalePercent(""); }}
              />
              <small>Aspect ratio stays locked.</small>
            </label>
            {!fitMode && (
              <>
                <label>
                  Resize height
                  <input
                    aria-label="Resize height"
                    type="number"
                    min="1"
                    max="16000"
                    placeholder="Keep original"
                    value={height}
                    onChange={(event) => { setHeight(event.target.value); setWidth(""); setScalePercent(""); }}
                  />
                  <small>Sets height and preserves aspect ratio.</small>
                </label>
                <label>
                  Resize percentage
                  <input
                    aria-label="Resize percentage"
                    type="number"
                    min="1"
                    max="100"
                    placeholder="e.g. 50"
                    value={scalePercent}
                    onChange={(event) => { setScalePercent(event.target.value); setWidth(""); setHeight(""); }}
                  />
                  <small>Scales both dimensions equally.</small>
                </label>
              </>
            )}
            <label className="check">
              <input
                aria-label="Enable make it fit"
                type="checkbox"
                checked={fitMode}
                onChange={(event) => setFitMode(event.target.checked)}
              />
              Make it fit
            </label>
            {fitMode && (
              <>
                <label>
                  Maximum height
                  <input
                    aria-label="Maximum height"
                    type="number"
                    min="1"
                    max="16000"
                    placeholder="No height limit"
                    value={maxHeight}
                    onChange={(event) => setMaxHeight(event.target.value)}
                  />
                </label>
                <label>
                  Crop ratio
                  <select
                    aria-label="Crop ratio"
                    value={aspectRatio}
                    onChange={(event) => setAspectRatio(event.target.value)}
                  >
                    <option value="">Keep original ratio</option>
                    <option value="1">Square · 1:1</option>
                    <option value="1.333333">Landscape · 4:3</option>
                    <option value="1.777778">Widescreen · 16:9</option>
                    <option value="0.8">Portrait · 4:5</option>
                    <option value="0.5625">Story · 9:16</option>
                  </select>
                  <small>Uses a centre crop when needed.</small>
                </label>
              </>
            )}
            <label>
              Rotate
              <select
                aria-label="Rotate image"
                value={rotation}
                onChange={(event) => setRotation(Number(event.target.value) as 0 | 90 | 180 | 270)}
              >
                <option value="0">No rotation</option>
                <option value="90">90° clockwise</option>
                <option value="180">180°</option>
                <option value="270">90° counter-clockwise</option>
              </select>
            </label>
            <label className="check">
              <input aria-label="Flip image horizontally" type="checkbox" checked={flipX} onChange={(event) => setFlipX(event.target.checked)} />
              Flip horizontally
            </label>
            <label className="check">
              <input aria-label="Flip image vertically" type="checkbox" checked={flipY} onChange={(event) => setFlipY(event.target.checked)} />
              Flip vertically
            </label>
            <fieldset className="crop-fields">
              <legend>Freeform crop (%)</legend>
              <label>Left<input aria-label="Crop left percentage" type="number" min="0" max="99" value={cropX} onChange={(event) => setCropX(event.target.value)} /></label>
              <label>Top<input aria-label="Crop top percentage" type="number" min="0" max="99" value={cropY} onChange={(event) => setCropY(event.target.value)} /></label>
              <label>Width<input aria-label="Crop width percentage" type="number" min="1" max="100" value={cropWidth} onChange={(event) => setCropWidth(event.target.value)} /></label>
              <label>Height<input aria-label="Crop height percentage" type="number" min="1" max="100" value={cropHeight} onChange={(event) => setCropHeight(event.target.value)} /></label>
            </fieldset>
            <label>
              Filename suffix
              <input
                aria-label="Filename suffix"
                placeholder="e.g. -optimized"
                value={suffix}
                onChange={(event) => setSuffix(event.target.value)}
              />
            </label>
            <label className="check">
              <input
                aria-label="Generate responsive image pack"
                type="checkbox"
                checked={responsivePack}
                onChange={(event) => setResponsivePack(event.target.checked)}
              />{" "}
              Generate -sm, -md, -lg pack
            </label>
            <fieldset className="creator-tools">
              <legend>Watermark</legend>
              <label>
                Text
                <input aria-label="Watermark text" placeholder="e.g. © Your Studio" value={watermarkText} onChange={(event) => setWatermarkText(event.target.value)} />
              </label>
              <label>
                Logo (optional)
                <input ref={logoInput} aria-label="Watermark logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => setLogoFile(event.target.files?.[0] || null)} />
                <small>{logoFile ? `${logoFile.name} · used for this session only` : "Kept only in memory; never saved with workflows."}</small>
              </label>
              <div className="creator-pair">
                <label>
                  Position
                  <select aria-label="Watermark position" value={watermarkPosition} onChange={(event) => setWatermarkPosition(event.target.value as Watermark["position"])}>
                    <option value="bottom-right">Bottom right</option>
                    <option value="bottom-left">Bottom left</option>
                    <option value="top-right">Top right</option>
                    <option value="top-left">Top left</option>
                  </select>
                </label>
                <label>
                  Colour
                  <input aria-label="Watermark colour" type="color" value={watermarkColor} onChange={(event) => setWatermarkColor(event.target.value)} />
                </label>
              </div>
              <label>
                Opacity <b>{watermarkOpacity}%</b>
                <input aria-label="Watermark opacity" type="range" min="10" max="100" value={watermarkOpacity} onChange={(event) => setWatermarkOpacity(Number(event.target.value))} />
              </label>
            </fieldset>
            <fieldset className="creator-tools">
              <legend>Canvas framing</legend>
              <label>
                Background colour
                <input aria-label="Canvas background colour" type="color" value={background} onChange={(event) => setBackground(event.target.value)} />
              </label>
              <label>
                Canvas padding
                <select aria-label="Canvas padding" value={canvasPadding} onChange={(event) => setCanvasPadding(event.target.value)}>
                  <option value="0">None</option>
                  <option value="5">Breathing room · 5%</option>
                  <option value="10">Product frame · 10%</option>
                  <option value="20">Generous border · 20%</option>
                </select>
                <small>Applies an even border around the image. JPEG also uses this colour for transparency.</small>
              </label>
            </fieldset>
            <fieldset className="creator-tools">
              <legend>Metadata on JPEG export</legend>
              {(["Captured", "Author", "Copyright"] as PreservedMetadataField[]).map((field) => (
                <label className="check" key={field}>
                  <input aria-label={`Preserve ${field} metadata`} type="checkbox" checked={preservedMetadata.includes(field)} onChange={(event) => setPreservedMetadata((current) => event.target.checked ? [...current, field] : current.filter((entry) => entry !== field))} />
                  Preserve {field.toLowerCase()}
                </label>
              ))}
              <small>Only selected JPEG EXIF fields are written. GPS, camera, software, and all metadata in non-JPEG exports stay removed.</small>
            </fieldset>
            <fieldset className="creator-tools">
              <legend>Saved local workflows</legend>
              <label>
                Workflow name
                <input aria-label="Workflow name" placeholder="e.g. Etsy product" value={workflowName} onChange={(event) => setWorkflowName(event.target.value)} />
              </label>
              <button className="text-button workflow-save" type="button" onClick={saveWorkflow}>Save settings on this device</button>
              {Object.keys(savedWorkflows).length > 0 && (
                <label>
                  Load saved settings
                  <select aria-label="Load saved workflow" value="" onChange={(event) => { if (event.target.value) loadWorkflow(event.target.value); }}>
                    <option value="">Choose a workflow</option>
                    {Object.keys(savedWorkflows).sort().map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </label>
              )}
              <small>Only conversion settings are saved locally. Images and logo files are excluded.</small>
            </fieldset>
            <p className="metadata-note">Metadata and GPS data are removed from every output unless selected safe fields are explicitly kept in a JPEG export.</p>
            <button
              className="button process"
              disabled={
                !items.some(
                  (item) =>
                    item.status === "ready" ||
                    item.status === "failed" ||
                    item.status === "cancelled",
                )
              }
              onClick={processAll}
            >
              {items.some((item) => item.status === "processing")
                ? "Processing…"
                : "Convert images"}
            </button>
            {items.some((item) => item.status === "processing") && (
              <button className="text-button" onClick={cancel}>
                Cancel remaining
              </button>
            )}
            {completed.length > 0 && (
              <p className="export-summary"><strong>Export summary</strong> {exportedFiles.length} {exportedFiles.length === 1 ? "file" : "files"} · {formatBytes(exportedBytes)} total · {completed.length} {completed.length === 1 ? "image" : "images"} processed</p>
            )}
            {completed.length > 0 && (
              <button className="download-all" onClick={downloadAll}>
                <Download size={17} /> Download{" "}
                {completed.length > 1 || responsivePack
                  ? "all as ZIP"
                  : "result"}
              </button>
            )}
            {exportedFiles.length > 0 && (
              <button className="text-button contact-sheet" onClick={downloadContactSheet}>
                Download contact sheet
              </button>
            )}
            {exportedFiles.length > 0 && (
              <button className="text-button contact-sheet" onClick={downloadPdf}>
                Export images as PDF
              </button>
            )}
            {responsiveOutput.length > 1 && (
              <div className="code-export">
                <label>
                  Responsive code
                  <select
                    aria-label="Responsive code format"
                    value={snippetKind}
                    onChange={(event) => setSnippetKind(event.target.value as SnippetKind)}
                  >
                    <option value="picture">HTML image</option>
                    <option value="srcset">srcset only</option>
                    <option value="next">Next.js Image</option>
                  </select>
                </label>
                <pre aria-label="Responsive image code"><code>{code}</code></pre>
                <button className="download-all" onClick={copyCode}>
                  {copied ? "Copied" : "Copy code"}
                </button>
                <small>Move the ZIP files into your site&apos;s public/images folder first.</small>
              </div>
            )}
          </aside>
        </div>
      </section>
      <PdfTools />
      <section className="promise" id="privacy">
        <FileImage size={25} />
        <div>
          <p className="eyebrow">PRIVACY, BY DESIGN</p>
          <h2>Your files never leave your device.</h2>
          <p>
            Every output is re-encoded locally, removing embedded metadata and
            GPS information before download.
          </p>
        </div>
      </section>
      <footer id="about">
        <span>© {new Date().getFullYear()} Image Convertor</span>
        <span>Built for a lighter, more private web.</span>
      </footer>
      {preview && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-label="Image comparison"
          onClick={() => setPreview(null)}
        >
          <div
            className="modal-content"
            onClick={(event) => event.stopPropagation()}
          >
            <button aria-label="Close preview" onClick={() => setPreview(null)}>
              <X size={20} />
            </button>
            <Comparison item={preview} />
          </div>
        </div>
      )}
      {cropEditor && (
        <CropEditor
          item={cropEditor}
          crop={{ x: Number(cropX), y: Number(cropY), width: Number(cropWidth), height: Number(cropHeight) }}
          onApply={(crop) => { setCropX(String(Math.round(crop.x))); setCropY(String(Math.round(crop.y))); setCropWidth(String(Math.round(crop.width))); setCropHeight(String(Math.round(crop.height))); }}
          onClose={() => setCropEditor(null)}
        />
      )}
    </main>
  );
}
