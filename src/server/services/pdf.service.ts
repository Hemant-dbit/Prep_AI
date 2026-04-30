/**
 * PDF text extraction service.
 * Uses pdf-parse/lib/pdf-parse.js directly to avoid the package's
 * index.js test file lookup issue in Next.js environments.
 */

/**
 * Extracts plain text from a PDF buffer.
 * Returns empty string if extraction fails (caller decides how to handle).
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Import from the lib path directly to bypass the test file lookup
    // that causes ENOENT errors when importing from the package root
    const pdfParse = require("pdf-parse/lib/pdf-parse.js");
    const data = await pdfParse(buffer);
    console.log("📄 PDF text extracted, length:", data.text.length, "chars");
    return data.text as string;
  } catch (error) {
    console.error("❌ PDF extraction failed:", (error as Error)?.message || error);
    return "";
  }
}
