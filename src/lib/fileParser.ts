import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';

// Configure the worker to use the bundled version from the CDN to avoid Vite build issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface ParsedFile {
  type: 'text' | 'image';
  content: string; // text content OR base64 data url
}

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n\n';
  }
  
  return fullText;
}

export async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

export async function extractTextFromXlsx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = xlsx.read(arrayBuffer, { type: 'buffer' });
  let fullText = '';
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    fullText += `Sheet: ${sheetName}\n`;
    fullText += xlsx.utils.sheet_to_csv(sheet);
    fullText += '\n\n';
  }
  
  return fullText;
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

export async function parseFileForLLM(file: File): Promise<ParsedFile> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  
  if (fileType.startsWith('image/')) {
    const base64 = await fileToBase64(file);
    return { type: 'image', content: base64 };
  }
  
  let text = '';
  
  if (fileType === 'application/pdf') {
    text = await extractTextFromPDF(file);
  } else if (fileName.endsWith('.docx') || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    text = await extractTextFromDocx(file);
  } else if (fileName.endsWith('.xlsx') || fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    text = await extractTextFromXlsx(file);
  } else if (fileType === 'text/plain' || fileType === 'text/markdown' || fileType === 'text/csv') {
    text = await file.text();
  } else {
    throw new Error('Unsupported file type. Please upload a PDF, Word Doc, Excel, Text, or Image file.');
  }
  
  return { type: 'text', content: text };
}
