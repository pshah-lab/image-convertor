import { describe, expect, it } from "vitest";
import { extensionFor, formatBytes, isHeic, makeOutputName, presets, recommendImageSettings, savingsPercent } from "./image";
describe("image helpers", () => {
  it("uses correct output extensions", () => { expect(extensionFor("image/jpeg")).toBe("jpg"); expect(makeOutputName("photo.final.png", "image/webp")).toBe("photo.final.webp"); });
  it("formats real byte counts", () => { expect(formatBytes(1024)).toBe("1 KB"); expect(formatBytes(2 * 1024 * 1024)).toBe("2.00 MB"); });
  it("calculates a truthful saving percentage", () => { expect(savingsPercent(1000, 283)).toBe(71.7); expect(savingsPercent(1000, 1200)).toBe(-20); });
  it("ships useful web and creator presets", () => { expect(presets["next-hero"].width).toBe(1920); expect(presets.whatsapp.format).toBe("image/jpeg"); expect(presets["instagram-story"].aspectRatio).toBe(0.5625); expect(presets.amazon.width).toBe(2000); expect(makeOutputName("logo.png", "image/webp", "-sm")).toBe("logo-sm.webp"); });
  it("recognizes HEIC files even when browsers omit their MIME type", () => { expect(isHeic(new File([], "IMG_0001.HEIC", { type: "" }))).toBe(true); expect(isHeic(new File([], "photo.jpg", { type: "image/jpeg" }))).toBe(false); });
  it("recommends formats conservatively for graphics and photos", () => { expect(recommendImageSettings({ name: "brand-logo.png", type: "image/png" })).toMatchObject({ format: "image/png", quality: 100 }); expect(recommendImageSettings({ name: "holiday.jpg", type: "image/jpeg", width: 4000, height: 3000 })).toMatchObject({ format: "image/webp", quality: 78 }); });
});
