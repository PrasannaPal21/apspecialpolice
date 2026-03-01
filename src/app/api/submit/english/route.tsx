"use server";

import { PrismaClient } from "@/generated/prisma";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { localConvertToPDFWithSignatures } from "@/lib/localFileConvert";

const VALID_SECTIONS = ["GRAMMAR", "TRANSLATION"] as const;

function saveFile(folderPath: string, file: File): Promise<string> {
  return (async () => {
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(folderPath, file.name);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    fs.writeFileSync(filePath, fileBuffer);
    return filePath;
  })();
}

export async function POST(request: Request) {
  const prisma = new PrismaClient();

  try {
    const authHeader = request.headers.get("Authorization");
    const body = await request.formData();
    const textFile = body.get("textfile") as File | null;
    const sectionRaw = body.get("section") as string | null;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!textFile || typeof textFile === "string") {
      return NextResponse.json(
        { message: "Text file is required" },
        { status: 400 }
      );
    }

    if (
      !sectionRaw ||
      !VALID_SECTIONS.includes(sectionRaw as (typeof VALID_SECTIONS)[number])
    ) {
      return NextResponse.json(
        { message: "Valid section (GRAMMAR or TRANSLATION) is required" },
        { status: 400 }
      );
    }

    const section = sectionRaw as "GRAMMAR" | "TRANSLATION";

    const token = authHeader.split(" ")[1];
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tokenData = JSON.parse(atob(token.split(".")[1]));

    if (!tokenData || !tokenData.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { user } = tokenData;

    const fetched_user = await prisma.user.findUnique({
      where: { hallticket: user.hallticket },
    });

    if (!fetched_user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (fetched_user.isSubmitted === true) {
      return NextResponse.json(
        { error: "Data already submitted" },
        { status: 400 }
      );
    }

    const originalfolderPath = path.join(
      process.cwd(),
      "uploads",
      fetched_user.hallticket,
      "original"
    );
    const originalfolderPathBkp = path.join(
      "Z:",
      "uploads",
      fetched_user.hallticket,
      "original"
    );
    const pdfFolderPath = path.join(
      process.cwd(),
      "uploads",
      fetched_user.hallticket,
      "pdf"
    );

    const fileName = section === "GRAMMAR" ? "grammar.txt" : "translation.txt";
    const fileWithName = new File([await textFile.arrayBuffer()], fileName, {
      type: textFile.type,
    });

    const originalpath = await saveFile(originalfolderPath, fileWithName);

    const backupRoot = path.parse(originalfolderPathBkp).root;
    if (backupRoot && fs.existsSync(backupRoot)) {
      try {
        await saveFile(originalfolderPathBkp, fileWithName);
      } catch (e) {
        console.warn("Failed to save backup file:", e);
      }
    }

    const pdfpath = await localConvertToPDFWithSignatures(
      pdfFolderPath,
      originalpath,
      fetched_user.hallticket
    );

    await prisma.englishSectionAnswer.upsert({
      where: {
        userId_section: { userId: fetched_user.id, section },
      },
      create: {
        userId: fetched_user.id,
        section,
        otexturl: originalpath,
        ptexturl: pdfpath,
      },
      update: {
        otexturl: originalpath,
        ptexturl: pdfpath,
      },
    });

    return NextResponse.json(
      { message: `English section (${section}) submitted successfully` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error submitting English section:", error);
    const message =
      error instanceof Error ? error.message : "Failed to submit English section";
    return NextResponse.json(
      { message: "Failed to submit English section", detail: message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
