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

replaceFile('src/components/BackgroundEvaluator.tsx', c => c.replace(/import React(?:, \{.*?\})? from 'react';\n/, "import { useEffect, useRef, useState } from 'react';\n"));
replaceFile('src/lib/dataService.ts', c => c.replace(/getUserPoints: async \(userId\)/g, 'getUserPoints: async (userId: string)').replace(/getUserProfile: async \(userId\)/g, 'getUserProfile: async (userId: string)').replace(/updateProfile: async \(userId,/g, 'updateProfile: async (userId: string,').replace(/uploadAvatar: async \(userId,/g, 'uploadAvatar: async (userId: string,').replace(/getExamsForUser: async \(userId\)/g, 'getExamsForUser: async (userId: string)'));
replaceFile('src/pages/admin/AdminResources.tsx', c => c.replace(/, CardHeader /, ' '));
replaceFile('src/pages/AdminDashboard.tsx', c => c.replace(/, AlertCircle /, ' '));
replaceFile('src/pages/Dashboard.tsx', c => c.replace(/getDashboardStats\(user\.id\)/g, 'getDashboardStats()'));
replaceFile('src/pages/Landing.tsx', c => c.replace(/, Trophy, /, ', ').replace(/, FileText /, ' ').replace(/import \{ BookOpen, /g, 'import { BookOpen, Sparkles, ShieldCheck, '));
replaceFile('src/pages/Profile.tsx', c => c.replace(/, CardHeader /, ' '));
replaceFile('src/pages/Resources.tsx', c => c.replace(/, CardHeader /, ' '));

