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

replaceFile('src/App.tsx', c => c.replace(/supabase\.rpc/g, 'supabase!.rpc').replace(/\.catch\(console\.error\)/g, ''));
replaceFile('src/lib/dataService.ts', c => c.replace(/startExamSubmission: async \(examId: string, userId\)/g, 'startExamSubmission: async (examId: string, userId: string)'));
replaceFile('src/pages/admin/AdminResources.tsx', c => c.replace(/, CardHeader /, ' '));
replaceFile('src/pages/admin/AdminUsers.tsx', c => c.replace(/dataService, UserProfile/, 'dataService, type UserProfile'));
replaceFile('src/pages/Profile.tsx', c => c.replace(/, CardHeader /, ' '));
replaceFile('src/pages/Resources.tsx', c => c.replace(/, CardHeader /, ' '));

