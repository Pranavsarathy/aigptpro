// server/api.js
// This file exports the Express app for Vercel serverless deployment.
// It mirrors the original server logic but does NOT call app.listen() unless run locally.

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const multer = require('multer');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const Chat = require('./models/Chat');

const app = express();
app.use(cors());
app.use(express.json());

// ---------- Upload handling (25 MB limit) ----------
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// ---------- MongoDB (optional) ----------
const DISABLE_MONGODB = process.env.DISABLE_MONGODB === 'true';
if (!DISABLE_MONGODB) {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-assistant';
  mongoose.connect(MONGODB_URI).catch(err => console.warn('MongoDB error (ignored on Vercel):', err.message));
} else {
  console.log('MongoDB disabled via DISABLE_MONGODB=true');
}

// ---------- Gemini AI (real or mock) ----------
let ai;
const apiKey = process.env.GEMINI_API_KEY;
if (apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey.trim() !== '') {
  console.log('🔑 Gemini API key detected – using real AI engine');
  ai = new GoogleGenAI(apiKey);
} else {
  console.log('⚠️ No Gemini key – falling back to mock mode');
}

// ---------- Routes ----------
app.use('/api/auth', authRoutes);

// Chat endpoint – same logic as original server.js
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userId, history, fileContext } = req.body;
    if (!message && !fileContext) return res.status(400).json({ error: 'Message or file is required' });

    // Mock mode when AI client is not configured
    if (!ai) {
      const mockReplies = [
        "That's an interesting perspective! Tell me more.",
        "I'm currently running in mock mode because no Gemini API key was provided, but I hear you loud and clear!",
        "Fascinating! How does that relate to your main project?",
        "I can help with that once the API key is configured. For now, I'm just a placeholder AI.",
        "Beep boop! Mock response activated."
      ];
      const replyText = mockReplies[Math.floor(Math.random() * mockReplies.length)];
      if (!DISABLE_MONGODB && mongoose.connection.readyState === 1) {
        await new Chat({ userId, message, reply: replyText }).save().catch(() => {});
      }
      // Stream mock reply
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      const words = replyText.split(' ');
      let i = 0;
      const iv = setInterval(() => {
        if (i < words.length) {
          res.write(`data: ${JSON.stringify({ text: words[i] + ' ' })}\n\n`);
          i++;
        } else {
          clearInterval(iv);
          res.end();
        }
      }, 100);
      return;
    }

    // Real Gemini call
    const chatSession = ai.chats.create({ model: 'gemini-1.5-flash', history: history || [] });
    let payload;
    if (fileContext) {
      const parts = [{ text: `[Attached File: ${fileContext.filename}]\n${fileContext.text}\n\n` }];
      if (fileContext.base64) {
        parts.push({ inlineData: { data: fileContext.base64, mimeType: fileContext.mimeType } });
      }
      if (message) parts.push({ text: message });
      payload = parts;
    } else {
      payload = message || '';
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await chatSession.sendMessageStream({ message: payload });
    let fullReply = '';
    for await (const chunk of stream) {
      fullReply += chunk.text;
      res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
    }
    res.end();

    if (!DISABLE_MONGODB && mongoose.connection.readyState === 1) {
      await new Chat({ userId, message, reply: fullReply }).save().catch(() => {});
    }
  } catch (error) {
    console.error('Error in /api/chat:', error);
    // Fallback to mock on any failure
    const mockReplies = [
      "That's an interesting perspective! Tell me more.",
      "I'm currently running in mock mode because the API key is invalid, but I hear you loud and clear!",
      "Fascinating! How does that relate to your main project?",
      "I can help with that once the API key is configured. For now, I'm just a placeholder AI.",
      "Beep boop! Mock response activated."
    ];
    const replyText = mockReplies[Math.floor(Math.random() * mockReplies.length)];
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const words = replyText.split(' ');
    let i = 0;
    const iv = setInterval(() => {
      if (i < words.length) {
        res.write(`data: ${JSON.stringify({ text: words[i] + ' ' })}\n\n`);
        i++;
      } else {
        clearInterval(iv);
        res.end();
      }
    }, 100);
  }
});

// File upload endpoint – unchanged
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    let extractedText = '';
    let base64Data = null;
    if (req.file.mimetype === 'application/pdf') {
      const data = fs.readFileSync(req.file.path);
      const pdf = await pdfParse(data);
      extractedText = pdf.text;
    } else if (req.file.mimetype.startsWith('image/')) {
      const buf = fs.readFileSync(req.file.path);
      base64Data = buf.toString('base64');
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

// Export the app for Vercel. When run directly (node server/api.js) start a dev server.
module.exports = app;
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Dev server listening on ${PORT}`));
}
