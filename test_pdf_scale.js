const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function run() {
  const newPdf = await PDFDocument.create();
  const page = newPdf.addPage([595.28, 841.89]); // A4
  page.drawText('This is some test content that should not overlap.', { x: 50, y: 800, size: 24 });
  page.drawText('Bottom content.', { x: 50, y: 50, size: 24 });
  const origBytes = await newPdf.save();
  fs.writeFileSync('test_orig.pdf', origBytes);

  // Now let's try to embed it
  const origDoc = await PDFDocument.load(origBytes);
  const resultPdf = await PDFDocument.create();
  
  const embeddedPages = await resultPdf.embedPages(origDoc.getPages());
  for (const embeddedPage of embeddedPages) {
    const { width, height } = embeddedPage;
    const newPage = resultPdf.addPage([width, height]);
    
    // Scale down by 0.8
    const scale = 0.8;
    // We want margin top and bottom.
    // If we scale by 0.8, height becomes height * 0.8.
    // Remaining height is height * 0.2.
    // We can shift it up by height * 0.1 to center it vertically.
    newPage.drawPage(embeddedPage, {
      x: (width - width * scale) / 2,
      y: 100, // Move 100 points up from bottom
      xScale: scale,
      yScale: scale,
    });
    
    newPage.drawText('Header Logo Here', { x: 50, y: height - 50, size: 20 });
    newPage.drawText('Footer Signature Here', { x: 50, y: 30, size: 20 });
  }
  
  const resBytes = await resultPdf.save();
  fs.writeFileSync('test_result.pdf', resBytes);
  console.log('Success!');
}

run().catch(console.error);
