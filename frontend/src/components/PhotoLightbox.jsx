import React, { useEffect } from 'react';
import { X, Download, ZoomIn } from 'lucide-react';

const PhotoLightbox = ({ isOpen, onClose, src, alt = 'Image Preview', fileName = 'image.png' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !src) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(11, 15, 25, 0.92)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 180ms ease-out',
        padding: '24px',
      }}
      onClick={onClose}
    >
      {/* Top Controls Bar */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '24px',
          left: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#F8FAFC',
          zIndex: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: '14px', fontWeight: 600, maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {fileName}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <a
            href={src}
            download={fileName}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#FFFFFF', borderColor: 'rgba(255, 255, 255, 0.2)' }}
            title="Download Original"
          >
            <Download size={15} /> Download
          </a>

          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon"
            style={{ width: '36px', height: '36px', color: '#FFFFFF', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            title="Close Lightbox (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Lightbox Image View */}
      <div
        style={{
          maxWidth: '90vw',
          maxHeight: '85vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          style={{
            maxWidth: '100%',
            maxHeight: '85vh',
            objectFit: 'contain',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            userSelect: 'none',
          }}
        />
      </div>
    </div>
  );
};

export default PhotoLightbox;
