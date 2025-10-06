import fs from "fs";
import path from "path";
import sharp from "sharp";

const inputDir = "path of images which are to be saved";
const outputDir = "path where converted images are to be saved";

// Ensure output folder exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// CLI usage: node index.js <quality>
// Example: node index.js 90
const quality = parseInt(process.argv[2]) || 80;

// Only convert to WebP and AVIF
const formats = ["webp", "avif"]; // if only want to convert to webp, remove avif and vice versa

fs.readdirSync(inputDir).forEach((file) => {
  const inputPath = path.join(inputDir, file);
  const ext = path.extname(file).toLowerCase();
  const baseName = path.basename(file, ext);

  formats.forEach((format) => {
    const outputPath = path.join(outputDir, `${baseName}.${format}`);

    sharp(inputPath)
      .toFormat(format, { quality })
      .toFile(outputPath)
      .then(() => {
        console.log(`✅ Converted: ${file} → ${baseName}.${format} (q=${quality})`);
      })
      .catch((err) => {
        console.error(`❌ Error converting ${file} to ${format}:`, err.message);
      });
  });
});