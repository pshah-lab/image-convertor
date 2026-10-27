import { describe, expect, it } from "vitest";
import { responsiveSnippet } from "./responsive-code";

const outputs = [
  { name: "hero-lg.webp", width: 1920, height: 1080, blob: new Blob(), url: "" },
  { name: "hero-sm.webp", width: 640, height: 360, blob: new Blob(), url: "" },
  { name: "hero-md.webp", width: 1280, height: 720, blob: new Blob(), url: "" },
];

describe("responsive snippets", () => {
  it("orders the srcset by width", () => {
    expect(responsiveSnippet(outputs, "srcset")).toBe("/images/hero-sm.webp 640w, /images/hero-md.webp 1280w, /images/hero-lg.webp 1920w");
  });
  it("uses the largest variant as fallback", () => {
    expect(responsiveSnippet(outputs, "picture", "Homepage hero")).toContain('src="/images/hero-lg.webp"');
    expect(responsiveSnippet(outputs, "picture", "Homepage hero")).toContain('<picture>');
    expect(responsiveSnippet(outputs, "next", "Homepage hero")).toContain("<Image");
  });
});
