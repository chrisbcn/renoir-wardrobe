// DetectedItemCard.js - Display detected item with recreate option
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
  return (
    <div className="card mb-lg">
      <div className="flex items-start gap-md mb-md">
        <div 
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center"
          style={{ 
            border: '1px solid #232323',
            fontFamily: 'Playfair Display',
            fontWeight: 600,
            fontSize: '18px'
          }}
        >
          {index + 1}
        </div>
        <div className="flex-1">
          <h3 className="heading-3" style={{ marginBottom: '4px' }}>
            {item.type}
          </h3>
          {item.color && (
            <p className="body-small" style={{ color: '#666', marginBottom: '4px' }}>
              {item.color}
            </p>
          )}
          <p className="body-small" style={{ color: '#666' }}>
            {item.confidence}% confidence
          </p>
        </div>
      </div>

      {item.description && (
        <p className="body-text mb-lg" style={{ color: '#232323' }}>
          {item.description}
        </p>
      )}

      {/* Recreated Image Preview */}
      {isRecreated && recreatedData && (
        <button
          onClick={() => onViewRecreation(item)}
          className="mb-lg"
          style={{ 
            width: '100%', 
            padding: 0, 
            border: '1px solid #232323',
            background: 'none',
            cursor: 'pointer'
          }}
        >
          <img 
            src={recreatedData.recreatedImageUrl}
            alt={`Recreated ${item.type}`}
            style={{ width: '100%', display: 'block' }}
          />
          <div className="p-md" style={{ textAlign: 'left' }}>
            <p className="body-small" style={{ color: '#666' }}>
              ✓ Recreated • Tap to view
            </p>
          </div>
        </button>
      )}

      {/* Recreate Button */}
      {!isRecreated && (
        <button
          onClick={() => onRecreate(item)}
          disabled={isRecreating}
          className="btn btn-full"
        >
          {isRecreating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="spinner"></span>
              Recreating...
            </span>
          ) : (
            '🎨 Recreate Item'
          )}
        </button>
      )}
    </div>
  );
};

export default DetectedItemCard;

