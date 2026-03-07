import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const execAsync = promisify(exec);

export async function localConvertToPDFWithSignatures(
  folderPath: string,
  inputPath1: string,
  hallticketNo: string
): Promise<string> {
  const signaturePath = path.join(process.cwd(), "public", "sign.png");
  const hasSignature = fs.existsSync(signaturePath);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  if (!fs.existsSync(inputPath1)) {
    throw new Error(`Input file not found: ${inputPath1}`);
  }

  const command =
    process.platform === "win32"
      ? `"C:\\Program Files\\LibreOffice\\program\\soffice.exe" --headless --convert-to pdf --outdir "${folderPath}" "${inputPath1}"`
      : `libreoffice --headless --convert-to pdf --outdir "${folderPath}" "${inputPath1}"`;

  const { stderr } = await execAsync(command);
  if (stderr && !stderr.includes("SyntaxWarning")) {
    throw new Error(`Failed to convert file to PDF: ${stderr}`);
  }

  const fileName = path
    .basename(inputPath1)
    .replace(/\.(docx?|xlsx?|txt?|ppt?|pptx?|xls?|doc)$/i, ".pdf");
  const pdfPath = path.join(folderPath, fileName);

  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF file not found after conversion: ${pdfPath}`);
  }

  const { PDFDocument, rgb } = await import("pdf-lib");
  const pdfBytes = fs.readFileSync(pdfPath);

  if (!pdfBytes.toString("utf8", 0, 5).startsWith("%PDF-")) {
    throw new Error(`Invalid PDF file: ${pdfPath}`);
  }

  const origPdfDoc = await PDFDocument.load(pdfBytes);
  const pdfDoc = await PDFDocument.create();

  const signatureImage = hasSignature
    ? await pdfDoc.embedPng(fs.readFileSync(signaturePath))
    : null;

  const leftLogoPath = path.join(process.cwd(), "public", "ap_police.png");
  const rightLogoPath = path.join(process.cwd(), "public", "ap.png");
  const hasLeftLogo = fs.existsSync(leftLogoPath);
  const hasRightLogo = fs.existsSync(rightLogoPath);
  const leftLogoImage = hasLeftLogo ? await pdfDoc.embedPng(fs.readFileSync(leftLogoPath)) : null;
  const rightLogoImage = hasRightLogo ? await pdfDoc.embedPng(fs.readFileSync(rightLogoPath)) : null;

  const embeddedPages = await pdfDoc.embedPages(origPdfDoc.getPages());
  for (let i = 0; i < embeddedPages.length; i++) {
    const embeddedPage = embeddedPages[i];
    const { width, height } = embeddedPage;

    const page = pdfDoc.addPage([width, height]);

    // Scale down to leave margins for header and footer without overlapping content
    const scale = 0.8;
    const yShift = 100; // Shift up from the bottom

    page.drawPage(embeddedPage, {
      x: (width - width * scale) / 2,
      y: yShift,
      xScale: scale,
      yScale: scale,
    });

    const leftLogoWidth = 50;
    const leftLogoHeight = 50;
    const rightLogoWidth = 50;
    const rightLogoHeight = 50;
    const leftLogoXOffset = 50;
    const leftLogoYOffset = page.getHeight() - leftLogoHeight - 20;
    const rightLogoXOffset = page.getWidth() - rightLogoWidth - 50;
    const rightLogoYOffset = page.getHeight() - rightLogoHeight - 20;

    if (leftLogoImage) {
      page.drawImage(leftLogoImage, {
        x: leftLogoXOffset,
        y: leftLogoYOffset,
        width: leftLogoWidth,
        height: leftLogoHeight,
      });
    }

    if (rightLogoImage) {
      page.drawImage(rightLogoImage, {
        x: rightLogoXOffset,
        y: rightLogoYOffset,
        width: rightLogoWidth,
        height: rightLogoHeight,
      });
    }

    const yOffset = 50;
    const xOffset = 50;

    if (signatureImage) {
      page.drawImage(signatureImage, {
        x: xOffset,
        y: yOffset,
        width: 120,
        height: 40,
      });
    }

    const fontSize = 15;
    const textYOffset = yOffset - 20;
    const spacing = 200;
    const entries = [
      { name: "Kuchipudi Nagesh Babu IPS\nSP Eagle, AP Police" },
      { name: "  Invigilator" },
      { name: "Candidate" },
    ];

    entries.forEach((entry, index) => {
      const xPosition = xOffset + index * spacing;
      page.drawText(entry.name, {
        x: xPosition,
        y: textYOffset,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
    });
  }

  const modifiedPdfBytes = await pdfDoc.save();

  const hash = crypto
    .createHash("sha256")
    .update(modifiedPdfBytes)
    .update(hallticketNo)
    .digest("hex");
  const hashedFileName = `${hash}.pdf`;
  const hashedPdfPath = path.join(folderPath, hashedFileName);

  fs.writeFileSync(hashedPdfPath, modifiedPdfBytes);
  fs.unlinkSync(pdfPath);

  return hashedPdfPath;
}
