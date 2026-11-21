import React, { useState } from 'react';
import { 
  Sparkles, 
  Wand2, 
  X, 
  Image as ImageIcon, 
  Sliders, 
  Layers, 
  Send,
  Zap
} from 'lucide-react';

const STYLES = [
  { id: 'realistic', label: '4K Realistic', desc: 'True-to-life photography' },
  { id: 'cinematic', label: 'Cinematic', desc: '70mm IMAX film still' },
  { id: '3d', label: '3D Render', desc: 'Unreal Engine 5 Octane' },
  { id: 'anime', label: 'Anime & Manga', desc: 'Shinkai & Ghibli aesthetic' },
  { id: 'fantasy', label: 'Fantasy Art', desc: 'Epic concept painting' },
  { id: 'scifi', label: 'Sci-Fi Cyber', desc: 'Futuristic high-tech' },
  { id: 'product', label: 'Product Photo', desc: 'Commercial studio lighting' },
  { id: 'architecture', label: 'Architecture', desc: 'Modern interior & exterior' },
  { id: 'portrait', label: 'Portrait', desc: 'Studio lighting & sharp focus' },
  { id: 'landscape', label: 'Landscape', desc: 'National Geographic vistas' },
  { id: 'logo', label: 'Minimal Logo', desc: 'Clean vector emblem' }
];

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1 Square', icon: '■' },
  { id: '16:9', label: '16:9 Wide', icon: '▬' },
  { id: '9:16', label: '9:16 Story', icon: '▮' },
  { id: '4:3', label: '4:3 Classic', icon: '▭' },
  { id: '21:9', label: '21:9 Cinema', icon: '━' }
];

const PROMPT_INSPIRATIONS = [
  "Futuristic cyberpunk city street in neon rain with reflections",
  "Close-up studio portrait of a majestic snow leopard with sapphire eyes",
  "Ultra-detailed 3D isometric cyberpunk hacker room with glowing screens",
  "Serene Studio Ghibli style cottage in a sunlit valley of wildflowers",
  "Luxury sports watch on dark obsidian slate with dramatic water splashes",
  "Modern minimalist architecture villa with infinity pool at golden hour"
];

