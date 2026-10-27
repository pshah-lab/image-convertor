import type { ImageOutput } from "@/types/image";

export type SnippetKind = "picture" | "srcset" | "next";

function sourceList(outputs: ImageOutput[]) {
  return outputs.map((output) => `/images/${output.name} ${output.width}w`).join(", ");
}

export function responsiveSnippet(outputs: ImageOutput[], kind: SnippetKind, alt = "") {
  const sources = [...outputs].sort((a, b) => a.width - b.width);
  if (!sources.length) return "";
  const srcset = sourceList(sources);
  const fallback = `/images/${sources[sources.length - 1].name}`;
  const extension = sources[0].name.split(".").pop();
  const mime = extension === "jpg" ? "image/jpeg" : `image/${extension}`;
  if (kind === "srcset") return srcset;
  if (kind === "next") return `<Image\n  src="${fallback}"\n  alt="${alt}"\n  width={${sources[sources.length - 1].width}}\n  height={${sources[sources.length - 1].height}}\n  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 75vw, 1280px"\n/>`;
  return `<picture>\n  <source type="${mime}" srcset="${srcset}" sizes="(max-width: 640px) 100vw, (max-width: 1280px) 75vw, 1280px" />\n  <img\n    src="${fallback}"\n    alt="${alt}"\n    width="${sources[sources.length - 1].width}"\n    height="${sources[sources.length - 1].height}"\n  />\n</picture>`;
}
