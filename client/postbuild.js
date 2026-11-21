import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const indexHtml = path.join(distDir, 'index.html');

if (fs.existsSync(indexHtml)) {
  fs.copyFileSync(indexHtml, path.join(distDir, '404.html'));
  fs.copyFileSync(indexHtml, path.join(distDir, 'chat.html'));
  
  const chatDir = path.join(distDir, 'chat');
  if (!fs.existsSync(chatDir)) {
    fs.mkdirSync(chatDir, { recursive: true });
  }
  fs.copyFileSync(indexHtml, path.join(chatDir, 'index.html'));
  console.log('SPA fallback files created: chat/index.html, chat.html, 404.html');
}
