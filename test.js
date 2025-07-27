import path from "path";
import fs from "fs";
import { PDFDocument, rgb } from "pdf-lib";
import { PrismaClient } from "@prisma/client";
import { createCipheriv, createDecipheriv } from "crypto";

const prisma = new PrismaClient();

export async function mergeUserPdf() {
  try {
    // Fetch user by hall ticket number
    const user = await prisma.user.findFirst({
      where: { hallticket: '10308' }
    });
    if (!user) throw new Error("User not found");

    // Fetch most recent files
    const [excelfile, pptfile, wordfile, textfile] = await Promise.all([
      prisma.excelFile.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
      prisma.pptFile.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
      prisma.wordFile.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
      prisma.textFile.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
    ]);

    const files = [
      { type: 'Excel', original: excelfile?.oexcelurl, pdf: excelfile?.pexcelurl },
      { type: 'PowerPoint', original: pptfile?.oppturl, pdf: pptfile?.pppturl },
      { type: 'Word', original: wordfile?.owordurl, pdf: wordfile?.pwordurl },
      { type: 'Text', original: textfile?.otexturl, pdf: textfile?.ptexturl }
    ].filter(f => f.pdf && fs.existsSync(f.pdf));

    if (!files.length) throw new Error("No PDF files found to merge");

    const mergedPdf = await PDFDocument.create();
    const timestamp = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const timestampText = `Generated: ${timestamp}`;

    for (const file of files) {
      const pdfBytes = fs.readFileSync(file.pdf);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());

      pages.forEach(page => {
        page.drawText(
          `IP: ${user.ipAddress || 'N/A'} | Name: ${user.name || 'N/A'} | Hall Ticket: ${hallticketNo} | Exam Room: ${user.examroom || 'N/A'}`,
          { x: 50, y: page.getHeight() - 20, size: 8, color: rgb(0.3, 0.3, 0.3) }
        );
        page.drawText(timestampText, {
          x: page.getWidth() - 200, y: 10, size: 6, color: rgb(0.5, 0.5, 0.5)
        });
        mergedPdf.addPage(page);
      });

      const summaryPage = mergedPdf.addPage();
      const yStart = summaryPage.getHeight() - 100;

      summaryPage.drawText('Submission Report', { x: 50, y: yStart, size: 28 });
      summaryPage.drawText(`Submitted by: ${user.name || 'N/A'}`, { x: 50, y: yStart - 40, size: 12 });
      summaryPage.drawText(`Hall Ticket: ${hallticketNo}`, { x: 50, y: yStart - 60, size: 12 });
      summaryPage.drawText(`File Type: ${file.type}`, { x: 50, y: yStart - 80, size: 12 });
      summaryPage.drawText(`Original File: ${path.basename(file.original || '')}`, { x: 50, y: yStart - 100, size: 12 });
      summaryPage.drawText(`PDF File: ${path.basename(file.pdf)}`, { x: 50, y: yStart - 120, size: 12 });
      summaryPage.drawText(`Submission Time: ${timestamp}`, { x: 50, y: yStart - 140, size: 10 });
    }

    const mergedBytes = await mergedPdf.save();
    const outDir = path.join(process.cwd(), 'uploads', hallticketNo);
    const backupDir = path.join('Z:', 'uploads', hallticketNo);
    await fs.promises.mkdir(outDir, { recursive: true }).catch(() => {});
    await fs.promises.mkdir(backupDir, { recursive: true }).catch(() => {});

    const mergedPath = path.join(outDir, `merged_${hallticketNo}.pdf`);
    const unencryptedPath = path.join(outDir, `unencrypted_${hallticketNo}.pdf`);
    const backupPath = path.join(backupDir, `backup_merged_${hallticketNo}.pdf`);

    // Encryption
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const iv = Buffer.from(process.env.ENCRYPTION_IV, 'hex');
    const algo = process.env.ENCRYPTION_ALGORITHM || 'aes-256-cbc';
    const cipher = createCipheriv(algo, key, iv);
    const encryptedBytes = Buffer.concat([cipher.update(mergedBytes), cipher.final()]);

    fs.writeFileSync(mergedPath, encryptedBytes);
    fs.writeFileSync(unencryptedPath, mergedBytes);
    fs.writeFileSync(backupPath, mergedBytes);

    // Save submission in DB
    await prisma.submission.upsert({
      where: { userId: user.id },
      update: { mergedPdfUrl: mergedPath, filesSubmitted: true },
      create: {
        userId: user.id,
        mergedPdfUrl: mergedPath,
        filesSubmitted: true,
        textSubmitted: !!textfile
      }
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { isSubmitted: true, submittedAt: new Date() }
    });

    // Decrypt for output
    const encryptedBuffer = fs.readFileSync(mergedPath);
    const decipher = createDecipheriv(algo, key, iv);
    const decryptedBuffer = Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final()
    ]);

    return {
      buffer: decryptedBuffer,
      filename: `merged_${hallticketNo}.pdf`,
      mimeType: 'application/pdf'
    };

  } catch (err) {
    console.error('mergeUserPdf error:', err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}
