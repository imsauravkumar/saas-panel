import React, { useState, useEffect } from 'react';

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #4f46e5, #6366f1)',
  'linear-gradient(135deg, #0284c7, #38bdf8)',
  'linear-gradient(135deg, #059669, #34d399)',
  'linear-gradient(135deg, #d97706, #fbbf24)',
  'linear-gradient(135deg, #7c3aed, #a78bfa)',
  'linear-gradient(135deg, #e11d48, #fb7185)',
  'linear-gradient(135deg, #0d9488, #2dd4bf)',
];

const getGradient = (str) => {
  if (!str) return AVATAR_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
};

const Avatar = ({ name = 'User', src = '', size = 'md', isOnline = false, className = '', style = {}, imgStyle = {} }) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const getInitials = (n) => {
    if (!n) return 'U';
    const parts = n.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return n.slice(0, 1).toUpperCase();
  };

  let sizeClass = '';
  if (size === 'xs') sizeClass = 'avatar-xs';
  else if (size === 'sm') sizeClass = 'avatar-sm';
  else if (size === 'md') sizeClass = 'avatar-md';
  else if (size === 'lg') sizeClass = 'avatar-lg';
  else if (size === 'xl') sizeClass = 'avatar-xl';
  else if (size === '2xl') sizeClass = 'avatar-2xl';

  const showImage = Boolean(src && !imgError);

  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexShrink: 0, borderRadius: 'var(--radius-full)', ...style }}>
      {showImage ? (
        <img
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          className={`avatar ${sizeClass} ${className}`}
          style={{ ...imgStyle }}
        />
      ) : (
        <div
          className={`avatar ${sizeClass} ${className}`}
          style={{ background: getGradient(name), ...imgStyle }}
          title={name}
        >
          {getInitials(name)}
        </div>
      )}
      {isOnline && (
        <span
          className="presence-dot"
          style={{
            position: 'absolute',
            bottom: '1px',
            right: '1px',
          }}
          title="Online"
        />
      )}
    </div>
  );
};

export default Avatar;
