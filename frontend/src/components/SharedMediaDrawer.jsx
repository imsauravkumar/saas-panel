import React, { useState, useEffect } from 'react';
import { X, Image, FileText, Video, Mic, Pin, Download, ExternalLink, Loader2 } from 'lucide-react';
import api from '../services/api';
import AudioMessagePlayer from './AudioMessagePlayer';
import PhotoLightbox from './PhotoLightbox';

const SharedMediaDrawer = ({ isOpen, onClose, conversationType = 'group', targetId, title = 'Shared Media & Files' }) => {
  const [activeTab, setActiveTab] = useState('media'); // 'media' | 'docs' | 'audio' | 'pinned'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  useEffect(() => {
    if (isOpen && targetId) {
      fetchMedia();
    }
  }, [isOpen, targetId, activeTab]);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      if (activeTab === 'pinned') {
        const url = conversationType === 'group'
          ? `/messages/group/${targetId}`
          : `/messages/direct/${targetId}`;
        const { data } = await api.get(url);
        if (data.success) {
          setItems(data.pinnedMessages || []);
        }
      } else {
        const mediaType = activeTab === 'media' ? 'photo' : activeTab === 'docs' ? 'document' : 'audio';
        const { data } = await api.get(`/messages/media?conversationType=${conversationType}&targetId=${targetId}&mediaType=${mediaType}`);
        if (data.success) {
          setItems(data.media || []);
        }
      }
    } catch (err) {
      console.error('[Fetch Shared Media Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Drawer Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 900,
          animation: 'fadeIn 150ms ease-out',
        }}
      />

      {/* Drawer Surface */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '380px',
          maxWidth: '90vw',
          backgroundColor: 'var(--color-surface)',
          borderLeft: '1px solid var(--color-border)',
          zIndex: 901,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
          animation: 'slideLeft 180ms ease-out',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{title}</h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Files and bookmarks in this chat
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            style={{ width: '32px', height: '32px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', padding: '4px 8px', gap: '4px', backgroundColor: 'var(--color-surface-alt)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`btn btn-ghost btn-sm ${activeTab === 'media' ? 'active' : ''}`}
            style={{
              flex: 1,
              fontSize: '11.5px',
              padding: '6px',
              fontWeight: activeTab === 'media' ? 700 : 500,
              color: activeTab === 'media' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              backgroundColor: activeTab === 'media' ? 'var(--color-surface)' : 'transparent',
            }}
          >
            <Image size={13} /> Photos & Videos
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('docs')}
            className={`btn btn-ghost btn-sm ${activeTab === 'docs' ? 'active' : ''}`}
            style={{
              flex: 1,
              fontSize: '11.5px',
              padding: '6px',
              fontWeight: activeTab === 'docs' ? 700 : 500,
              color: activeTab === 'docs' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              backgroundColor: activeTab === 'docs' ? 'var(--color-surface)' : 'transparent',
            }}
          >
            <FileText size={13} /> Documents
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audio')}
            className={`btn btn-ghost btn-sm ${activeTab === 'audio' ? 'active' : ''}`}
            style={{
              flex: 1,
              fontSize: '11.5px',
              padding: '6px',
              fontWeight: activeTab === 'audio' ? 700 : 500,
              color: activeTab === 'audio' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              backgroundColor: activeTab === 'audio' ? 'var(--color-surface)' : 'transparent',
            }}
          >
            <Mic size={13} /> Voice Notes
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pinned')}
            className={`btn btn-ghost btn-sm ${activeTab === 'pinned' ? 'active' : ''}`}
            style={{
              flex: 1,
              fontSize: '11.5px',
              padding: '6px',
              fontWeight: activeTab === 'pinned' ? 700 : 500,
              color: activeTab === 'pinned' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              backgroundColor: activeTab === 'pinned' ? 'var(--color-surface)' : 'transparent',
            }}
          >
            <Pin size={13} /> Pinned
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: 'var(--color-primary)' }}>
              <Loader2 size={24} className="spin" />
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
              No {activeTab} shared in this conversation yet.
            </div>
          ) : activeTab === 'media' ? (
            /* Media Grid */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {items.map((item) => (
                <div
                  key={item._id}
                  onClick={() => setLightboxSrc(item.fileUrl)}
                  style={{
                    aspectRatio: '1/1',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative',
                    backgroundColor: 'var(--color-surface-alt)',
                  }}
                >
                  <img
                    src={item.fileUrl}
                    alt={item.fileName || 'Shared Media'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ))}
            </div>
          ) : activeTab === 'docs' ? (
            /* Documents List */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {items.map((doc) => (
                <div
                  key={doc._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    backgroundColor: 'var(--color-surface-alt)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <FileText size={20} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {doc.fileName || 'Document'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : 'File'} · {new Date(doc.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  <a
                    href={doc.fileUrl}
                    download={doc.fileName}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost btn-icon"
                    style={{ width: '30px', height: '30px', color: 'var(--color-primary)', flexShrink: 0 }}
                    title="Download document"
                  >
                    <Download size={14} />
                  </a>
                </div>
              ))}
            </div>
          ) : activeTab === 'audio' ? (
            /* Voice Notes List */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {items.map((audio) => (
                <div
                  key={audio._id}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--color-surface-alt)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                    Sent by {audio.senderId?.name || 'Teammate'} on {new Date(audio.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </div>
                  <AudioMessagePlayer src={audio.fileUrl} duration={audio.duration} />
                </div>
              ))}
            </div>
          ) : (
            /* Pinned Messages List */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {items.map((pinned) => (
                <div
                  key={pinned._id}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: 'var(--color-surface-alt)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '3px solid var(--color-warning)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                    <Pin size={12} color="var(--color-warning)" />
                    <span>{pinned.senderId?.name || 'Teammate'}</span>
                    <span style={{ fontSize: '10.5px', opacity: 0.7 }}>{new Date(pinned.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
                    {pinned.content || (pinned.type === 'photo' ? '📷 Photo' : pinned.type === 'video' ? '🎥 Video' : '📄 Document')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox for shared photo clicks */}
      {lightboxSrc && (
        <PhotoLightbox
          src={lightboxSrc}
          fileName="Shared Photo"
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </>
  );
};

export default SharedMediaDrawer;
