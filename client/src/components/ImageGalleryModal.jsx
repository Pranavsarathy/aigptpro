import React from 'react';
import { 
  X, 
  Download, 
  Trash2, 
  Wand2, 
  Maximize2, 
  Sparkles,
  Images
} from 'lucide-react';

const ImageGalleryModal = ({ 
  isOpen, 
  onClose, 
  images = [], 
  onSelectImage, 
  onDeleteImage,
  onEditImage
}) => {
  if (!isOpen) return null;

  const handleDownload = (src, prompt) => {
    const downloadUrl = `/api/image/download?url=${encodeURIComponent(src)}&format=png&filename=${encodeURIComponent((prompt || 'image').slice(0, 25))}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${(prompt || 'aigpt_image').slice(0, 20).replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="gallery-modal-backdrop" onClick={onClose}>
      <div className="gallery-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="gallery-modal-header">
          <div className="gallery-title-area">
            <Images size={22} color="#6366f1" />
            <div>
              <h3>Visual Gallery & History</h3>
              <p>All AI-generated images and uploaded media</p>
            </div>
          </div>
          <button className="gallery-close-btn" onClick={onClose} title="Close Gallery">
            <X size={20} />
          </button>
        </div>

        <div className="gallery-body">
          {images.length === 0 ? (
            <div className="gallery-empty-state">
              <Sparkles size={48} color="#6366f1" />
              <h4>No images in your gallery yet</h4>
              <p>Generate an image or upload one in chat to see them stored here!</p>
            </div>
          ) : (
            <div className="gallery-grid">
              {images.map((img, idx) => (
                <div key={idx} className="gallery-item-card">
                  <div className="gallery-img-wrapper" onClick={() => onSelectImage && onSelectImage(img.src)}>
                    <img src={img.src} alt={img.prompt || 'Gallery item'} loading="lazy" />
                    <div className="gallery-item-overlay">
                      <Maximize2 size={18} />
                    </div>
                  </div>

                  <div className="gallery-item-info">
                    <p className="gallery-prompt">{img.prompt || 'Uploaded / Generated Media'}</p>
                    <div className="gallery-item-actions">
                      <button 
                        className="gallery-action-btn" 
                        onClick={() => handleDownload(img.src, img.prompt)}
                        title="Download PNG"
                      >
                        <Download size={13} />
                      </button>
                      {onEditImage && (
                        <button 
                          className="gallery-action-btn" 
                          onClick={() => {
                            onEditImage(img);
                            onClose();
                          }}
                          title="Edit in Studio"
                        >
                          <Wand2 size={13} />
                        </button>
                      )}
                      {onDeleteImage && (
                        <button 
                          className="gallery-action-btn delete" 
                          onClick={() => onDeleteImage(idx)}
                          title="Remove from Gallery"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageGalleryModal;
