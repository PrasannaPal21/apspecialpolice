import path from "path";
import fs from "fs";
import { NextResponse } from "next/server";
import { extractDataFromToken } from "@/lib/jwttoken";
import { PrismaClient } from "@/generated/prisma";
import { createCipheriv, createDecipheriv, createHash } from "crypto";
import os from "os";

const prisma = new PrismaClient();

// Utility to extract IP from headers (same as /api/ip)
function getLocalIPAddress(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  let ip = forwardedFor?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "Unknown";

  if (ip.startsWith("::ffff:")) {
    ip = ip.replace("::ffff:", "");
  }

  return ip;
}

export async function saveFile(
  folderPath: string,
  file: File,
  hallticketNo: string
) {
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const hash = createHash("sha256")
    .update(fileBuffer)
    .update(hallticketNo)
    .digest("hex");

  const ext = path.extname(file.name);
  const hashedFileName = `${hash}${ext}`;

  const filePath = path.join(folderPath, hashedFileName);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  fs.writeFileSync(filePath, fileBuffer);

  return filePath;
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { error: "Unauthorized", status: 401 };
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return { error: "Token is required", status: 401 };
    }

    const tokenData = extractDataFromToken(token);

    if (!tokenData) {
      return { error: "Invalid token", status: 401 };
    }

    const { user } = tokenData as { user: { hallticket: string } };

    if (!user) {
      return { error: "User not found", status: 404 };
    }

    const fetched_user = await prisma.user.findUnique({
      where: { hallticket: user.hallticket },
    });

    if (!fetched_user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (fetched_user.isSubmitted === true) {
      return NextResponse.json(
        { error: "Data already submitted" },
        { status: 400 }
      );
    }

    // Fetch all available files (some might be null)
    const excelfile = await prisma.excelFile.findFirst({
      where: { userId: fetched_user.id },
      orderBy: { createdAt: "desc" },
    });

    const pptfile = await prisma.pptFile.findFirst({
      where: { userId: fetched_user.id },
      orderBy: { createdAt: "desc" },
    });

    const wordfile = await prisma.wordFile.findFirst({
      where: { userId: fetched_user.id },
      orderBy: { createdAt: "desc" },
    });

    const textfile = await prisma.textFile.findFirst({
      where: { userId: fetched_user.id },
      orderBy: { createdAt: "desc" },
    });

    const englishSectionAnswers = await prisma.englishSectionAnswer.findMany({
      where: { userId: fetched_user.id },
    });
    const englishGrammar = englishSectionAnswers.find((a) => a.section === "GRAMMAR");
    const englishTranslation = englishSectionAnswers.find((a) => a.section === "TRANSLATION");

    const availableFiles: { type: string }[] = [];
    const availableOriginalPaths: string[] = [];
    const availablePdfPaths: string[] = [];
    const availableFileNames: string[] = [];

    const pushPdf = (
      type: string,
      origPath: string,
      pdfPath: string,
    ) => {
      if (fs.existsSync(origPath) && fs.existsSync(pdfPath)) {
        availableFiles.push({ type });
        availableOriginalPaths.push(origPath);
        availablePdfPaths.push(pdfPath);
        availableFileNames.push(path.basename(origPath));
      }
    };

    // Merge order: English grammar → English translation → Typing → Word → Excel → PPT
    if (englishGrammar) {
      pushPdf("English Grammar", englishGrammar.otexturl, englishGrammar.ptexturl);
    }
    if (englishTranslation) {
      pushPdf("English Translation", englishTranslation.otexturl, englishTranslation.ptexturl);
    }
    if (
      textfile &&
      fs.existsSync(textfile.otexturl) &&
      fs.existsSync(textfile.ptexturl)
    ) {
      pushPdf("Text", textfile.otexturl, textfile.ptexturl);
    }
    if (
      wordfile &&
      fs.existsSync(wordfile.owordurl) &&
      fs.existsSync(wordfile.pwordurl)
    ) {
      pushPdf("Word", wordfile.owordurl, wordfile.pwordurl);
    }
    if (
      excelfile &&
      fs.existsSync(excelfile.oexcelurl) &&
      fs.existsSync(excelfile.pexcelurl)
    ) {
      pushPdf("Excel", excelfile.oexcelurl, excelfile.pexcelurl);
    }
    if (
      pptfile &&
      fs.existsSync(pptfile.oppturl) &&
      fs.existsSync(pptfile.pppturl)
    ) {
      pushPdf("PowerPoint", pptfile.oppturl, pptfile.pppturl);
    }

    // Check if at least one file is available for submission
    if (availableFiles.length === 0) {
      return NextResponse.json(
        {
          error:
            "No valid files found for submission. Please upload at least one file.",
        },
        { status: 400 }
      );
    }

    console.log(
      `Submitting ${availableFiles.length} files for user ${fetched_user.hallticket}:`
    );
    availableFiles.forEach((file) => console.log(`- ${file.type}`));

    const mergedPdfPath = path.join(
      process.cwd(),
      "uploads",
      fetched_user.hallticket
    );

    const mergedPdfPathBkp = path.join(
      "Z:",
      "uploads",
      fetched_user.hallticket
    );


    // Get local IP address
    const localIP = getLocalIPAddress(req);

    // Merge all available PDFs into one
    const { PDFDocument, rgb } = await import("pdf-lib");
    const mergedPdf = await PDFDocument.create();

    for (const [index, pdfFile] of availablePdfPaths.entries()) {
      try {
        const pdfBytes = fs.readFileSync(pdfFile);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(
          pdfDoc,
          pdfDoc.getPageIndices()
        );

        // Add timestamp at bottom right
        const currentTime = new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        const timestampText = `Generated: ${currentTime}`;

        for (const page of copiedPages) {
          // Add user details to each original document page
          page.drawText(
            `IP: ${localIP} | Name: ${
              fetched_user.name || "N/A"
            } | Hall Ticket: ${fetched_user.hallticket} | Exam Room: ${fetched_user.examroom}`,
            {
              x: 50,
              y: page.getHeight() - 20,
              size: 8,
              color: rgb(0.3, 0.3, 0.3), // Gray color
            }
          );

          page.drawText(timestampText, {
            x: page.getWidth() - 200,
            y: 10,
            size: 6,
            color: rgb(0.5, 0.5, 0.5),
          });

          mergedPdf.addPage(page);
        }

        // Add a new page with logos and details after each PDF page
        const logoPage = mergedPdf.addPage();

        logoPage.drawText(
          `IP: ${localIP} | Name: ${
            fetched_user.name || "N/A"
          } | Hall Ticket: ${fetched_user.hallticket}`,
          {
            x: 50,
            y: logoPage.getHeight() - 20,
            size: 8,
            color: rgb(0.3, 0.3, 0.3), // Gray color
          }
        );

        const leftLogoPath = path.join(
          process.cwd(),
          "public",
          "ap_police.png"
        );
        const rightLogoPath = path.join(process.cwd(), "public", "ap.png");

        // Check if logo files exist before trying to use them
        let leftLogoImage, rightLogoImage;

        if (fs.existsSync(leftLogoPath)) {
          try {
            const leftLogoBytes = fs.readFileSync(leftLogoPath);
            leftLogoImage = await mergedPdf.embedPng(leftLogoBytes);
          } catch (error) {
            console.warn("Failed to embed left logo:", error);
          }
        }

        if (fs.existsSync(rightLogoPath)) {
          try {
            const rightLogoBytes = fs.readFileSync(rightLogoPath);
            rightLogoImage = await mergedPdf.embedPng(rightLogoBytes);
          } catch (error) {
            console.warn("Failed to embed right logo:", error);
          }
        }

        const logoWidth = 50;
        const logoHeight = 50;
        const leftLogoXOffset = 50;
        const leftLogoYOffset = logoPage.getHeight() - logoHeight - 20;
        const rightLogoXOffset = logoPage.getWidth() - logoWidth - 50;
        const rightLogoYOffset = logoPage.getHeight() - logoHeight - 20;

        // Draw logos if they were successfully loaded
        if (leftLogoImage) {
          logoPage.drawImage(leftLogoImage, {
            x: leftLogoXOffset,
            y: leftLogoYOffset,
            width: logoWidth,
            height: logoHeight,
          });
        }

        if (rightLogoImage) {
          logoPage.drawImage(rightLogoImage, {
            x: rightLogoXOffset,
            y: rightLogoYOffset,
            width: logoWidth,
            height: logoHeight,
          });
        }

        const yOffset = 50;
        const xOffset = 50;

        // Add a page heading
        const headingYOffset = logoPage.getHeight() - 150;
        logoPage.drawText("Submission Report", {
          x: xOffset,
          y: headingYOffset,
          size: 28,
          color: rgb(0, 0, 0),
        });

        // Add user details section
        logoPage.drawText(`Submitted by: ${fetched_user.name || "N/A"}`, {
          x: xOffset,
          y: headingYOffset - 50,
          size: 12,
          color: rgb(0, 0, 0),
        });
        logoPage.drawText(`Hall Ticket: ${fetched_user.hallticket}`, {
          x: xOffset,
          y: headingYOffset - 70,
          size: 12,
          color: rgb(0, 0, 0),
        });
        logoPage.drawText(`IP Address: ${localIP}`, {
          x: xOffset,
          y: headingYOffset - 90,
          size: 12,
          color: rgb(0, 0, 0),
        });
        logoPage.drawText(`Submission Time: ${currentTime}`, {
          x: xOffset,
          y: headingYOffset - 110,
          size: 10,
          color: rgb(0, 0, 0),
        });

        // Add file type and names
        const fileType = availableFiles[index].type;
        const originalFileName = availableFileNames[index];
        const pdfFileName = path.basename(pdfFile);

        logoPage.drawText(`File Type: ${fileType}`, {
          x: xOffset,
          y: headingYOffset - 130,
          size: 10,
          color: rgb(0, 0, 0),
        });
        logoPage.drawText(`Original File: ${originalFileName}`, {
          x: xOffset,
          y: headingYOffset - 150,
          size: 10,
          color: rgb(0, 0, 0),
        });
        logoPage.drawText(`PDF File: ${pdfFileName}`, {
          x: xOffset,
          y: headingYOffset - 170,
          size: 10,
          color: rgb(0, 0, 0),
        });

        // Add summary of submitted files
        logoPage.drawText(`Total Files Submitted: ${availableFiles.length}`, {
          x: xOffset,
          y: headingYOffset - 200,
          size: 10,
          color: rgb(0, 0, 0),
        });

        const fileTypesList = availableFiles.map((f) => f.type).join(", ");
        logoPage.drawText(`File Types: ${fileTypesList}`, {
          x: xOffset,
          y: headingYOffset - 220,
          size: 10,
          color: rgb(0, 0, 0),
        });

        logoPage.drawText(timestampText, {
          x: logoPage.getWidth() - 200,
          y: 10,
          size: 6,
          color: rgb(0.5, 0.5, 0.5),
        });

        // Draw the provided signature
        const signatureWidth = 150; // Fixed width
        const signatureHeight = 50; // Fixed height
        const signaturePath = path.join(process.cwd(), "public", "sign.png");
        const signatureBytes = fs.readFileSync(signaturePath);
        const signatureImage = await mergedPdf.embedPng(signatureBytes);
        logoPage.drawImage(signatureImage, {
          x: xOffset,
          y: yOffset,
          width: signatureWidth,
          height: signatureHeight,
        });

        // Add names and designations side by side below the signature on every page
        const fontSize = 15;
        const textYOffset = yOffset - 20; // Position below the signature
        const spacing = 200; // Horizontal spacing between name-designation pairs

        const entries = [
          { name: "Kuchipudi Nagesh Babu IPS\nSP Eagle, AP Police" },
          { name: "  Invigilator" },
          { name: "Candidate" },
        ];

        entries.forEach((entry, index) => {
          const xPosition = xOffset + index * spacing;
          logoPage.drawText(entry.name, {
            x: xPosition,
            y: textYOffset,
            size: fontSize,
            color: rgb(0, 0, 0),
          });
        });
      } catch (pdfError) {
        console.error(`Error processing PDF file ${pdfFile}:`, pdfError);
        // Continue with other files even if one fails
      }
    }

    const mergedPdfBytes = await mergedPdf.save();
    const mergedPdfFileName = `merged_${fetched_user.hallticket}.pdf`;
    const mergedPdfFilePath = path.join(mergedPdfPath, mergedPdfFileName);

    const encryptionKeyHex = process.env.ENCRYPTION_KEY || "";
    const encryptionIvHex = process.env.ENCRYPTION_IV || "";
    const encryptionAlgorithm =
      process.env.ENCRYPTION_ALGORITHM || "aes-256-cbc";

    if (
      !encryptionKeyHex ||
      !encryptionIvHex ||
      encryptionKeyHex.length !== 64 ||
      encryptionIvHex.length !== 32 ||
      !/^[0-9a-fA-F]+$/.test(encryptionKeyHex) ||
      !/^[0-9a-fA-F]+$/.test(encryptionIvHex)
    ) {
      return NextResponse.json(
        {
          error: "Missing or invalid ENCRYPTION_KEY or ENCRYPTION_IV. Set both in .env (64 and 32 hex chars for aes-256-cbc).",
        },
        { status: 500 }
      );
    }

    const encryptionKey = Buffer.from(encryptionKeyHex, "hex");
    const encryptionIv = Buffer.from(encryptionIvHex, "hex");
    const cipher = createCipheriv(
      encryptionAlgorithm,
      encryptionKey,
      encryptionIv
    );
    const encryptedPdfBytes = Buffer.concat([
      cipher.update(mergedPdfBytes),
      cipher.final(),
    ]);
    fs.writeFileSync(mergedPdfFilePath, encryptedPdfBytes);

   const mergedPdfBytes2 = await mergedPdf.save();
    const mergedPdfFileName2 = `unecrypted_merged_${fetched_user.hallticket}.pdf`;
    const mergedPdfFilePath2 = path.join(mergedPdfPath, mergedPdfFileName2);
     fs.writeFileSync(mergedPdfFilePath2, mergedPdfBytes2);
     
    const backupRoot = path.parse(mergedPdfPathBkp).root;
    if (backupRoot && fs.existsSync(backupRoot)) {
      try {
        const mergedPdfBytes3 = await mergedPdf.save();
        const mergedPdfFileName3 = `backup_merged_${fetched_user.hallticket}.pdf`;
        const mergedPdfFilePath3 = path.join(mergedPdfPathBkp, mergedPdfFileName3);
        if (!fs.existsSync(mergedPdfPathBkp)) {
          fs.mkdirSync(mergedPdfPathBkp, { recursive: true });
        }
        fs.writeFileSync(mergedPdfFilePath3, mergedPdfBytes3);
      } catch (e) {
        console.warn("Failed to save backup merged PDF:", e);
      }
    }


    // Verify the merged PDF was saved correctly
    if (!fs.existsSync(mergedPdfFilePath)) {
      return NextResponse.json(
        { error: "Failed to save merged PDF file" },
        { status: 500 }
      );
    }

    // Update user submission status
    const istDate = new Date();
    istDate.setMinutes(istDate.getMinutes() + 330); // Convert UTC to IST (UTC+5:30)

    // Update or create submission record
    const existingSubmission = await prisma.submission.findFirst({
      where: { userId: fetched_user.id },
    });

    if (existingSubmission) {
      await prisma.submission.update({
        where: { id: existingSubmission.id },
        data: {
          mergedPdfUrl: mergedPdfFilePath,
          filesSubmitted: true,
        },
      });
    } else {
      await prisma.submission.create({
        data: {
          userId: fetched_user.id,
          mergedPdfUrl: mergedPdfFilePath,
          filesSubmitted: true,
          textSubmitted: !!textfile,
        },
      });
    }

    await prisma.user.update({
      where: { id: fetched_user.id },
      data: {
        isSubmitted: true,
        submittedAt: istDate,
      },
    });

    const encryptedFileBuffer = fs.readFileSync(mergedPdfFilePath);
    const decipher = createDecipheriv(
      encryptionAlgorithm,
      encryptionKey,
      encryptionIv
    );
    const finalPdfBytes = Buffer.concat([
      decipher.update(encryptedFileBuffer),
      decipher.final(),
    ]);

    return new Response(finalPdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fetched_user.hallticket}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error in final submission:", error);
    return NextResponse.json(
      { 
        error: "Failed to process final submission", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