const ImageStudioModal = ({ 
  isOpen, 
  onClose, 
  onGenerate, 
  onEdit, 
  initialPrompt = '', 
  initialImage = null 
}) => {
  const [activeTab, setActiveTab] = useState(initialImage ? 'edit' : 'generate');
  const [prompt, setPrompt] = useState(initialPrompt);
  const [editInstruction, setEditInstruction] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('realistic');
  const [selectedRatio, setSelectedRatio] = useState('1:1');
  const [selectedModel, setSelectedModel] = useState('flux');
  const [editImage, setEditImage] = useState(initialImage);

  if (!isOpen) return null;

  const handleGenerateSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    onGenerate({
      prompt: prompt.trim(),
      style: selectedStyle,
      aspectRatio: selectedRatio,
      model: selectedModel
    });
    onClose();
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editInstruction.trim()) return;

    onEdit({
      image: editImage,
      instruction: editInstruction.trim(),
      style: selectedStyle,
      aspectRatio: selectedRatio,
      model: selectedModel
    });
    onClose();
  };

  return (
    <div className="studio-modal-backdrop" onClick={onClose}>
      <div className="studio-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="studio-modal-header">
          <div className="studio-title-area">
            <Sparkles size={20} color="#6366f1" />
            <h3>AI Multimodal Studio</h3>
          </div>
          <button className="studio-close-btn" onClick={onClose} title="Close Studio">
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="studio-tabs">
          <button 
            className={`studio-tab ${activeTab === 'generate' ? 'active' : ''}`}
            onClick={() => setActiveTab('generate')}
          >
            <Sparkles size={14} />
            <span>Text to Image</span>
          </button>
          <button 
            className={`studio-tab ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => setActiveTab('edit')}
          >
            <Wand2 size={14} />
            <span>AI Image Edit</span>
          </button>
        </div>

        {/* Form Body */}
        {activeTab === 'generate' ? (
          <form onSubmit={handleGenerateSubmit} className="studio-form">
            <div className="form-group">
              <label>Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to generate in detail..."
                rows={3}
                required
              />
              <div className="prompt-chips">
                <span className="chips-label">Inspirations:</span>
                {PROMPT_INSPIRATIONS.slice(0, 3).map((item, idx) => (
                  <button 
                    type="button" 
                    key={idx} 
                    className="chip-btn"
                    onClick={() => setPrompt(item)}
                  >
                    {item.slice(0, 32)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Style Selector */}
            <div className="form-group">
              <label>Visual Style</label>
              <div className="studio-styles-grid">
                {STYLES.map((st) => (
                  <button
                    type="button"
                    key={st.id}
                    className={`style-pill ${selectedStyle === st.id ? 'active' : ''}`}
                    onClick={() => setSelectedStyle(st.id)}
                  >
                    <span className="style-title">{st.label}</span>
                    <span className="style-desc">{st.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio & Model Selection */}
            <div className="form-row">
              <div className="form-group flex-1">
                <label>Aspect Ratio</label>
                <div className="ratio-selector">
                  {ASPECT_RATIOS.map((r) => (
                    <button
                      type="button"
                      key={r.id}
                      className={`ratio-btn ${selectedRatio === r.id ? 'active' : ''}`}
                      onClick={() => setSelectedRatio(r.id)}
                    >
                      <span className="ratio-icon">{r.icon}</span>
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group flex-1">
                <label>Engine Quality</label>
                <div className="model-selector">
                  <button
                    type="button"
                    className={`model-btn ${selectedModel === 'flux' ? 'active' : ''}`}
                    onClick={() => setSelectedModel('flux')}
                  >
                    <Sparkles size={13} />
                    <span>FLUX (Ultra-HD)</span>
                  </button>
                  <button
                    type="button"
                    className={`model-btn ${selectedModel === 'turbo' ? 'active' : ''}`}
                    onClick={() => setSelectedModel('turbo')}
                  >
                    <Zap size={13} />
                    <span>Turbo (Fastest)</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="studio-footer">
              <button type="submit" className="studio-submit-btn">
                <Sparkles size={16} />
                <span>Generate Image</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleEditSubmit} className="studio-form">
            <div className="form-group">
              <label>Target Image for Editing</label>
              {editImage ? (
                <div className="edit-image-preview">
                  <img src={editImage.src || editImage} alt="To Edit" />
                  <button 
                    type="button" 
                    className="remove-edit-img" 
                    onClick={() => setEditImage(null)}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="upload-dropzone">
                  <input
                    type="file"
                    accept="image/*"
                    id="edit-file-upload"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setEditImage({
                            src: ev.target.result,
                            mimeType: file.type,
                            filename: file.name
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label htmlFor="edit-file-upload" className="dropzone-label">
                    <ImageIcon size={28} />
                    <span>Upload an image to modify</span>
                  </label>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Natural Language Instruction</label>
              <textarea
                value={editInstruction}
                onChange={(e) => setEditInstruction(e.target.value)}
                placeholder="e.g., 'Change background to a tropical beach at sunset', 'Make the car red', 'Remove the background person', 'Add neon lighting'..."
                rows={3}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label>Style Mode</label>
                <select 
                  value={selectedStyle} 
                  onChange={(e) => setSelectedStyle(e.target.value)}
                  className="studio-select"
                >
                  {STYLES.map(st => (
                    <option key={st.id} value={st.id}>{st.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group flex-1">
                <label>Aspect Ratio</label>
                <select 
                  value={selectedRatio} 
                  onChange={(e) => setSelectedRatio(e.target.value)}
                  className="studio-select"
                >
                  {ASPECT_RATIOS.map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="studio-footer">
              <button type="submit" className="studio-submit-btn edit">
                <Wand2 size={16} />
                <span>Apply AI Edit</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ImageStudioModal;
