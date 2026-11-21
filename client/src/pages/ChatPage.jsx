import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import ChatInput from '../components/ChatInput';
import Message from '../components/Message';
import ImageCard from '../components/ImageCard';
import ImageStudioModal from '../components/ImageStudioModal';
import ImageGalleryModal from '../components/ImageGalleryModal';
import { 
  Bot, 
  FileText, 
  Volume2, 
  VolumeX, 
  Palette, 
  Check, 
  Menu, 
  Square,
  Sparkles,
  Images,
  Layers
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Themes definition
const BACKGROUND_THEMES = [
  { id: 'bg-cosmic', name: 'Cosmic Galaxy', color: 'linear-gradient(135deg, #0f172a, #312e81)' },
  { id: 'bg-midnight', name: 'Midnight Obsidian', color: 'linear-gradient(135deg, #111827, #030712)' },
  { id: 'bg-cyberpunk', name: 'Cyber Matrix', color: 'linear-gradient(135deg, #022c22, #042f2e)' },
  { id: 'bg-sunset', name: 'Sunset Aurora', color: 'linear-gradient(135deg, #4c0519, #581c87)' },
  { id: 'bg-sapphire', name: 'Sapphire Ocean', color: 'linear-gradient(135deg, #082f49, #0f766e)' },
  { id: 'bg-minimal', name: 'Minimal Dark', color: '#0f1117' },
];

// Markdown renderer with rich interactive ImageCard and speech trigger
const MarkdownMessage = ({ 
  text, 
  sender, 
  messageId, 
  onSpeak, 
  isSpeakingThis,
  onRegenerateImage,
  onEditImage,
  onAnalyzeImage 
}) => (
  <div className={`message-container ${sender}`}>
    <div className="avatar">
      {sender === 'ai' ? <Bot size={20} color="#fff" /> : 'U'}
    </div>
    <div className="message-bubble">
      {sender === 'ai' ? (
        <>
          <ReactMarkdown
            components={{
              p({ node, children }) {
                return <div className="markdown-paragraph">{children}</div>;
              },
              img({ node, src, alt, ...props }) {
                return (
                  <ImageCard 
                    src={src} 
                    alt={alt} 
                    onRegenerate={onRegenerateImage}
                    onEdit={onEditImage}
                    onAnalyze={onAnalyzeImage}
                  />
                );
              },
              code({node, inline, className, children, ...props}) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    children={String(children).replace(/\n$/, '')}
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  />
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {text}
          </ReactMarkdown>
          <div className="message-actions">
            <button 
              className={`msg-speaker-btn ${isSpeakingThis ? 'speaking' : ''}`}
              onClick={() => onSpeak(text, messageId)}
              title={isSpeakingThis ? "Stop Voice" : "Read Aloud"}
            >
              {isSpeakingThis ? <Square size={13} /> : <Volume2 size={13} />}
              <span>{isSpeakingThis ? "Stop" : "Listen"}</span>
            </button>
          </div>
        </>
      ) : (
        <p>{text}</p>
      )}
    </div>
  </div>
);

const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  
  // Voice Output State
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(() => {
    const saved = localStorage.getItem('ai_voice_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [speakingMessageId, setSpeakingMessageId] = useState(null);

  // Background Theme State
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('ai_bg_theme') || 'bg-cosmic';
  });
  const [showThemePicker, setShowThemePicker] = useState(false);
  const themePickerRef = useRef(null);

  // Mobile sidebar open state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Studio and Gallery Modals State
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [studioInitialPrompt, setStudioInitialPrompt] = useState('');
  const [studioInitialImage, setStudioInitialImage] = useState(null);

  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_image_gallery');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Attached media for Multi-image Vision & Comparison
  const [attachedImages, setAttachedImages] = useState([]);
  const [fileContext, setFileContext] = useState(null);

  // Save gallery images on change
  useEffect(() => {
    localStorage.setItem('ai_image_gallery', JSON.stringify(galleryImages));
  }, [galleryImages]);

  // Helper to add an image to gallery if not already present
  const addToGallery = (src, prompt = '') => {
    setGalleryImages(prev => {
      if (prev.some(img => img.src === src)) return prev;
      return [{ src, prompt, timestamp: Date.now() }, ...prev];
    });
  };

  // Apply Theme to document.body
  useEffect(() => {
    BACKGROUND_THEMES.forEach(t => document.body.classList.remove(t.id));
    document.body.classList.add(currentTheme);
    localStorage.setItem('ai_bg_theme', currentTheme);
  }, [currentTheme]);

  // Handle outside click for theme dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (themePickerRef.current && !themePickerRef.current.contains(event.target)) {
        setShowThemePicker(false);
      }
    };
    if (showThemePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showThemePicker]);

  // Session Management
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(Date.now());

  // Load from LocalStorage on Mount
  useEffect(() => {
    const saved = localStorage.getItem('ai_lexer_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          setSessions(parsed);
          setCurrentSessionId(parsed[0].id);
          setMessages(parsed[0].messages || []);
        }
      } catch (e) {
        console.error("Error loading sessions", e);
      }
    }
  }, []);

  // Save to LocalStorage on Messages Update
  useEffect(() => {
    if (messages.length === 0) return;

    setSessions(prev => {
      let updated = [...prev];
      const idx = updated.findIndex(s => s.id === currentSessionId);
      
      const firstUserMsg = messages.find(m => m.sender === 'user');
      const title = firstUserMsg 
        ? firstUserMsg.text.substring(0, 25) + (firstUserMsg.text.length > 25 ? '...' : '') 
        : 'New Chat';

      if (idx >= 0) {
        updated[idx] = { ...updated[idx], messages, title };
      } else {
        updated.unshift({ id: currentSessionId, messages, title });
      }
      localStorage.setItem('ai_lexer_sessions', JSON.stringify(updated));
      return updated;
    });

    // Detect generated images in AI messages and add them to visual gallery
    messages.forEach(msg => {
      if (msg.sender === 'ai' && msg.text) {
        const matches = [...msg.text.matchAll(/!\[(.*?)\]\((.*?)\)/g)];
        matches.forEach(m => {
          const prompt = m[1];
          const src = m[2];
          if (src) addToGallery(src, prompt);
        });
      }
    });
  }, [messages, currentSessionId]);

  // Speech cleanup on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleVoice = () => {
    setIsVoiceEnabled(prev => {
      const nextVal = !prev;
      localStorage.setItem('ai_voice_enabled', String(nextVal));
      if (!nextVal && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
      }
      return nextVal;
    });
  };

  const handleSpeakText = (text, messageId = null) => {
    if (!('speechSynthesis' in window)) {
      alert("Speech synthesis is not supported on this device/browser.");
      return;
    }

    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const plainText = text.replace(/!\[.*?\]\(.*?\)/g, '').replace(/[#*`_~\[\]()]/g, '');
    if (!plainText.trim()) return;

    const speech = new SpeechSynthesisUtterance(plainText);
    speech.rate = 1.0;
    speech.pitch = 1.0;

    speech.onstart = () => setSpeakingMessageId(messageId);
    speech.onend = () => setSpeakingMessageId(null);
    speech.onerror = () => setSpeakingMessageId(null);

    window.speechSynthesis.speak(speech);
  };

  const handleStopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
  };

  const handleNewSession = () => {
    handleStopSpeech();
    setCurrentSessionId(Date.now());
    setMessages([]);
    setFileContext(null);
    setAttachedImages([]);
  };

  const handleSelectSession = (id) => {
    handleStopSpeech();
    const session = sessions.find(s => s.id === id);
    if (session) {
      setCurrentSessionId(id);
      setMessages(session.messages || []);
      setFileContext(null);
      setAttachedImages([]);
    }
  };

  const handleDeleteSession = (id) => {
    handleStopSpeech();
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== id);
      localStorage.setItem('ai_lexer_sessions', JSON.stringify(updated));
      
      if (id === currentSessionId) {
        if (updated.length > 0) {
          setCurrentSessionId(updated[0].id);
          setMessages(updated[0].messages || []);
        } else {
          setCurrentSessionId(Date.now());
          setMessages([]);
        }
      }
      return updated;
    });
  };

  const handleClearAllSessions = () => {
    handleStopSpeech();
    setSessions([]);
    localStorage.removeItem('ai_lexer_sessions');
    setCurrentSessionId(Date.now());
    setMessages([]);
    setFileContext(null);
    setAttachedImages([]);
  };

  // Upload handler for universal files: documents, spreadsheets, presentations, media & images
  const handleFileUpload = (extractedText, filename, base64, mimeType) => {
    const ext = (filename.split('.').pop() || '').toLowerCase();

    if (mimeType && (mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'heic'].includes(ext))) {
      const newImg = { base64, mimeType, filename, src: `data:${mimeType || 'image/jpeg'};base64,${base64}` };
      setAttachedImages(prev => [...prev, newImg]);
      addToGallery(newImg.src, filename);
      setMessages((prev) => [...prev, {
        id: Date.now(),
        text: `Image "${filename}" attached. You can ask for visual recognition, OCR text extraction, or attach another image for side-by-side comparison.`,
        sender: 'system'
      }]);
    } else if (['xlsx', 'xls', 'csv', 'ods'].includes(ext)) {
      setFileContext({ text: extractedText, filename, base64, mimeType, type: 'spreadsheet' });
      setMessages((prev) => [...prev, {
        id: Date.now(),
        text: `Spreadsheet "${filename}" (XLSX/CSV) ingested into AI Data Analysis context. You can now ask for statistical breakdown, totals, averages, trends, outliers, or graphical charts!`,
        sender: 'system'
      }]);
    } else if (['pptx', 'ppt', 'odp'].includes(ext)) {
      setFileContext({ text: extractedText, filename, base64, mimeType, type: 'presentation' });
      setMessages((prev) => [...prev, {
        id: Date.now(),
        text: `Presentation "${filename}" ingested into AI memory context. You can ask for summary, slide breakdown, structure, or conversion!`,
        sender: 'system'
      }]);
    } else if (['mp3', 'wav', 'm4a', 'mp4', 'mov', 'webm', 'ogg'].includes(ext) || (mimeType && (mimeType.startsWith('audio/') || mimeType.startsWith('video/')))) {
      setFileContext({ text: extractedText, filename, base64, mimeType, type: 'media' });
      setMessages((prev) => [...prev, {
        id: Date.now(),
        text: `Media file "${filename}" staged for analysis and transcription. You can ask for content breakdown or audio analysis!`,
        sender: 'system'
      }]);
    } else {
      // Document file (PDF, TXT, DOCX, MD, RTF, Code)
      setFileContext({ text: extractedText, filename, base64, mimeType, type: 'document' });
      setMessages((prev) => [...prev, {
        id: Date.now(),
        text: `Document "${filename}" (${ext.toUpperCase()}) ingested into AI RAG memory context. You can now ask questions about it!`,
        sender: 'system'
      }]);
    }
  };

  const handleRemoveAttachedImage = (idx) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== idx));
  };

  // Send message with multi-image support
  const handleSendMessage = async (text, imagesToSend = []) => {
    const currentImages = imagesToSend.length > 0 ? imagesToSend : attachedImages;
    if (!text.trim() && currentImages.length === 0) return;

    handleStopSpeech();

    // Check if this is an explicit image generation command
    const isImageGenCommand = /^\/image\s+/i.test(text.trim());
    if (isImageGenCommand) {
      const cleanPrompt = text.trim().replace(/^\/image\s+/i, '');
      handleStudioGenerate({ prompt: cleanPrompt, style: 'realistic', aspectRatio: '1:1' });
      return;
    }

    // Add user message to UI
    const newUserMsg = { 
      id: Date.now(), 
      text: text || (currentImages.length > 1 ? `Analyze and compare these ${currentImages.length} images` : 'Analyze this image'), 
      sender: 'user' 
    };
    setMessages((prev) => [...prev, newUserMsg]);
    setIsTyping(true);

    const history = messages
      .filter(m => m.sender !== 'system')
      .map(m => ({
        role: m.sender === 'ai' ? 'model' : 'user',
        parts: [{ text: m.text }]
      }));

    try {
      const userId = localStorage.getItem('userId');
      const aiResponseId = Date.now() + 1;
      setMessages((prev) => [...prev, { id: aiResponseId, text: '', sender: 'ai' }]);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text, 
          history: history,
          fileContext: fileContext,
          images: currentImages,
          userId: userId || undefined 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Server response was not ok");
      }

      // Reset attached media after sending
      setFileContext(null);
      setAttachedImages([]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              fullText += data.text;
              
              setMessages((prev) => 
                prev.map(msg => 
                  msg.id === aiResponseId ? { ...msg, text: fullText } : msg
                )
              );
            } catch (e) {
              console.error("Error parsing stream chunk:", e);
            }
          }
        }
      }

      if (isVoiceEnabled && fullText.trim()) {
        handleSpeakText(fullText, aiResponseId);
      }

    } catch (error) {
      console.error("Error communicating with backend:", error);
      setMessages((prev) => [...prev, { 
        id: Date.now() + 1, 
        text: "Error communicating with AI engine. Please try again.", 
        sender: 'ai' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Studio: Text-to-Image Generation
  const handleStudioGenerate = async ({ prompt, style = 'realistic', aspectRatio = '1:1', model = 'flux' }) => {
    const seed = Math.floor(Math.random() * 2147483647);
    const imageUrl = `/api/image/generate?prompt=${encodeURIComponent(prompt)}&style=${style}&aspectRatio=${aspectRatio}&model=${model}&seed=${seed}`;

    addToGallery(imageUrl, prompt);

    // Append to messages directly
    const userMsg = { id: Date.now(), text: `Generate image: "${prompt}" (${style})`, sender: 'user' };
    const aiMsg = { 
      id: Date.now() + 1, 
      text: `Here is your high-resolution **${style.toUpperCase()}** generated image:\n\n![${prompt}](${imageUrl})\n\n*Prompt:* ${prompt}\n*Style:* ${style} • *Aspect Ratio:* ${aspectRatio}`, 
      sender: 'ai' 
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);
  };

  // Studio: Image-to-Image AI Editing
  const handleStudioEdit = async ({ image, instruction, style = 'realistic', aspectRatio = '1:1', model = 'flux' }) => {
    setIsTyping(true);
    const userMsg = { id: Date.now(), text: `Edit Image: "${instruction}"`, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);

    try {
      const imageBase64 = image.src || image;
      const response = await fetch('/api/image/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType: image.mimeType || 'image/jpeg',
          instruction,
          style,
          aspectRatio,
          model
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to edit image');

      addToGallery(data.editedImageUrl, `${instruction} (Edited)`);

      const aiMsg = {
        id: Date.now() + 1,
        text: `Here is your edited image based on: **"${instruction}"**:\n\n![${instruction}](${data.editedImageUrl})\n\n*Refined Prompt:* ${data.refinedPrompt}`,
        sender: 'ai'
      };
      setMessages(prev => [...prev, aiMsg]);

    } catch (err) {
      console.error('Edit error:', err);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: `Image edit error: ${err.message}`,
        sender: 'ai'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Quick Action: Regenerate variation of an image
  const handleRegenerateImage = (src, prompt, style) => {
    const newSeed = Math.floor(Math.random() * 2147483647);
    let newUrl = src;
    try {
      const u = new URL(src, window.location.origin);
      u.searchParams.set('seed', newSeed);
      newUrl = u.toString();
    } catch (e) {
      newUrl = `/api/image/generate?prompt=${encodeURIComponent(prompt)}&seed=${newSeed}`;
    }

    addToGallery(newUrl, `${prompt} (Variation)`);

    const aiMsg = {
      id: Date.now(),
      text: `Here is a new variation for: **"${prompt}"**:\n\n![${prompt}](${newUrl})`,
      sender: 'ai'
    };
    setMessages(prev => [...prev, aiMsg]);
  };

  // Quick Action: Open Edit in Studio for this image
  const handleOpenEditForImage = (src, prompt) => {
    setStudioInitialImage({ src, prompt });
    setStudioInitialPrompt(`Refine "${prompt}": `);
    setIsStudioOpen(true);
  };

  // Quick Action: Analyze / OCR this image
  const handleAnalyzeImage = (src, prompt) => {
    handleSendMessage(`Analyze this image in detail: identify all objects, scene layout, colors, extract all visible text via OCR, and describe the composition. [Image Reference: ${src}]`);
  };

  const handleDeleteGalleryItem = (idx) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <>
      <Sidebar 
        sessions={sessions} 
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onClearAllSessions={handleClearAllSessions}
        onOpenGallery={() => setIsGalleryOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="chat-page">
        {/* Top Control Bar */}
        <header className="chat-topbar">
          <div className="topbar-left">
            <button 
              className="mobile-menu-btn" 
              onClick={() => setIsSidebarOpen(true)}
              title="Open Chat History"
            >
              <Menu size={20} />
            </button>
            <div className="topbar-brand">
              <Bot size={20} color="#6366f1" />
              <span className="brand-name">AI LEXER</span>
              <span className="multimodal-badge">MULTIMODAL</span>
            </div>
          </div>

          <div className="topbar-right">
            {/* Visual Studio Button */}
            <button 
              className="topbar-btn studio-btn"
              onClick={() => {
                setStudioInitialImage(null);
                setStudioInitialPrompt('');
                setIsStudioOpen(true);
              }}
              title="Open AI Multimodal Studio (Generate & Edit Images)"
            >
              <Sparkles size={15} color="#a5b4fc" />
              <span className="btn-label">AI Studio</span>
            </button>

            {/* Gallery Button */}
            <button 
              className="topbar-btn gallery-btn"
              onClick={() => setIsGalleryOpen(true)}
              title="View Visual Gallery"
            >
              <Images size={15} />
              <span className="btn-label">Gallery</span>
              {galleryImages.length > 0 && <span className="gallery-count">{galleryImages.length}</span>}
            </button>

            {/* Voice On/Off Toggle Button */}
            <button 
              className={`topbar-btn voice-toggle-btn ${isVoiceEnabled ? 'voice-on' : 'voice-off'}`}
              onClick={handleToggleVoice}
              title={isVoiceEnabled ? "Voice is ON (Click to Mute)" : "Voice is OFF (Click to Enable)"}
            >
              {isVoiceEnabled ? (
                <>
                  <Volume2 size={15} />
                  <span className="btn-label">Voice ON</span>
                  <span className="status-dot on"></span>
                </>
              ) : (
                <>
                  <VolumeX size={15} />
                  <span className="btn-label">Voice OFF</span>
                  <span className="status-dot off"></span>
                </>
              )}
            </button>

            {/* Stop Voice button when active */}
            {speakingMessageId && (
              <button 
                className="topbar-btn stop-voice-btn" 
                onClick={handleStopSpeech}
                title="Stop Reading Aloud"
              >
                <Square size={13} />
                <span className="btn-label">Stop Voice</span>
              </button>
            )}

            {/* Background Theme Selector */}
            <div className="theme-picker-wrapper" ref={themePickerRef}>
              <button 
                className="topbar-btn theme-btn"
                onClick={() => setShowThemePicker(prev => !prev)}
                title="Change Background Theme"
              >
                <Palette size={15} />
                <span className="btn-label">Theme</span>
              </button>

              {showThemePicker && (
                <div className="theme-dropdown-menu">
                  <div className="theme-dropdown-header">
                    <Sparkles size={13} color="#6366f1" />
                    <span>Select Background</span>
                  </div>
                  <div className="theme-options-grid">
                    {BACKGROUND_THEMES.map(theme => (
                      <button
                        key={theme.id}
                        className={`theme-option-item ${currentTheme === theme.id ? 'active' : ''}`}
                        onClick={() => {
                          setCurrentTheme(theme.id);
                          setShowThemePicker(false);
                        }}
                      >
                        <span 
                          className="theme-color-preview" 
                          style={{ background: theme.color }}
                        />
                        <span className="theme-name">{theme.name}</span>
                        {currentTheme === theme.id && <Check size={14} className="theme-check" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="empty-state">
              <Bot size={64} color="#6366f1" />
              <h1>Multimodal AI Intelligence</h1>
              <p>Generate 4K/3D/anime images, perform natural language image edits, extract OCR text, recognize objects, and chat with lightning-fast reasoning.</p>
              <div className="quick-start-chips">
                <button 
                  className="quick-chip"
                  onClick={() => handleStudioGenerate({ prompt: 'Futuristic cyberpunk skyline in neon rain, 4k ultra-detailed', style: 'cinematic' })}
                >
                  <Sparkles size={14} /> Generate 4K Cyberpunk City
                </button>
                <button 
                  className="quick-chip"
                  onClick={() => handleStudioGenerate({ prompt: 'Cute 3D isometric room with glowing holographic screens and plants', style: '3d' })}
                >
                  <Layers size={14} /> 3D Octane Render
                </button>
                <button 
                  className="quick-chip"
                  onClick={() => setIsStudioOpen(true)}
                >
                  🎨 Open Image Studio
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              msg.sender === 'system' ? (
                <div key={msg.id} className="system-message">
                  <FileText size={16} style={{marginRight: '8px'}} />
                  {msg.text}
                </div>
              ) : (
                <MarkdownMessage 
                  key={msg.id} 
                  messageId={msg.id}
                  text={msg.text} 
                  sender={msg.sender} 
                  onSpeak={(text, id) => handleSpeakText(text, id)}
                  isSpeakingThis={speakingMessageId === msg.id}
                  onRegenerateImage={handleRegenerateImage}
                  onEditImage={handleOpenEditForImage}
                  onAnalyzeImage={handleAnalyzeImage}
                />
              )
            ))
          )}
          
          {isTyping && (
            <div className="message-container ai">
              <div className="avatar">
                <Bot size={20} color="#fff" />
              </div>
              <div className="message-bubble">
                <div className="typing-indicator">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="input-area-wrapper">
          <ChatInput 
            onSendMessage={handleSendMessage} 
            onFileUpload={handleFileUpload} 
            onOpenStudio={() => {
              setStudioInitialImage(null);
              setStudioInitialPrompt('');
              setIsStudioOpen(true);
            }}
            attachedImages={attachedImages}
            onRemoveAttachedImage={handleRemoveAttachedImage}
          />
        </div>
      </div>

      {/* AI Multimodal Studio Modal (Generation & Editing) */}
      <ImageStudioModal 
        isOpen={isStudioOpen}
        onClose={() => setIsStudioOpen(false)}
        onGenerate={handleStudioGenerate}
        onEdit={handleStudioEdit}
        initialPrompt={studioInitialPrompt}
        initialImage={studioInitialImage}
      />

      {/* Visual Gallery Modal */}
      <ImageGalleryModal 
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        images={galleryImages}
        onSelectImage={(src) => {
          handleSendMessage(`Analyze this image from my gallery: ${src}`);
          setIsGalleryOpen(false);
        }}
        onDeleteImage={handleDeleteGalleryItem}
        onEditImage={(img) => {
          setStudioInitialImage(img);
          setStudioInitialPrompt(`Edit "${img.prompt || 'image'}": `);
          setIsStudioOpen(true);
        }}
      />
    </>
  );
};

export default ChatPage;
