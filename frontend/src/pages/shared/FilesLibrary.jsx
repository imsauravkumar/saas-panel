import { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen,
  FileText,
  Search,
  Download,
  Grid,
  List,
  Hash,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import api from '../../services/api';
import Avatar from '../../components/Avatar';

const FilesLibrary = ({ groups = [], onSelectGroup: _onSelectGroup }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [fileType, setFileType] = useState('all'); // 'all', 'photo', 'document'
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [previewImage, setPreviewImage] = useState(null);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/files?limit=100';
      if (selectedGroup) url += `&groupId=${selectedGroup}`;
      if (fileType !== 'all') url += `&type=${fileType}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const res = await api.get(url);
      if (res.data.success) {
        setFiles(res.data.files || []);
      }
    } catch (err) {
      console.error('Failed to load files:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedGroup, fileType, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFiles();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchFiles]);

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const photoCount = files.filter((f) => f.type === 'photo').length;
  const docCount = files.filter((f) => f.type === 'document').length;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-title">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FolderOpen size={26} color="var(--color-primary)" />
            Files Hub
          </h1>
        </div>

        {/* View Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            padding: '4px',
            border: '1px solid var(--color-border)',
          }}
        >
          <button
            onClick={() => setViewMode('grid')}
            className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Grid size={15} /> Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <List size={15} /> List
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          background: 'var(--color-surface)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Left Filters */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            flex: '1 1 auto',
          }}
        >
          {/* Channel Selector */}
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="form-select"
            style={{ minWidth: '160px', height: '36px', fontSize: '13px' }}
          >
            <option value="">All Channels ({groups.length})</option>
            {groups.map((g) => (
              <option key={g._id} value={g._id}>
                #{g.name}
              </option>
            ))}
          </select>

          {/* Type Toggle Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFileType('all')}
              className={`btn btn-sm ${fileType === 'all' ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ fontSize: '12px', borderRadius: 'var(--radius-full)' }}
            >
              All Files ({files.length})
            </button>
            <button
              onClick={() => setFileType('photo')}
              className={`btn btn-sm ${fileType === 'photo' ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ fontSize: '12px', borderRadius: 'var(--radius-full)' }}
            >
              📷 Photos ({photoCount})
            </button>
            <button
              onClick={() => setFileType('document')}
              className={`btn btn-sm ${fileType === 'document' ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ fontSize: '12px', borderRadius: 'var(--radius-full)' }}
            >
              📄 Documents ({docCount})
            </button>
          </div>
        </div>

        {/* Right Search Input */}
        <div className="search-input-box" style={{ flex: '1 1 200px', maxWidth: '300px' }}>
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-tertiary)',
                cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '16px',
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`skel-file-${i}`}
              className="card"
              style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '0 0 14px 0',
              }}
            >
              <div className="skeleton-shimmer" style={{ height: '140px', width: '100%' }} />
              <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="skeleton-shimmer" style={{ height: '15px', width: '70%', borderRadius: '4px' }} />
                <div className="skeleton-shimmer" style={{ height: '12px', width: '45%', borderRadius: '4px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <div className="skeleton-shimmer" style={{ height: '22px', width: '22px', borderRadius: '50%' }} />
                  <div className="skeleton-shimmer" style={{ height: '26px', width: '70px', borderRadius: 'var(--radius-sm)' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : files.length === 0 ? (
        /* Empty State */
        <div
          className="card"
          style={{
            padding: '60px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'var(--color-surface)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-surface-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <FolderOpen size={32} color="var(--color-text-tertiary)" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>
            No Files Found
          </h3>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: '14px',
              maxWidth: '420px',
              marginTop: '6px',
            }}
          >
            {searchQuery || selectedGroup || fileType !== 'all'
              ? 'No files match your current filter criteria. Try broadening your search or switching channels.'
              : 'No documents or photos have been shared in your channels yet. Upload files directly in group chats to see them here!'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '20px',
          }}
        >
          {files.map((file) => {
            const isImage = file.type === 'photo';
            return (
              <div
                key={file._id}
                className="card"
                style={{
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {/* Thumbnail Header */}
                <div
                  style={{
                    height: '140px',
                    background: isImage ? '#0B0F19' : 'rgba(99, 102, 241, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: isImage ? 'pointer' : 'default',
                  }}
                  onClick={() => isImage && setPreviewImage(file.fileUrl)}
                >
                  {isImage ? (
                    <img
                      src={file.fileUrl}
                      alt={file.fileName || 'Photo'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <FileText size={48} color="var(--color-primary)" style={{ opacity: 0.8 }} />
                  )}

                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: 'rgba(15, 23, 42, 0.75)',
                      backdropFilter: 'blur(4px)',
                      borderRadius: 'var(--radius-full)',
                      padding: '2px 8px',
                      fontSize: '11px',
                      color: '#F8FAFC',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {isImage ? <ImageIcon size={12} /> : <FileText size={12} />}
                    {file.fileSize ? formatFileSize(file.fileSize) : isImage ? 'Image' : 'Document'}
                  </div>
                </div>

                {/* File Details */}
                <div
                  style={{
                    padding: '14px 16px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <h4
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--color-text)',
                        marginBottom: '6px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={file.fileName || 'Shared Asset'}
                    >
                      {file.fileName || (isImage ? 'Photo Image' : 'Document')}
                    </h4>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        color: 'var(--color-text-secondary)',
                        marginBottom: '10px',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Hash size={13} color="var(--color-text-tertiary)" />
                        {file.groupId?.name || 'Channel'}
                      </span>
                      <span>•</span>
                      <span>{formatDate(file.createdAt)}</span>
                    </div>
                  </div>

                  {/* Uploader & Download Button */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '10px',
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Avatar name={file.senderId?.name} src={file.senderId?.avatar} size="xs" />
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)',
                          maxWidth: '100px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {file.senderId?.name?.split(' ')[0] || 'Member'}
                      </span>
                    </div>

                    <a
                      href={file.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={file.fileName || true}
                      className="btn btn-ghost btn-sm"
                      style={{
                        padding: '4px 8px',
                        color: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                      }}
                    >
                      <Download size={14} /> Download
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div
          className="card"
          style={{
            background: 'var(--color-surface)',
            padding: 0,
            overflow: 'hidden',
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table
              className="table"
              style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse' }}
            >
              <thead>
                <tr
                  style={{
                    background: 'var(--color-surface-hover)',
                    textAlign: 'left',
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                    textTransform: 'uppercase',
                  }}
                >
                  <th style={{ padding: '14px 16px' }}>File Name</th>
                  <th style={{ padding: '14px 16px' }}>Channel</th>
                  <th style={{ padding: '14px 16px' }}>Uploaded By</th>
                  <th style={{ padding: '14px 16px' }}>Size</th>
                  <th style={{ padding: '14px 16px' }}>Date</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => {
                  const isImage = file.type === 'photo';
                  return (
                    <tr
                      key={file._id}
                      style={{ borderBottom: '1px solid var(--color-border)', fontSize: '13px' }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: 'var(--radius-sm)',
                              background: isImage
                                ? 'rgba(59, 130, 246, 0.12)'
                                : 'rgba(99, 102, 241, 0.12)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: isImage ? '#3B82F6' : 'var(--color-primary)',
                              cursor: isImage ? 'pointer' : 'default',
                            }}
                            onClick={() => isImage && setPreviewImage(file.fileUrl)}
                          >
                            {isImage ? <ImageIcon size={16} /> : <FileText size={16} />}
                          </div>
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                color: 'var(--color-text)',
                                maxWidth: '280px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {file.fileName || (isImage ? 'Photo Image' : 'Document')}
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                              {file.fileMimeType || (isImage ? 'image/png' : 'application/pdf')}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                        #{file.groupId?.name || 'Channel'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Avatar
                            name={file.senderId?.name}
                            src={file.senderId?.avatar}
                            size="xs"
                          />
                          <span style={{ color: 'var(--color-text)' }}>
                            {file.senderId?.name || 'Member'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                        {formatFileSize(file.fileSize)}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                        {formatDate(file.createdAt)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={file.fileName || true}
                          className="btn btn-sm btn-ghost"
                          style={{ color: 'var(--color-primary)', gap: '4px' }}
                        >
                          <Download size={14} /> Download
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {previewImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '24px',
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div
            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: 0,
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              <X size={28} />
            </button>
            <img
              src={previewImage}
              alt="Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                borderRadius: 'var(--radius-lg)',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FilesLibrary;
