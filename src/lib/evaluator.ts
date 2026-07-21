import { dataService } from './dataService';
import type { ExamQuestion, ExamAnswer } from './dataService';
import * as pdfjsLib from 'pdfjs-dist';

// Ensure worker is configured for pdf.js if we need to parse uploaded answer PDFs
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export async function extractTextFromUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const arrayBuffer = await blob.arrayBuffer();

    if (url.toLowerCase().includes('.pdf')) {
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(' ') + '\n';
      }
      return text;
    } else {
      // Just returning URL for images so LLM vision can see it if we pass it as image
      return `[IMAGE_OR_UNSUPPORTED_FILE: ${url}]`; 
    }
  } catch (error) {
    console.error('Error extracting text from file:', error);
    return '[Could not extract text from file]';
  }
}

export async function evaluateAnswer(
  question: ExamQuestion,
  answer: ExamAnswer
): Promise<{ is_correct: boolean; points_awarded: number; feedback: string }> {
  
  // Base case: MCQ evaluation is deterministic if we have a correct_option
  if (question.type === 'mcq' && typeof question.correct_option === 'number') {
    const isCorrect = answer.selected_option === question.correct_option;
    return {
      is_correct: isCorrect,
      points_awarded: isCorrect ? (question.points || 1) : 0,
      feedback: isCorrect ? 'Correct!' : 'Incorrect answer selected.'
    };
  }

  // LLM Evaluation for Written (or MCQ without defined correct option)
  const { data: settings } = await dataService.getSystemSettings();
  const apiKey = settings?.find(s => s.key === 'llm_api_key')?.value;
  let baseUrl = settings?.find(s => s.key === 'llm_api_base_url' || s.key === 'llm_base_url')?.value || 'https://api.armorclub.org/v1';
  baseUrl = baseUrl.replace(/\/+$/, '').replace(/\/chat\/completions$/, '').replace(/\/v1\/chat\/completions$/, '/v1');
  const model = settings?.find(s => s.key === 'llm_model')?.value || 'claude-3-5-sonnet-latest';

  if (!apiKey) {
    throw new Error('LLM API Key is not configured for automatic evaluation.');
  }

  let studentAnswerContext = '';
  let isImage = false;
  let imageBase64 = '';

  if (answer.selected_option !== undefined && answer.selected_option !== null && question.options) {
    studentAnswerContext = `Student Selected Option: ${question.options[answer.selected_option]}`;
  } else if (answer.answer_file_url) {
    if (answer.answer_file_url.match(/\.(jpeg|jpg|png|gif)/i)) {
      isImage = true;
      try {
        const res = await fetch(answer.answer_file_url);
        const blob = await res.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        imageBase64 = `data:${blob.type};base64,${base64}`;
      } catch(e) {
        studentAnswerContext = `Student provided an image, but it could not be processed. URL: ${answer.answer_file_url}`;
        isImage = false;
      }
    } else {
      studentAnswerContext = `Student uploaded a document. Extracted text:\n` + await extractTextFromUrl(answer.answer_file_url);
    }
  } else {
    studentAnswerContext = 'No answer provided by the student.';
    return { is_correct: false, points_awarded: 0, feedback: 'No answer provided.' };
  }

  const systemPrompt = `You are an expert examiner grading a student's answer.
You will be provided with the QUESTION, the MAX POINTS, and the STUDENT ANSWER.
Your job is to evaluate the student's answer and output ONLY valid JSON in this format:
{
  "is_correct": boolean,
  "points_awarded": number (integer between 0 and max points),
  "feedback": "string (brief explanation of why they got this score)"
}
Be fair but rigorous. Do not include markdown blocks like \`\`\`json.`;

  const userPrompt = `
QUESTION:
${question.question_text}

MAX POINTS: ${question.points || 5}

STUDENT ANSWER:
${isImage ? '[Attached Image of Answer]' : studentAnswerContext}
`;

  let messageContent: any = userPrompt;
  if (isImage) {
    messageContent = [
      { type: 'text', text: userPrompt },
      { type: 'image_url', image_url: { url: imageBase64 } }
    ];
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: messageContent }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content || '{}';
    const jsonStr = resultText.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    return {
      is_correct: !!parsed.is_correct,
      points_awarded: Number(parsed.points_awarded) || 0,
      feedback: parsed.feedback || 'Evaluated.'
    };
  } catch (error) {
    console.error("LLM Evaluation Failed:", error);
    return {
      is_correct: false,
      points_awarded: 0,
      feedback: 'Automatic evaluation failed due to a system error.'
    };
  }
}
