import { dataService } from './dataService';

import type { ParsedFile } from './fileParser';

export async function generateExamFromDocument(parsedFile: ParsedFile, _title: string) {
  const { data: settings } = await dataService.getSystemSettings();
  const apiKey = settings?.find(s => s.key === 'llm_api_key')?.value;
  // NOTE: dataService has llm_api_base_url, but old code used llm_base_url. We'll check both.
  let baseUrl = settings?.find(s => s.key === 'llm_api_base_url' || s.key === 'llm_base_url')?.value || 'https://api.armorclub.org/v1';
  // Strip trailing slashes and common accidental suffixes
  baseUrl = baseUrl.replace(/\/+$/, '').replace(/\/chat\/completions$/, '').replace(/\/v1\/chat\/completions$/, '/v1');
  
  const model = settings?.find(s => s.key === 'llm_model')?.value || 'claude-3-5-sonnet-latest';

  if (!apiKey) {
    throw new Error('LLM API Key is not configured in System Settings.');
  }

  const promptInstructions = `
You are an expert exam generator. I will provide you with a document (either text or an image) containing exam questions.
Your task is to parse the document and generate a structured JSON array of exam questions.

For each question, determine if it is Multiple Choice (mcq) or a Written question (written).
If it's MCQ, extract the options and the correct answer index (0-based) if indicated, otherwise leave correct_option null.
Assign a reasonable points value (e.g., 1 for MCQ, 5 for Written).

Output ONLY valid JSON matching this schema:
[
  {
    "type": "mcq" | "written",
    "question_text": "string",
    "options": ["string", "string"] (only if type is mcq, otherwise null),
    "correct_option": integer (0-based index if known, otherwise null),
    "points": integer
  }
]

Do not include markdown blocks like \`\`\`json. Just output the raw JSON array.
`;

  let messageContent: any = promptInstructions;

  if (parsedFile.type === 'text') {
    messageContent = promptInstructions + `\n\nDOCUMENT TEXT:\n${parsedFile.content}`;
  } else if (parsedFile.type === 'image') {
    messageContent = [
      { type: "text", text: promptInstructions },
      { type: "image_url", image_url: { url: parsedFile.content } }
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
        messages: [{ role: 'user', content: messageContent }],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Status ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    let resultText = data.choices[0].message.content.trim();
    
    // Strip markdown formatting if the model still includes it
    if (resultText.startsWith('\`\`\`json')) {
      resultText = resultText.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
    } else if (resultText.startsWith('\`\`\`')) {
      resultText = resultText.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
    }

    const questions = JSON.parse(resultText);
    return questions;
  } catch (error: any) {
    console.error('Failed to generate exam:', error);
    throw new Error(`Failed to generate exam from document: ${error.message}`);
  }
}
