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
      {/* Recreated Image or Placeholder with Description */}
      {isRecreated && recreatedData ? (
        <button
          onClick={() => onViewRecreation(item)}
          className="item-image-button"
        >
          <img 
            src={recreatedData.recreatedImageUrl}
            alt={`Recreated ${item.type}`}
            className="item-image"
          />
        </button>
      ) : (
        <div className="item-placeholder">
          <p className="body-small item-description">
            {truncateText(item.description || `${item.color || ''} ${item.type || ''}`.trim())}
          </p>
        </div>
      )}

      {/* Recreate Button - Compact */}
      {!isRecreated && (
        <button
          onClick={() => onRecreate(item)}
          disabled={isRecreating}
          className="btn-compact"
        >
          {isRecreating ? 'Recreating...' : 'Recreate'}
        </button>
      )}
    </div>
  );
};

export default DetectedItemCard;
