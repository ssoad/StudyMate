const fs = require('fs');

function replaceFile(path, replacer) {
  if (!fs.existsSync(path)) return;
  const content = fs.readFileSync(path, 'utf8');
  const newContent = replacer(content);
  if (content !== newContent) {
    fs.writeFileSync(path, newContent);
    console.log(`Updated ${path}`);
  }
}

replaceFile('src/components/BackgroundEvaluator.tsx', c => c.replace(/import React from 'react';\n/, ''));
replaceFile('src/lib/dataService.ts', c => c.replace(/const \{ data, error \} = await supabase!\.storage\.from\('exam-files'\)\.upload\(filePath, file\);/, 'const { error } = await supabase!.storage.from(\'exam-files\').upload(filePath, file);'));
replaceFile('src/lib/llm.ts', c => c.replace(/export async function generateExamEvaluation\(title: string, questions/g, 'export async function generateExamEvaluation(questions'));
replaceFile('src/pages/AdminDashboard.tsx', c => c.replace(/ Database,/, '').replace(/ AlertCircle,/, ''));
replaceFile('src/pages/Landing.tsx', c => c.replace(/import React from 'react';\n/, '').replace(/ Target,/, '').replace(/variant="outline"/g, 'variant="secondary"'));
replaceFile('src/pages/Profile.tsx', c => c.replace(/, CardHeader /, ' '));
replaceFile('src/pages/Resources.tsx', c => c.replace(/, CardHeader /, ' ').replace(/, Plus,/, ',').replace(/, CheckCircle /, ' ').replace(/variant="outline"/g, 'variant="secondary"'));
replaceFile('src/pages/admin/AdminExams.tsx', c => c.replace(/, type ExamQuestion /, ' '));
replaceFile('src/pages/admin/AdminResources.tsx', c => c.replace(/import React(?:, \{.*?\})? from 'react';\n/, "import { useState, useEffect } from 'react';\n").replace(/, CardHeader /, ' ').replace(/variant="outline"/g, 'variant="secondary"'));

