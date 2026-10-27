import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./enhancements.css";
import "./advanced-tools.css";
import "./code-export.css";
import "./metadata.css";
import "./crop-edit.css";
import "./crop-editor.css";
import "./file-overrides.css";
import "./queue-reorder.css";
import "./processing-progress.css";
import "./creator-tools.css";
import "./comparison-tool.css";
import "./pdf-tools.css";
export const metadata: Metadata = { title: "Image Convertor — private image tools", description: "Convert, compress, and resize images locally in your browser.", manifest: "/manifest.webmanifest" };
export const viewport: Viewport = { themeColor: "#dce5d2" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
