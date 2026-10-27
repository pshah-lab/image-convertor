import type { OutputFormat } from "@/types/image";
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_PIXELS = 40_000_000;
export const inputTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
  "image/heic",
  "image/heif",
  "image/bmp",
  "image/tiff",
  "image/jxl",
];
export const formatLabel = (format: OutputFormat) =>
  format.replace("image/", "").toUpperCase();
export const extensionFor = (format: OutputFormat) =>
  format === "image/jpeg" ? "jpg" : format.replace("image/", "");
export const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
export const savingsPercent = (original: number, output: number) =>
  original > 0 ? Math.round(((original - output) / original) * 1000) / 10 : 0;
export type QualityRecommendation = { format: OutputFormat; quality: number; label: string; reason: string };
export function recommendImageSettings(input: { name: string; type: string; width?: number; height?: number }): QualityRecommendation {
  const name = input.name.toLowerCase();
  const isGraphic = input.type === "image/svg+xml" || /logo|icon|illustration|diagram|screenshot|ui/.test(name);
  if (input.type === "image/svg+xml" || isGraphic)
    return { format: "image/png", quality: 100, label: "Keep sharp graphics", reason: "PNG protects hard edges, text, and transparent artwork." };
  if ((input.width || 0) * (input.height || 0) > 8_000_000)
    return { format: "image/webp", quality: 78, label: "Optimise a large photo", reason: "WebP at 78 usually cuts large photo uploads substantially with subtle visual change." };
  return { format: "image/webp", quality: 82, label: "Balanced web photo", reason: "WebP at 82 is a reliable balance of visual quality and page weight." };
}
type Preset = { label: string; width?: number; format: OutputFormat; quality: number; aspectRatio?: number };
export const presets = {
  custom: {
    label: "Custom",
    width: undefined,
    format: "image/webp" as OutputFormat,
    quality: 82,
  },
  "next-hero": {
    label: "Next.js hero",
    width: 1920,
    format: "image/webp" as OutputFormat,
    quality: 80,
  },
  shopify: {
    label: "Shopify product",
    width: 2048,
    format: "image/webp" as OutputFormat,
    quality: 82,
  },
  wordpress: {
    label: "WordPress upload",
    width: 1600,
    format: "image/webp" as OutputFormat,
    quality: 80,
  },
  whatsapp: {
    label: "WhatsApp share",
    width: 1600,
    format: "image/jpeg" as OutputFormat,
    quality: 78,
  },
  email: {
    label: "Email attachment",
    width: 1200,
    format: "image/jpeg" as OutputFormat,
    quality: 72,
  },
  "instagram-post": { label: "Instagram post", width: 1080, format: "image/jpeg" as OutputFormat, quality: 88, aspectRatio: 1 },
  "instagram-story": { label: "Instagram story", width: 1080, format: "image/jpeg" as OutputFormat, quality: 88, aspectRatio: 0.5625 },
  "instagram-reel": { label: "Instagram reel cover", width: 1080, format: "image/jpeg" as OutputFormat, quality: 88, aspectRatio: 0.5625 },
  linkedin: { label: "LinkedIn post", width: 1200, format: "image/jpeg" as OutputFormat, quality: 86, aspectRatio: 1.91 },
  "youtube-thumbnail": { label: "YouTube thumbnail", width: 1280, format: "image/jpeg" as OutputFormat, quality: 88, aspectRatio: 1.777778 },
  amazon: { label: "Amazon listing", width: 2000, format: "image/jpeg" as OutputFormat, quality: 88, aspectRatio: 1 },
  etsy: { label: "Etsy listing", width: 2000, format: "image/jpeg" as OutputFormat, quality: 88, aspectRatio: 1 },
  ebay: { label: "eBay listing", width: 1600, format: "image/jpeg" as OutputFormat, quality: 86, aspectRatio: 1 },
  "shopify-collection": { label: "Shopify collection", width: 2048, format: "image/webp" as OutputFormat, quality: 82, aspectRatio: 1 },
} satisfies Record<string, Preset>;
export type PresetName = keyof typeof presets;
export function makeOutputName(
  name: string,
  format: OutputFormat,
  suffix = "",
) {
  const base = name.replace(/\.[^.]+$/, "") || "image";
  return `${base}${suffix}.${extensionFor(format)}`;
}
export function isHeic(file: File) {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.(heic|heif)$/i.test(file.name)
  );
}
export function isTiff(file: File) { return file.type === "image/tiff" || /\.tiff?$/i.test(file.name); }
export function isJxl(file: File) { return file.type === "image/jxl" || /\.jxl$/i.test(file.name); }
async function fileFromImageData(imageData: ImageData, name: string) {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available in this browser.");
  context.putImageData(imageData, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("The browser could not prepare this image.");
  return new File([blob], name.replace(/\.[^.]+$/, ".png"), { type: "image/png" });
}
export async function normalizeImage(file: File): Promise<File> {
  if (isHeic(file)) {
    const { heicTo } = await import("heic-to/csp");
    const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.95 });
    return new File([blob], file.name, { type: "image/jpeg" });
  }
  if (isTiff(file)) {
    const module = await import("utif");
    const UTIF = "default" in module ? module.default : module;
    const buffer = await file.arrayBuffer();
    const ifd = UTIF.decode(buffer)[0];
    UTIF.decodeImage(buffer, ifd);
    return fileFromImageData(new ImageData(new Uint8ClampedArray(UTIF.toRGBA8(ifd)), ifd.width, ifd.height), file.name);
  }
  if (isJxl(file)) {
    const { default: decode } = await import("@jsquash/jxl/decode");
    return fileFromImageData(await decode(await file.arrayBuffer()), file.name);
  }
  return file;
}
export async function validateImage(file: File): Promise<{ width: number; height: number }> {
  if (!inputTypes.includes(file.type) && !isHeic(file) && !isTiff(file) && !isJxl(file))
    throw new Error(
      "Choose a JPEG, PNG, WebP, AVIF, SVG, GIF, BMP, TIFF, JPEG XL, HEIC, or HEIF image.",
    );
  if (file.size > MAX_FILE_BYTES)
    throw new Error("Images must be 25 MB or smaller.");
  if (file.type === "image/svg+xml") {
    const svg = await file.text();
    if (/<script|\son\w+\s*=|https?:|\/\//i.test(svg))
      throw new Error(
        "SVG files must be self-contained and cannot include scripts or external URLs.",
      );
  }
  const bitmap = await createImageBitmap(file);
  const pixels = bitmap.width * bitmap.height;
  const dimensions = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  if (pixels > MAX_PIXELS)
    throw new Error(
      "This image has too many pixels to safely process in the browser.",
    );
  return dimensions;
}
export function supportsFormat(format: OutputFormat) {
  const canvas = document.createElement("canvas");
  return canvas.toDataURL(format).startsWith(`data:${format}`);
}
export type Watermark = { text?: string; logo?: ImageBitmap; color: string; opacity: number; position: "top-left" | "top-right" | "bottom-left" | "bottom-right" };
function drawWatermark(context: CanvasRenderingContext2D, width: number, height: number, watermark?: Watermark) {
  if (!watermark || (!watermark.text && !watermark.logo)) return;
  const padding = Math.max(12, Math.round(Math.min(width, height) * 0.035));
  const isBottom = watermark.position.startsWith("bottom");
  const isRight = watermark.position.endsWith("right");
  const fontSize = Math.max(12, Math.round(Math.min(width, height) * 0.045));
  const gap = Math.max(6, Math.round(fontSize * 0.35));
  let logoWidth = 0;
  let logoHeight = 0;
  if (watermark.logo) {
    const scale = Math.min((width * 0.18) / watermark.logo.width, (height * 0.18) / watermark.logo.height, 1);
    logoWidth = Math.round(watermark.logo.width * scale);
    logoHeight = Math.round(watermark.logo.height * scale);
  }
  context.save();
  context.globalAlpha = Math.max(0.1, Math.min(1, watermark.opacity / 100));
  context.fillStyle = watermark.color;
  context.font = `700 ${fontSize}px system-ui, sans-serif`;
  context.textBaseline = "alphabetic";
  const textWidth = watermark.text ? context.measureText(watermark.text).width : 0;
  const totalHeight = logoHeight + (logoHeight && watermark.text ? gap : 0) + (watermark.text ? fontSize : 0);
  let y = isBottom ? height - padding - totalHeight : padding;
  if (watermark.logo) {
    const x = isRight ? width - padding - logoWidth : padding;
    context.drawImage(watermark.logo, x, y, logoWidth, logoHeight);
    y += logoHeight + (watermark.text ? gap : 0);
  }
  if (watermark.text) {
    const x = isRight ? width - padding - textWidth : padding;
    context.fillText(watermark.text, x, y + fontSize);
  }
  context.restore();
}
export type ConversionOptions = { format: OutputFormat; quality: number; width?: number; height?: number; scale?: number; background: string; canvasPadding?: number; watermark?: Watermark };
export async function convertImage(
  file: File,
  options: ConversionOptions,
): Promise<{ blob: Blob; width: number; height: number }> {
  if (!supportsFormat(options.format))
    throw new Error(
      `${formatLabel(options.format)} output is not available in this browser.`,
    );
  const bitmap = await createImageBitmap(file);
  const ratio = bitmap.width / bitmap.height;
  const baseWidth = Math.max(1, Math.round(bitmap.width * (options.scale || 1)));
  const baseHeight = Math.max(1, Math.round(bitmap.height * (options.scale || 1)));
  const width = Math.max(
    1,
    Math.round(
      options.width || (options.height ? options.height * ratio : baseWidth),
    ),
  );
  const height = Math.max(
    1,
    Math.round(
      options.height || (options.width ? options.width / ratio : baseHeight),
    ),
  );
  const padding = Math.max(0, Math.min(0.4, options.canvasPadding || 0));
  const canvasWidth = Math.round(width * (1 + padding * 2));
  const canvasHeight = Math.round(height * (1 + padding * 2));
  if (canvasWidth * canvasHeight > MAX_PIXELS) {
    bitmap.close();
    throw new Error("Selected dimensions are too large to process safely.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Canvas is not available in this browser.");
  }
  if (options.format === "image/jpeg" || padding > 0) {
    context.fillStyle = options.background;
    context.fillRect(0, 0, canvasWidth, canvasHeight);
  }
  context.drawImage(bitmap, (canvasWidth - width) / 2, (canvasHeight - height) / 2, width, height);
  drawWatermark(context, canvasWidth, canvasHeight, options.watermark);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, options.format, options.quality / 100),
  );
  if (!blob) throw new Error("The browser could not encode this image.");
  return { blob, width: canvasWidth, height: canvasHeight };
}
export async function convertToTarget(
  file: File,
  options: {
    format: OutputFormat;
    targetBytes: number;
    width?: number;
    height?: number;
    scale?: number;
    background: string;
    canvasPadding?: number;
    watermark?: Watermark;
  },
) {
  if (options.format === "image/png")
    throw new Error("Target size mode requires JPEG, WebP, or AVIF.");
  let low = 10;
  let high = 95;
  let best:
    | { blob: Blob; width: number; height: number; quality: number }
    | undefined;
  for (let attempt = 0; attempt < 7 && low <= high; attempt += 1) {
    const quality = Math.round((low + high) / 2);
    const output = await convertImage(file, { ...options, quality });
    if (output.blob.size <= options.targetBytes) {
      best = { ...output, quality };
      low = quality + 1;
    } else {
      high = quality - 1;
    }
  }
  if (!best) {
    const output = await convertImage(file, { ...options, quality: 10 });
    return { ...output, quality: 10, reachedTarget: false };
  }
  return { ...best, reachedTarget: true };
}
export type FitOptions = {
  format: OutputFormat;
  quality: number;
  targetBytes?: number;
  maxWidth?: number;
  maxHeight?: number;
  scale?: number;
  aspectRatio?: number;
  crop?: { x: number; y: number; width: number; height: number };
  rotation?: 0 | 90 | 180 | 270;
  flipX?: boolean;
  flipY?: boolean;
  background: string;
  canvasPadding?: number;
  watermark?: Watermark;
};
export async function makeItFit(file: File, options: FitOptions) {
  if (options.targetBytes && options.format === "image/png")
    throw new Error("Use JPEG, WebP, or AVIF when fitting to a target size.");
  const bitmap = await createImageBitmap(file);
  const crop = options.crop || { x: 0, y: 0, width: 1, height: 1 };
  const cropX = Math.max(0, Math.min(0.99, crop.x));
  const cropY = Math.max(0, Math.min(0.99, crop.y));
  const cropWidth = Math.max(0.01, Math.min(1 - cropX, crop.width));
  const cropHeight = Math.max(0.01, Math.min(1 - cropY, crop.height));
  const croppedWidth = Math.round(bitmap.width * cropWidth);
  const croppedHeight = Math.round(bitmap.height * cropHeight);
  const ratio = croppedWidth / croppedHeight;
  const targetRatio = options.aspectRatio || ratio;
  const sourceWidth =
    options.aspectRatio && ratio > targetRatio
      ? Math.round(croppedHeight * targetRatio)
      : croppedWidth;
  const sourceHeight =
    options.aspectRatio && ratio < targetRatio
      ? Math.round(croppedWidth / targetRatio)
      : croppedHeight;
  const scale = Math.min(
    1,
    options.scale || 1,
    (options.maxWidth || sourceWidth) / sourceWidth,
    (options.maxHeight || sourceHeight) / sourceHeight,
  );
  let width = Math.max(1, Math.round(sourceWidth * scale));
  let height = Math.max(1, Math.round(sourceHeight * scale));
  const sx = Math.round(bitmap.width * cropX + (croppedWidth - sourceWidth) / 2);
  const sy = Math.round(bitmap.height * cropY + (croppedHeight - sourceHeight) / 2);
  let best:
    | { blob: Blob; width: number; height: number; quality: number }
    | undefined;
  for (let resizeAttempt = 0; resizeAttempt < 5; resizeAttempt += 1) {
    const rotated = options.rotation === 90 || options.rotation === 270;
    const padding = Math.max(0, Math.min(0.4, options.canvasPadding || 0));
    const paddedWidth = Math.round(width * (1 + padding * 2));
    const paddedHeight = Math.round(height * (1 + padding * 2));
    if (paddedWidth * paddedHeight > MAX_PIXELS) {
      bitmap.close();
      throw new Error("Canvas padding would make this image too large to process safely.");
    }
    const canvas = document.createElement("canvas");
    canvas.width = rotated ? paddedHeight : paddedWidth;
    canvas.height = rotated ? paddedWidth : paddedHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      throw new Error("Canvas is not available in this browser.");
    }
    if (options.format === "image/jpeg" || padding > 0) {
      context.fillStyle = options.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.save();
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(((options.rotation || 0) * Math.PI) / 180);
    context.scale(options.flipX ? -1 : 1, options.flipY ? -1 : 1);
    context.drawImage(
      bitmap,
      sx,
      sy,
      sourceWidth,
      sourceHeight,
      -width / 2,
      -height / 2,
      width,
      height,
    );
    context.restore();
    drawWatermark(context, canvas.width, canvas.height, options.watermark);
    const encode = async (quality: number) => {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, options.format, quality / 100),
      );
      if (!blob) throw new Error("The browser could not encode this image.");
      return { blob, width: canvas.width, height: canvas.height, quality };
    };
    if (!options.targetBytes) {
      best = await encode(options.quality);
      break;
    }
    let low = 10;
    let high = 95;
    let candidate: typeof best;
    for (
      let qualityAttempt = 0;
      qualityAttempt < 7 && low <= high;
      qualityAttempt += 1
    ) {
      const quality = Math.round((low + high) / 2);
      const output = await encode(quality);
      if (output.blob.size <= options.targetBytes) {
        candidate = output;
        low = quality + 1;
      } else high = quality - 1;
    }
    if (candidate) {
      best = candidate;
      break;
    }
    width = Math.max(1, Math.round(width * 0.8));
    height = Math.max(1, Math.round(height * 0.8));
  }
  bitmap.close();
  if (!best) throw new Error("Could not meet the requested file-size limit.");
  return {
    ...best,
    reachedTarget:
      !options.targetBytes || best.blob.size <= options.targetBytes,
  };
}
