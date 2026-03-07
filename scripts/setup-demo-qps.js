/**
 * Copy demo QPS files to uploads/QPS for demo. Does not overwrite existing files.
 * Run from apcid_private root: node scripts/setup-demo-qps.js
 */
const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const demoDir = path.join(projectRoot, "demo_content", "QPS");
const uploadsQps = path.join(projectRoot, "uploads", "QPS");

if (!fs.existsSync(demoDir)) {
  console.log("demo_content/QPS not found. Nothing to copy.");
  process.exit(0);
}

if (!fs.existsSync(uploadsQps)) {
  fs.mkdirSync(uploadsQps, { recursive: true });
  console.log("Created uploads/QPS");
}

const files = fs.readdirSync(demoDir);
let copied = 0;
for (const file of files) {
  if (file === "README.md") continue;
  const src = path.join(demoDir, file);
  const dest = path.join(uploadsQps, file);
  if (!fs.statSync(src).isFile()) continue;
  if (fs.existsSync(dest)) {
    console.log("Skip (exists):", file);
    continue;
  }
  fs.copyFileSync(src, dest);
  console.log("Copied:", file);
  copied++;
}

console.log(copied ? `Done. ${copied} file(s) copied.` : "Done. No new files (existing kept).");
