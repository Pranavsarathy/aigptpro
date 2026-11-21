const express = require('express');
const cors = require('cors');
require('dotenv').config();
const Groq = require('groq-sdk');
const multer = require('multer');
const fs = require('fs');
const https = require('https');
const pdfParse = require('pdf-parse');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const Chat = require('./models/Chat');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Upload handling (Cloud/Serverless safe)
const uploadDir = process.env.VERCEL ? '/tmp' : './uploads';
try {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
} catch (e) {
  console.warn('Upload directory warning:', e.message);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// MongoDB (disabled by default in cloud/serverless unless explicitly configured)
const DISABLE_MONGODB = process.env.DISABLE_MONGODB !== 'false';
if (!DISABLE_MONGODB && process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .catch(err => console.warn('MongoDB error:', err.message));
} else {
  console.log('MongoDB disabled');
}

// Groq AI Client (Multimodal Vision + Chat)
let groq;
const groqKey = process.env.GROQ_API_KEY;
if (groqKey && groqKey.startsWith('gsk_')) {
  groq = new Groq({ apiKey: groqKey });
  console.log('✅ Groq AI Vision & Chat Engine loaded (FREE)');
} else {
  console.log('⚠️ Waiting for GROQ_API_KEY');
}

app.use('/api/auth', authRoutes);

// ==================== IMAGE GENERATION API ====================
app.get('/api/image/generate', (req, res) => {
  try {
    const { prompt, style = 'realistic', aspectRatio = '1:1', model = 'flux', seed } = req.query;
    if (!prompt) {
      return res.status(400).send('Prompt is required');
    }

    let width = 768;
    let height = 768;
    if (aspectRatio === '16:9') { width = 1024; height = 576; }
    else if (aspectRatio === '9:16') { width = 576; height = 1024; }
    else if (aspectRatio === '4:3') { width = 1024; height = 768; }
    else if (aspectRatio === '3:4') { width = 768; height = 1024; }

    const promptWithStyle = style && style !== 'none' ? `${prompt}, ${style} style, high quality, 8k resolution` : prompt;
    const finalSeed = seed || Math.floor(Math.random() * 2147483647);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptWithStyle)}?width=${width}&height=${height}&seed=${finalSeed}&nologo=true&model=${encodeURIComponent(model || 'flux')}`;

    // Direct 302 redirect so the browser fetches the image directly with full caching
    res.redirect(302, pollinationsUrl);
  } catch (err) {
    console.error('Image generate error:', err.message);
    res.status(500).send('Internal server error');
  }
});

// ==================== IMAGE EDITING API ====================
app.post('/api/image/edit', async (req, res) => {
  try {
    const { instruction, style = 'realistic', aspectRatio = '1:1', model = 'flux' } = req.body;
    if (!instruction) {
      return res.status(400).json({ error: 'Instruction is required' });
    }

    const seed = Date.now();
    const refinedPrompt = `${instruction}, ${style} style, detailed masterpiece, 8k`;
    const editedImageUrl = `/api/image/generate?prompt=${encodeURIComponent(refinedPrompt)}&style=${style}&aspectRatio=${aspectRatio}&model=${model}&seed=${seed}`;

    res.json({
      editedImageUrl,
      refinedPrompt
    });
  } catch (err) {
    console.error('Image edit error:', err.message);
    res.status(500).json({ error: 'Failed to edit image' });
  }
});

// ==================== MULTIMODAL CHAT API (TEXT + VISION) ====================
app.post('/api/chat', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { message, userId, history, fileContext, images } = req.body;
    if (!message && !fileContext && (!images || images.length === 0)) {
      res.write(`data: ${JSON.stringify({ text: 'Please send a message or attach a file.' })}\n\n`);
      return res.end();
    }

    if (!groq) {
      res.write(`data: ${JSON.stringify({ text: 'Please add your GROQ_API_KEY to server/.env — get a free key at https://console.groq.com/keys' })}\n\n`);
      return res.end();
    }

    const systemPrompt = `You are AI LEXER, an advanced multimodal AI assistant.
You possess high-level intelligence for conversation, code generation, in-depth visual image analysis, object recognition, and OCR text extraction.
When asked to analyze an image, examine all objects, text, composition, colors, and contextual details thoroughly.
When asked to create, draw, or generate an image, describe it vividly and provide the markdown image link:
![Image description](/api/image/generate?prompt=ENCODED_PROMPT&style=realistic)`;

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history
    if (history && history.length > 0) {
      for (const h of history) {
        if (h.role && h.parts && h.parts[0]) {
          messages.push({
            role: h.role === 'model' ? 'assistant' : 'user',
            content: h.parts[0].text || ''
          });
        }
      }
    }

    // Build current user message (with Vision support)
    const hasImages = (images && images.length > 0) || (fileContext && fileContext.base64 && fileContext.mimeType && fileContext.mimeType.startsWith('image/'));

    if (hasImages) {
      let promptText = message || '';
      if (fileContext && !fileContext.mimeType?.startsWith('image/')) {
        promptText = `[File: ${fileContext.filename}]\n${fileContext.text}\n\n` + promptText;
      }
      if (!promptText.trim()) {
        promptText = 'Analyze this image in detail: identify all objects, visual elements, scene layout, colors, and extract visible text.';
      }

      const content = [{ type: 'text', text: promptText }];

      // Add attached images
      if (images && Array.isArray(images)) {
        for (const img of images) {
          const url = (img.src && img.src.startsWith('data:')) 
            ? img.src 
            : `data:${img.mimeType || 'image/jpeg'};base64,${img.base64}`;
          content.push({ type: 'image_url', image_url: { url } });
        }
      }

      // Add fileContext image if present
      if (fileContext && fileContext.base64 && fileContext.mimeType?.startsWith('image/')) {
        const url = `data:${fileContext.mimeType};base64,${fileContext.base64}`;
        content.push({ type: 'image_url', image_url: { url } });
      }

      messages.push({ role: 'user', content });
    } else {
      let userText = '';
      if (fileContext) {
        userText = `[File: ${fileContext.filename}]\n${fileContext.text}\n\n`;
      }
      if (message) userText += message;
      messages.push({ role: 'user', content: userText });
    }

    // Stream from Groq Multimodal Vision model
    const stream = await groq.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages,
      stream: true,
    });

    let fullReply = '';
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) {
        fullReply += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
    res.end();

    if (!DISABLE_MONGODB && mongoose.connection.readyState === 1) {
      await new Chat({ userId, message: message || '[Image Analysis]', reply: fullReply }).save().catch(() => {});
    }

  } catch (error) {
    console.error('Chat error:', error.message);
    res.write(`data: ${JSON.stringify({ text: `Error: ${error.message}` })}\n\n`);
    res.end();
  }
});

// ==================== FILE UPLOAD API ====================
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    let extractedText = '';
    let base64Data = null;
    if (req.file.mimetype === 'application/pdf') {
      const pdf = await pdfParse(fs.readFileSync(req.file.path));
      extractedText = pdf.text;
    } else if (req.file.mimetype.startsWith('image/')) {
      base64Data = fs.readFileSync(req.file.path).toString('base64');
      extractedText = '[Image uploaded for visual analysis]';
    } else {
      extractedText = fs.readFileSync(req.file.path, 'utf8');
    }
    res.json({
      message: 'File processed successfully',
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      base64: base64Data,
      extractedText: extractedText.length > 1000 ? extractedText.substring(0, 1000) + '...' : extractedText
    });
  } catch (e) {
    console.error('Upload error:', e);
    res.status(500).json({ error: 'Failed to process file' });
  }
});

module.exports = app;
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}
