// Extract "The Lightning Thief" PDF into chapters HTML
// Usage: node build_lightning_thief.js
const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

process.chdir(__dirname);

const PDF_PATH = 'The Lightning Thief (Percy Jackson and the Olympians Book 1) (Rick Riordan) (z-library.sk, 1lib.sk, z-lib.sk).pdf';
const OUTPUT_HTML = 'lightning_thief_chapters.html';
const OUTPUT_TXT = 'lightning_thief_full_text.txt';

function escapeHTML(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function isChapterTitleLine(line) {
  // Match: number (1-22) followed by 2+ all-caps words
  return /^\d{1,2}\s+[A-Z][A-Z\s',-]{3,}$/.test(line.trim());
}

function isAllCapsLine(line) {
  const t = line.trim();
  return t.length > 0 && t === t.toUpperCase() && /[A-Z]{3,}/.test(t);
}

function isPageMarker(line) {
  return /^--\s*\d+\s+of\s+\d+\s*--$/.test(line.trim());
}

async function main() {
  console.log('Reading PDF...');
  const dataBuffer = new Uint8Array(fs.readFileSync(PDF_PATH));
  const parser = new PDFParse(dataBuffer);
  const result = await parser.getText();

  const fullText = result.text;
  console.log(`Total text: ${fullText.length} chars`);

  // Split into lines, remove page markers and empty lines for analysis
  const rawLines = fullText.split('\n');

  // Find chapter boundary line indices
  // A chapter starts when we see: number + ALL CAPS text
  const chapterStarts = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (isChapterTitleLine(line)) {
      // Verify it's a real chapter number (1-22)
      const num = parseInt(line);
      if (num >= 1 && num <= 22) {
        chapterStarts.push({ index: i, number: num, line: line });
      }
    }
  }

  console.log(`Found ${chapterStarts.length} chapter boundaries`);
  for (const ch of chapterStarts) {
    const nextLine = (ch.index + 1 < rawLines.length) ? rawLines[ch.index + 1].trim() : '';
    const titleContinuation = isAllCapsLine(nextLine) && !isChapterTitleLine(nextLine) ? ' ' + nextLine : '';
    console.log(`  Ch${ch.number}: "${ch.line}${titleContinuation}"`);
  }

  // Build chapters: extract text between chapter boundaries
  const chapters = [];
  for (let c = 0; c < chapterStarts.length; c++) {
    const start = chapterStarts[c];
    const end = (c + 1 < chapterStarts.length) ? chapterStarts[c + 1].index : rawLines.length;

    // Get the chapter title (may span 2 lines)
    let title = start.line;
    const nextLine = (start.index + 1 < rawLines.length) ? rawLines[start.index + 1].trim() : '';
    let bodyStart = start.index + 1;
    if (isAllCapsLine(nextLine) && !isChapterTitleLine(nextLine) && !isPageMarker(rawLines[start.index + 1])) {
      // Check it's not the next chapter
      const nextNum = parseInt(nextLine);
      if (isNaN(nextNum) || nextNum < 1 || nextNum > 22) {
        title += ' ' + nextLine;
        bodyStart = start.index + 2;
      }
    }

    // Extract body lines between this chapter and the next
    const bodyLines = [];
    for (let i = bodyStart; i < end; i++) {
      const line = rawLines[i];
      if (!isPageMarker(line)) {
        bodyLines.push(line);
      }
    }

    const bodyText = bodyLines.join('\n').trim();

    chapters.push({
      number: start.number,
      title: title,
      bodyText: bodyText,
    });
  }

  // Generate paragraphs from body text
  // Split on double newlines, clean up single newlines within paragraphs
  for (const ch of chapters) {
    // Remove page markers from body
    let text = ch.bodyText;

    // Split into raw paragraphs by blank lines
    const rawParagraphs = text.split(/\n\s*\n/);
    const cleanParagraphs = [];

    for (const rp of rawParagraphs) {
      // Join lines within a paragraph, normalize whitespace
      let p = rp.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      // Filter out garbage (page headers, very short fragments)
      if (p.length < 15) continue;
      if (/^Percy Jackson 1 - The Lightning Thief/i.test(p)) continue;
      if (/^THE LIGHTNING THIEF/i.test(p) && p.length < 30) continue;
      if (/^Scanned by/i.test(p)) continue;
      if (/^Rick Riordan/i.test(p) && p.length < 20) continue;
      cleanParagraphs.push(p);
    }

    ch.paragraphs = cleanParagraphs;
  }

  // Generate HTML output
  let htmlOutput = '';
  let txtOutput = '';

  for (const ch of chapters) {
    if (ch.paragraphs.length === 0) {
      console.log(`  WARNING: Chapter ${ch.number} has no paragraphs after cleaning`);
      continue;
    }

    htmlOutput += `<h2>Chapter ${ch.number}: ${ch.title.replace(/^\d+\s+/, '')}</h2>\n`;

    for (const p of ch.paragraphs) {
      htmlOutput += `<p>${escapeHTML(p)}</p>\n`;
      txtOutput += p + '\n\n';
    }

    console.log(`  Ch${ch.number}: ${ch.paragraphs.length} paragraphs`);
  }

  // Write output files
  fs.writeFileSync(OUTPUT_HTML, htmlOutput, 'utf-8');
  fs.writeFileSync(OUTPUT_TXT, txtOutput.trim(), 'utf-8');

  const htmlSize = fs.statSync(OUTPUT_HTML).size;
  const txtSize = fs.statSync(OUTPUT_TXT).size;
  console.log(`\nOutput:`);
  console.log(`  ${OUTPUT_HTML}: ${(htmlSize / 1024).toFixed(1)} KB`);
  console.log(`  ${OUTPUT_TXT}: ${(txtSize / 1024).toFixed(1)} KB`);
  console.log(`  Total chapters with content: ${chapters.filter(c => c.paragraphs.length > 0).length}`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
