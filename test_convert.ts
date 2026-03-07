import { localConvertToPDFWithSignatures } from "./src/lib/localFileConvert";
import fs from "fs";
import path from "path";

async function main() {
    const testFolder = path.join(__dirname, "test_output");
    const testInput = path.join(__dirname, "test_input.txt");

    if (!fs.existsSync(testFolder)) {
        fs.mkdirSync(testFolder, { recursive: true });
    }

    // Create a dummy text file
    fs.writeFileSync(testInput, "This is a test file for the PDF generation scaling feature.\nRepeated text to fill space.\n\n".repeat(50));

    try {
        const result = await localConvertToPDFWithSignatures(
            testFolder,
            testInput,
            "TEST_123456"
        );
        console.log("Success! Output PDF:", result);
    } catch (err) {
        console.error("Failed to generate PDF:", err);
    }
}

main();
