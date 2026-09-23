import React from 'react';
import { Layers } from 'lucide-react';

const EmptyState = ({
  icon: Icon = Layers,
  title = 'No items found',
  description = 'Get started by creating your first item.',
  actionLabel,
  onAction,
}) => {
  return (
    <div className="empty-state">
      <div className="empty-icon-box">
        <Icon size={28} />
      </div>
      <div className="empty-title">{title}</div>
      <div className="empty-desc">{description}</div>
      {actionLabel && onAction && (
        <button className="btn btn-primary btn-sm" onClick={onAction} style={{ marginTop: '8px' }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
