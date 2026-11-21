import React, { useState } from 'react';
import { MessageSquarePlus, Trash2, X, Images, AlertTriangle } from 'lucide-react';

const Sidebar = ({ 
  sessions = [], 
  currentSessionId, 
  onSelectSession, 
  onNewSession, 
  onDeleteSession,
  onClearAllSessions,
  onOpenGallery,
  isOpen,
  onClose
}) => {
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const handleConfirmClearAll = () => {
    if (onClearAllSessions) {
      onClearAllSessions();
    }
    setShowConfirmClear(false);
    if (onClose) onClose();
  };

  return (
    <>
      {isOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={onClose} 
          aria-label="Close sidebar"
        />
      )}
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/logo.png" alt="AI LEXER Logo" style={{ width: 32, height: 32, borderRadius: 8 }} />
            <span>AI LEXER</span>
          </div>
          {onClose && (
            <button className="mobile-close-btn" onClick={onClose} title="Close Sidebar">
              <X size={20} />
            </button>
          )}
        </div>
        
        <div className="sidebar-quick-actions">
          <button className="new-chat-btn" onClick={() => { onNewSession(); if (onClose) onClose(); }}>
            <MessageSquarePlus size={18} />
            New Chat
          </button>

          {onOpenGallery && (
            <button className="sidebar-nav-btn gallery-btn" onClick={() => { onOpenGallery(); if (onClose) onClose(); }}>
              <Images size={16} />
              <span>Image Gallery</span>
            </button>
          )}
        </div>

        <div className="history-list">
          <div className="history-section-header">
            <span className="history-section-title">
              Conversations {sessions.length > 0 && `(${sessions.length})`}
            </span>
            {sessions.length > 0 && (
              <button 
                className="clear-all-trigger-btn"
                onClick={() => setShowConfirmClear(true)}
                title="Remove All Chat History"
              >
                <Trash2 size={13} />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {/* Inline Confirmation Card */}
          {showConfirmClear && (
            <div className="confirm-clear-card">
              <div className="confirm-clear-header">
                <AlertTriangle size={15} color="#ef4444" />
                <span>Delete all chats?</span>
              </div>
              <p className="confirm-clear-text">
                This will remove all conversation history permanently.
              </p>
              <div className="confirm-clear-actions">
                <button 
                  className="confirm-btn-delete"
                  onClick={handleConfirmClearAll}
                >
                  Yes, Remove All
                </button>
                <button 
                  className="confirm-btn-cancel"
                  onClick={() => setShowConfirmClear(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {sessions.length === 0 ? (
            <div className="empty-history-text">No previous chats</div>
          ) : (
            sessions.map((session) => (
              <div 
                key={session.id} 
                className={`history-item ${session.id === currentSessionId ? 'active' : ''}`}
              >
                <span 
                  className="history-title"
                  onClick={() => {
                    onSelectSession(session.id);
                    if (onClose) onClose();
                  }}
                >
                  {session.title || 'New Chat'}
                </span>
                <button 
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  title="Delete Chat"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
