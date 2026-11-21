import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  Image as ImageIcon, 
  Paperclip, 
  Sparkles, 
  X,
  Layers
} from 'lucide-react';

const ChatInput = ({ 
  onSendMessage, 
  onFileUpload, 
  onOpenStudio,
  attachedImages = [],
  onRemoveAttachedImage
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const handleSend = () => {
    if (message.trim() || attachedImages.length > 0) {
      onSendMessage(message, attachedImages);
      setMessage('');
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Speech Recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setMessage(transcript);
      
      setTimeout(() => {
        onSendMessage(transcript, attachedImages);
        setMessage('');
      }, 500);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handles Document or Image Upload (supports single or multiple)
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const uploadMsg = `Uploading ${file.name}...`;
        setMessage(uploadMsg);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        const data = await response.json();
        
        if (response.ok) {
          if (onFileUpload) {
            onFileUpload(data.extractedText, file.name, data.base64, data.mimeType);
          }
          setMessage('');
        } else {
          alert(`Upload failed: ${data.error}`);
          setMessage('');
        }
      } catch (error) {
        console.error("Upload error:", error);
        alert("Failed to connect to the server for upload.");
        setMessage('');
      }
    }

    // Reset input value so same file can be uploaded again if needed
    e.target.value = '';
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [message]);

  return (
    <div className="input-container">
      {/* Attached Media Tray (Multi-image preview) */}
      {attachedImages.length > 0 && (
        <div className="attached-media-tray">
          <div className="tray-label">
            <Layers size={13} color="#6366f1" />
            <span>{attachedImages.length} {attachedImages.length === 1 ? 'image' : 'images'} attached (Comparison & Vision enabled)</span>
          </div>
          <div className="attached-thumbnails-list">
            {attachedImages.map((img, idx) => (
              <div key={idx} className="attached-thumbnail-item">
                <img 
                  src={img.base64?.startsWith('data:') ? img.base64 : `data:${img.mimeType || 'image/jpeg'};base64,${img.base64}`} 
                  alt={img.filename || `Image ${idx + 1}`} 
                />
                <span className="thumb-badge">#{idx + 1}</span>
                {onRemoveAttachedImage && (
                  <button 
                    type="button" 
                    className="remove-thumb-btn"
                    onClick={() => onRemoveAttachedImage(idx)}
                    title="Remove Image"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`input-box ${isListening ? 'listening' : ''}`}>
        {/* Hidden inputs */}
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept=".pdf,.doc,.docx,.txt,.rtf,.md,.csv,.xlsx,.xls,.ods,.pptx,.ppt,.odp,.json,.xml,.yaml,.yml,.py,.js,.html,.css,.sql,.mp3,.wav,.m4a,.mp4,.mov,.webm"
          onChange={handleFileUpload} 
        />
        <input 
          type="file" 
          ref={imageInputRef} 
          style={{ display: 'none' }} 
          accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tiff,.heic"
          multiple
          onChange={handleFileUpload} 
        />

        <button className="action-btn" title="Upload Document or Spreadsheet (PDF/DOCX/XLSX/CSV/TXT)" onClick={() => fileInputRef.current.click()}>
          <Paperclip size={20} />
        </button>
        <button className="action-btn" title="Upload Image(s) (OCR / Recognition / Compare)" onClick={() => imageInputRef.current.click()}>
          <ImageIcon size={20} />
        </button>
        {onOpenStudio && (
          <button className="action-btn studio-pill-btn" title="AI Image Studio (Generate & Edit)" onClick={onOpenStudio}>
            <Sparkles size={19} color="#a5b4fc" />
          </button>
        )}
        
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message AI LEXER, generate images (/image ...), or ask questions about files..."
          rows="1"
        />

        {message.trim() || attachedImages.length > 0 ? (
          <button className="action-btn send-btn" onClick={handleSend} title="Send Message">
            <Send size={18} />
          </button>
        ) : (
          <button 
            className={`action-btn ${isListening ? 'listening-btn' : ''}`} 
            onClick={handleVoiceInput} 
            title="Use Voice"
          >
            <Mic size={20} color={isListening ? '#ef4444' : undefined} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatInput;
