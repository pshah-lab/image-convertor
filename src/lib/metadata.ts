import type { PreservedMetadataField } from "@/types/image";
export type MetadataEntry = { label: string; value: string; sensitive?: boolean };

export function metadataEntries(data: Record<string, unknown> | undefined): MetadataEntry[] {
  if (!data) return [];
  const fields: Array<[string, string, boolean?]> = [["Camera", "Model"], ["Maker", "Make"], ["Captured", "DateTimeOriginal"], ["GPS latitude", "latitude", true], ["GPS longitude", "longitude", true], ["Author", "Artist"], ["Copyright", "Copyright"], ["Software", "Software"]];
  return fields.flatMap(([label, key, sensitive]) => {
    const value = data[key];
    if (value === undefined || value === null || value === "") return [];
    return [{ label, value: value instanceof Date ? value.toLocaleString() : String(value), sensitive }];
  });
}

export async function inspectMetadata(file: File): Promise<MetadataEntry[]> {
  const { parse } = await import("exifr");
  return metadataEntries(await parse(file, ["Model", "Make", "DateTimeOriginal", "latitude", "longitude", "Artist", "Copyright", "Software"]));
}

function base64FromBytes(bytes: Uint8Array) {
  let value = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) value += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(value);
}
function exifDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return `${date.getFullYear()}:${String(date.getMonth() + 1).padStart(2, "0")}:${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}
export async function preserveJpegMetadata(blob: Blob, entries: MetadataEntry[], fields: PreservedMetadataField[]) {
  if (!fields.length) return blob;
  const piexif = await import("piexifjs");
  const values = new Map(entries.map((entry) => [entry.label, entry.value]));
  const zeroth: Record<number, string> = {};
  const exif: Record<number, string> = {};
  if (fields.includes("Author") && values.get("Author")) zeroth[piexif.ImageIFD.Artist] = values.get("Author")!;
  if (fields.includes("Copyright") && values.get("Copyright")) zeroth[piexif.ImageIFD.Copyright] = values.get("Copyright")!;
  const captured = values.get("Captured");
  const formattedDate = captured && exifDate(captured);
  if (fields.includes("Captured") && formattedDate) exif[piexif.ExifIFD.DateTimeOriginal] = formattedDate;
  if (!Object.keys(zeroth).length && !Object.keys(exif).length) return blob;
  const source = `data:image/jpeg;base64,${base64FromBytes(new Uint8Array(await blob.arrayBuffer()))}`;
  const inserted = piexif.insert(piexif.dump({ "0th": zeroth, Exif: exif, GPS: {}, "1st": {} }), source);
  const binary = atob(inserted.slice(inserted.indexOf(",") + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes.buffer], { type: "image/jpeg" });
}
