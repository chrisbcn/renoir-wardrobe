// DetectedItemCard.js - Compact card for 2-column grid
import React from 'react';

const DetectedItemCard = ({ 
  item, 
  index,
  isRecreating,
  isRecreated,
  recreatedData,
  onRecreate,
  onViewRecreation
}) => {
  // Truncate description for compact view
  const truncateText = (text, maxLength = 80) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="card-compact">
      {/* Recreated Image Preview - takes full space if available */}
      {isRecreated && recreatedData ? (
        <button
          onClick={() => onViewRecreation(item)}
          style={{ 
            width: '100%', 
            padding: 0, 
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            marginBottom: '12px'
          }}
        >
          <img 
            src={recreatedData.recreatedImageUrl}
            alt={`Recreated ${item.type}`}
            style={{ width: '100%', display: 'block', border: '1px solid #232323' }}
          />
        </button>
      ) : (
        <div style={{ 
          width: '100%', 
          aspectRatio: '1',
          background: '#F6F6EF',
          marginBottom: '12px',
          border: '1px solid #232323'
        }} />
      )}

      {/* Compact Description */}
      <p className="body-small" style={{ 
        color: '#232323', 
        marginBottom: '12px',
        lineHeight: '1.4',
        minHeight: '40px'
      }}>
        {truncateText(item.description || `${item.color || ''} ${item.type || ''}`.trim())}
      </p>

      {/* Recreate Button - Compact */}
      {!isRecreated && (
        <button
          onClick={() => onRecreate(item)}
          disabled={isRecreating}
          className="btn-compact"
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #232323',
            background: 'transparent',
            cursor: isRecreating ? 'not-allowed' : 'pointer',
            opacity: isRecreating ? 0.5 : 1
          }}
        >
          {isRecreating ? 'Recreating...' : 'Recreate'}
        </button>
      )}
    </div>
  );
};

export default DetectedItemCard;
