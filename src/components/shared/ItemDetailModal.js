// ItemDetailModal.js - Full-screen view of recreated item
import React, { useState, useEffect } from 'react';

const ItemDetailModal = ({ 
  item,
  recreatedData,
  allRecreatedItems, // Array of all recreated items for swiping
  onClose,
  onAddToWardrobe,
  onSkip
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // Find current item index in all recreated items
  useEffect(() => {
    if (allRecreatedItems && item) {
      const index = allRecreatedItems.findIndex(i => i.id === item.id);
      if (index !== -1) setCurrentIndex(index);
    }
  }, [item, allRecreatedItems]);

  const currentItem = allRecreatedItems[currentIndex];
  const currentRecreatedData = currentItem ? recreatedData[currentItem.id] : null;
  
  const canSwipe = allRecreatedItems && allRecreatedItems.length > 1;

  // Swipe handlers
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!canSwipe) return;
    
    const swipeThreshold = 50;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0 && currentIndex < allRecreatedItems.length - 1) {
        // Swipe left - next item
        setCurrentIndex(currentIndex + 1);
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe right - previous item
        setCurrentIndex(currentIndex - 1);
      }
    }
  };

  const handleAdd = () => {
    onAddToWardrobe(currentItem, true);
    // Auto-advance to next item or close
    if (canSwipe && currentIndex < allRecreatedItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  if (!currentItem || !currentRecreatedData) return null;

  return (
    <div className="modal-overlay">
      <div 
        className="modal-container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="modal-header">
          <button
            onClick={onClose}
            className="modal-back-button"
          >
            ← Back
          </button>
          {canSwipe && (
            <p className="body-small text-secondary">
              {currentIndex + 1} of {allRecreatedItems.length}
            </p>
          )}
        </div>

        {/* Main Content - Scrollable */}
        <div className="modal-content">
          {/* Image */}
          <div className="modal-image-wrapper">
            <img 
              src={currentRecreatedData.recreatedImageUrl}
              alt={currentItem.type}
              className="full-width-image image-border"
            />
          </div>

          {/* Details */}
          <h2 className="heading-2 mb-md">{currentItem.type}</h2>
          
          {currentItem.color && (
            <p className="body-text mb-sm text-secondary">
              Color: {currentItem.color}
            </p>
          )}
          
          {currentItem.material && (
            <p className="body-text mb-sm text-secondary">
              Material: {currentItem.material}
            </p>
          )}

          {currentItem.description && (
            <p className="body-text mt-lg">
              {currentItem.description}
            </p>
          )}

          <div className="modal-spacer"></div>
        </div>

        {/* Fixed Bottom Actions */}
        <div className="modal-footer">
          <div className="modal-button-group">
            {onSkip && (
              <button
                onClick={() => {
                  onSkip();
                  if (canSwipe && currentIndex < allRecreatedItems.length - 1) {
                    setCurrentIndex(currentIndex + 1);
                  } else {
                    onClose();
                  }
                }}
                className="btn modal-button-skip"
              >
                Skip
              </button>
            )}
            <button
              onClick={handleAdd}
              className="btn btn-primary modal-button-primary"
            >
              Add to Wardrobe
            </button>
          </div>

          {/* Navigation Dots */}
          {canSwipe && (
            <div className="modal-nav-dots">
              {allRecreatedItems.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`modal-nav-dot ${idx === currentIndex ? 'active' : ''}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemDetailModal;
