export type OutputFormat = "image/jpeg" | "image/png" | "image/webp" | "image/avif";
export type PreservedMetadataField = "Captured" | "Author" | "Copyright";
export type QueueStatus = "ready" | "processing" | "complete" | "failed" | "cancelled";
export interface ImageOutput { blob: Blob; url: string; width: number; height: number; name: string; quality?: number; }
export interface MetadataEntry { label: string; value: string; sensitive?: boolean; }
export interface ImageItem { id: string; file: File; sourceUrl: string; width?: number; height?: number; status: QueueStatus; error?: string; metadata?: MetadataEntry[]; outputOverride?: { format?: OutputFormat; quality?: number }; progress?: { completed: number; total: number }; result?: ImageOutput; variants?: ImageOutput[]; }
