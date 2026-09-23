import { useState, useRef, useEffect } from 'react';
import { Search, Smile, Heart, ThumbsUp, Sparkles, Coffee } from 'lucide-react';

const EMOJI_CATEGORIES = [
  {
    id: 'frequently',
    label: 'Popular',
    icon: Sparkles,
    emojis: [
      '👍',
      '❤️',
      '😂',
      '🔥',
      '🎉',
      '🙏',
      '👏',
      '😍',
      '✨',
      '💯',
      '🚀',
      '🙌',
      '😊',
      '🥳',
      '😎',
    ],
  },
  {
    id: 'smileys',
    label: 'Smileys',
    icon: Smile,
    emojis: [
      '😀',
      '😃',
      '😄',
      '😁',
      '😆',
      '😅',
      '🤣',
      '😂',
      '🙂',
      '🙃',
      '😉',
      '😊',
      '😇',
      '🥰',
      '😍',
      '🤩',
      '😘',
      '😗',
      '😚',
      '😙',
      '😋',
      '😛',
      '😜',
      '🤪',
      '😝',
      '🤑',
      '🤗',
      '🤭',
      '🤫',
      '🤔',
      '🤐',
      '🤨',
      '😐',
      '😑',
      '😶',
      '😏',
      '😒',
      '🙄',
      '😬',
      '🤥',
      '😌',
      '😔',
      '😪',
      '🤤',
      '😴',
      '😷',
      '🤒',
      '🤕',
      '🤢',
      '🤮',
      '🤧',
      '🥵',
      '🥶',
      '🥴',
      '😵',
      '🤯',
      '🤠',
      '🥳',
      '😎',
      '🤓',
    ],
  },
  {
    id: 'gestures',
    label: 'Gestures',
    icon: ThumbsUp,
    emojis: [
      '👍',
      '👎',
      '👌',
      '✌️',
      '🤞',
      '🤟',
      '🤘',
      '🤙',
      '👈',
      '👉',
      '👆',
      '👇',
      '☝️',
      '✋',
      '🤚',
      '🖐️',
      '🖖',
      '👋',
      '🤝',
      '💪',
      '🙏',
      '✍️',
      '👏',
      '🙌',
    ],
  },
  {
    id: 'hearts',
    label: 'Hearts & Emotions',
    icon: Heart,
    emojis: [
      '❤️',
      '🧡',
      '💛',
      '💚',
      '💙',
      '💜',
      '🖤',
      '🤍',
      '🤎',
      '💔',
      '❣️',
      '💕',
      '💞',
      '💓',
      '💗',
      '💖',
      '💘',
      '💝',
      '💟',
      '💯',
      '💢',
      '💥',
      '💫',
      '💨',
    ],
  },
  {
    id: 'activities',
    label: 'Work & Objects',
    icon: Coffee,
    emojis: [
      '💼',
      '📁',
      '📄',
      '📊',
      '📈',
      '📌',
      '📎',
      '💻',
      '🖥️',
      '📱',
      '💡',
      '⏰',
      '☕',
      '🍕',
      '🎯',
      '🏆',
      '⭐',
      '🌟',
      '⚡',
      '🔥',
      '🚀',
      '✅',
      '❌',
      '⚠️',
    ],
  },
];

const EmojiPickerPopover = ({ isOpen, onClose, onSelectEmoji, position = 'top' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('frequently');
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const allEmojis = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
  const filteredEmojis = searchTerm.trim()
    ? allEmojis.filter((e) => e.includes(searchTerm.trim()))
    : null;

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'absolute',
        bottom: position === 'top' ? '46px' : 'auto',
        top: position === 'bottom' ? '46px' : 'auto',
        left: '0',
        width: '320px',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-dropdown)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        overflow: 'hidden',
        animation: 'slideUp 140ms ease-out',
      }}
    >
      {/* Header Search & Category Nav */}
      <div
        style={{
          padding: '8px 10px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div className="search-input-box" style={{ width: '100%' }}>
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search emoji..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            style={{ fontSize: '12px', padding: '5px 8px 5px 28px' }}
          />
        </div>

        {/* Category Icons */}
        {!searchTerm && (
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'space-between' }}>
            {EMOJI_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: isActive ? 'var(--color-primary-soft)' : 'transparent',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                  title={cat.label}
                >
                  <Icon size={14} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Emoji Grid */}
      <div
        style={{
          maxHeight: '220px',
          overflowY: 'auto',
          padding: '8px',
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
        }}
      >
        {filteredEmojis ? (
          filteredEmojis.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '20px',
                fontSize: '12px',
                color: 'var(--color-text-muted)',
              }}
            >
              No emoji found
            </div>
          ) : (
            filteredEmojis.map((emoji, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onSelectEmoji(emoji);
                  onClose();
                }}
                style={{
                  fontSize: '20px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.1s ease',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {emoji}
              </button>
            ))
          )
        ) : (
          EMOJI_CATEGORIES.find((c) => c.id === activeCategory)?.emojis.map((emoji, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onSelectEmoji(emoji);
                onClose();
              }}
              style={{
                fontSize: '20px',
                background: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.1s ease',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)')
              }
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {emoji}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default EmojiPickerPopover;
