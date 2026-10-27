import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

async function pngFixture(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 2; canvas.height = 2;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    context.fillStyle = "#567244"; context.fillRect(0, 0, 2, 2);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Could not make fixture");
    return await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve((reader.result as string).split(",")[1]); reader.readAsDataURL(blob); });
  });
}

test("converts a local image and downloads WebP", async ({ page }) => {
  const imageRequests: string[] = [];
  page.on("request", (request) => { if (request.resourceType() === "image" && !request.url().startsWith("blob:")) imageRequests.push(request.url()); });
  await page.goto("/");
  const png = await pngFixture(page);
  await page.locator('input[type="file"]').first().setInputFiles({ name: "sample.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  await expect(page.getByText("sample.png")).toBeVisible();
  await expect(page.getByText("Balanced web photo")).toBeVisible();
  await page.getByRole("button", { name: "Use WEBP · 82" }).click();
  await page.getByLabel("Resize percentage").fill("50");
  await expect(page.getByLabel("Resize percentage")).toHaveValue("50");
  await page.getByLabel("Resize height").fill("1");
  await expect(page.getByLabel("Resize percentage")).toHaveValue("");
  await page.getByLabel("Resize width").fill("1");
  await expect(page.getByLabel("Resize height")).toHaveValue("");
  await page.getByRole("button", { name: "Edit crop" }).click();
  await expect(page.getByRole("dialog", { name: "Visual crop editor" })).toBeVisible();
  await page.getByRole("button", { name: "Apply crop" }).click();
  await page.getByText("Override output settings").click();
  await page.getByLabel("Output format for sample.png").selectOption("image/jpeg");
  await page.getByLabel("Output quality for sample.png").evaluate((element) => { const input = element as HTMLInputElement; input.value = "75"; input.dispatchEvent(new Event("input", { bubbles: true })); input.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.getByLabel("Enable make it fit").check();
  await page.getByLabel("Maximum height").fill("1");
  await page.getByLabel("Crop ratio").selectOption("1");
  await page.getByLabel("Crop width percentage").fill("50");
  await page.getByLabel("Crop height percentage").fill("50");
  await page.getByLabel("Rotate image").selectOption("90");
  await page.getByLabel("Flip image horizontally").check();
  await page.getByLabel("Watermark text").fill("Private");
  await page.getByLabel("Preserve Author metadata").check();
  await page.getByRole("button", { name: "Convert images" }).click();
  await expect(page.getByRole("button", { name: "Download sample.jpg" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("1 of 1 images processed");
  const contactSheet = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download contact sheet" }).click();
  expect((await contactSheet).suggestedFilename()).toBe("image-convertor-contact-sheet.png");
  const pdf = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export images as PDF" }).click();
  expect((await pdf).suggestedFilename()).toBe("image-convertor-images.pdf");
  await page.getByRole("button", { name: "Preview sample.png" }).click();
  await expect(page.getByRole("dialog", { name: "Image comparison" })).toBeVisible();
  await page.getByLabel("Before and after split").fill("80");
  await expect(page.getByLabel("Before and after split")).toHaveValue("80");
  await page.getByRole("group", { name: "Comparison canvas" }).hover();
  await page.mouse.wheel(0, -100);
  await expect(page.getByText("Zoom 120%")).toBeVisible();
  await page.getByRole("button", { name: "Close preview" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download sample.jpg" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("sample.jpg");
  expect(imageRequests).toEqual([]);
});

test("reorders queued images with the drag handle", async ({ page }) => {
  await page.goto("/");
  const png = await pngFixture(page);
  await page.locator('input[type="file"]').first().setInputFiles([
    { name: "first.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") },
    { name: "second.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") },
  ]);
  await page.getByRole("button", { name: "Drag to reorder second.png" }).dragTo(
    page.getByRole("button", { name: "Drag to reorder first.png" }),
  );
  await expect(page.locator(".queue-item .file-info > strong")).toHaveText(["second.png", "first.png"]);
});

test("applies a creator preset and reloads saved local settings", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Output preset").selectOption("instagram-story");
  await expect(page.getByLabel("Enable make it fit")).toBeChecked();
  await expect(page.getByLabel("Crop ratio")).toHaveValue("0.5625");
  await page.getByLabel("Canvas padding").selectOption("10");
  await expect(page.getByLabel("Canvas padding")).toHaveValue("10");
  await page.getByLabel("Watermark text").fill("Studio mark");
  await page.getByLabel("Workflow name").fill("Story assets");
  await page.getByRole("button", { name: "Save settings on this device" }).click();
  await expect(page.getByText("Saved “Story assets” locally. Images and logo files are never included.")).toBeVisible();
  await page.reload();
  await page.getByLabel("Load saved workflow").selectOption("Story assets");
  await expect(page.getByLabel("Watermark text")).toHaveValue("Studio mark");
  await expect(page.getByLabel("Enable make it fit")).toBeChecked();
  await expect(page.getByLabel("Canvas padding")).toHaveValue("10");
});

test("watermarks every page of a local PDF", async ({ page }) => {
  const document = await PDFDocument.create();
  document.addPage([200, 200]);
  const bytes = await document.save();
  await page.goto("/");
  await page.getByLabel("Choose PDF files").setInputFiles({ name: "brief.pdf", mimeType: "application/pdf", buffer: Buffer.from(bytes) });
  await page.getByLabel("PDF watermark text").fill("CONFIDENTIAL");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Watermark every page" }).click();
  expect((await download).suggestedFilename()).toBe("brief-watermarked.pdf");
});
