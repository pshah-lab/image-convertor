import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap { const root = process.env.NEXT_PUBLIC_SITE_URL || "https://image-convertor.example"; return ["", "/privacy", "/about"].map((path) => ({ url: `${root}${path}`, lastModified: new Date() })); }
