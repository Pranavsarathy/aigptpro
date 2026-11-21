import React, { useState } from 'react';
import { 
  Maximize2, 
  RotateCw, 
  Download, 
  Wand2, 
  Search, 
  X, 
  Check, 
  FileImage,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

const ImageCard = ({ 
  src, 
  alt = 'Generated Image', 
  onRegenerate, 
  onEdit, 
  onAnalyze 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState(null);

  // Parse prompt and style if available from URL query params
  let promptText = alt || 'AI Generated Image';
  let styleName = 'realistic';
  try {
    const urlObj = new URL(src, window.location.origin);
    const p = urlObj.searchParams.get('prompt');
    const s = urlObj.searchParams.get('style');
    if (p) promptText = decodeURIComponent(p);
    if (s) styleName = s;
  } catch (e) {}

  const handleDownload = async (format) => {
    try {
      setDownloadingFormat(format);
      const downloadUrl = `/api/image/download?url=${encodeURIComponent(src)}&format=${format}&filename=${encodeURIComponent(promptText.slice(0, 30))}`;
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${promptText.slice(0, 25).replace(/\s+/g, '_')}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setTimeout(() => {
        setDownloadingFormat(null);
        setShowDownloadMenu(false);
      }, 800);
    }
  };

  return (
    <div className="interactive-image-card">
      {/* Image Container with overlay actions */}
      <div className="image-card-wrapper" onClick={() => setIsLightboxOpen(true)}>
        {!isLoaded && !hasError && (
          <div className="image-card-skeleton">
            <div className="skeleton-pulse"></div>
            <span>Rendering high-resolution image...</span>
          </div>
        )}
        
        {hasError ? (
          <div className="image-card-error">
            <FileImage size={32} />
            <span>Image could not be rendered</span>
          </div>
        ) : (
          <img
            src={src}
            alt={alt}
            className={`card-img ${isLoaded ? 'loaded' : 'loading'}`}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
          />
        )}

        <div className="image-hover-overlay">
          <button 
            className="overlay-btn" 
            title="Full-Screen Preview"
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(true);
            }}
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* Action Bar Below Image */}
      <div className="image-card-actions">
        {onRegenerate && (
          <button 
            className="img-action-btn" 
            onClick={(e) => {
              e.stopPropagation();
              onRegenerate(src, promptText, styleName);
            }}
            title="Generate a new variation with a different seed"
          >
            <RotateCw size={13} />
            <span>Variation</span>
          </button>
        )}

        {onEdit && (
          <button 
            className="img-action-btn" 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(src, promptText);
            }}
            title="Edit this image with AI instructions"
          >
            <Wand2 size={13} />
            <span>Edit</span>
          </button>
        )}

        {onAnalyze && (
          <button 
            className="img-action-btn" 
            onClick={(e) => {
              e.stopPropagation();
              onAnalyze(src, promptText);
            }}
            title="Analyze objects, colors, and extract OCR text"
          >
            <Search size={13} />
            <span>Analyze / OCR</span>
          </button>
        )}

        {/* Download Menu */}
        <div className="download-dropdown-wrapper">
          <button 
            className="img-action-btn download-btn" 
            onClick={(e) => {
              e.stopPropagation();
              setShowDownloadMenu(!showDownloadMenu);
            }}
            title="Download image in PNG, JPG, or WebP"
          >
            <Download size={13} />
            <span>Save</span>
          </button>

          {showDownloadMenu && (
            <div className="download-dropdown-menu" onClick={(e) => e.stopPropagation()}>
              <div className="download-menu-title">Select Format</div>
              {['png', 'jpg', 'webp'].map((fmt) => (
                <button
                  key={fmt}
                  className="download-format-item"
                  onClick={() => handleDownload(fmt)}
                >
                  <span className="fmt-label">{fmt.toUpperCase()}</span>
                  {downloadingFormat === fmt && <Check size={13} className="fmt-check" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full-Screen Lightbox Modal */}
      {isLightboxOpen && (
        <div className="lightbox-backdrop" onClick={() => setIsLightboxOpen(false)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-header">
              <span className="lightbox-title">{promptText}</span>
              <div className="lightbox-controls">
                <button 
                  className="lightbox-btn" 
                  onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3))}
                  title="Zoom In"
                >
                  <ZoomIn size={18} />
                </button>
                <button 
                  className="lightbox-btn" 
                  onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
                  title="Zoom Out"
                >
                  <ZoomOut size={18} />
                </button>
                <button 
                  className="lightbox-btn close" 
                  onClick={() => setIsLightboxOpen(false)}
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="lightbox-image-viewport">
              <img 
                src={src} 
                alt={alt} 
                style={{ transform: `scale(${zoomLevel})` }}
                className="lightbox-img" 
              />
            </div>

            <div className="lightbox-footer">
              <button className="lightbox-action-btn" onClick={() => handleDownload('png')}>
                <Download size={15} /> Download PNG
              </button>
              <button className="lightbox-action-btn" onClick={() => handleDownload('jpg')}>
                <Download size={15} /> Download JPG
              </button>
              <button className="lightbox-action-btn" onClick={() => handleDownload('webp')}>
                <Download size={15} /> Download WebP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageCard;
