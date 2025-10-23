// ItemDetailModal.js - Full-screen view of recreated item
import React, { useState, useEffect } from 'react';
import { ReactComponent as ChevronLeftIcon } from '../../assets/icons/chevron-left-sm 1.svg';

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
    <div className="modal-overlay-fullscreen">
      <div className="mobile-app" style={{ margin: 0, boxShadow: 'none', borderRadius: 0 }}>
        <div 
          className="mobile-content"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Screen Header - Consistent with app */}
          <div className="screen-header">
            <button
              onClick={onClose}
              className="header-button"
            >
              <ChevronLeftIcon style={{ width: '24px', height: '24px' }} />
            </button>
            <h1 className="screen-title">
              {canSwipe ? `${currentIndex + 1} of ${allRecreatedItems.length}` : 'ITEM DETAIL'}
            </h1>
            <div className="header-button" style={{ opacity: 0 }}></div>
          </div>

          {/* Main Content - Scrollable */}
          <div className="mobile-section">
            {/* Image */}
            <div className="mb-2xl" style={{ border: '1px solid var(--color-border)' }}>
              <img 
                src={currentRecreatedData.recreatedImageUrl}
                alt={currentItem.type}
                style={{ width: '100%', display: 'block' }}
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
              <p className="body-text" style={{ marginTop: '20px' }}>
                {currentItem.description}
              </p>
            )}

            {/* Actions */}
            <div style={{ marginTop: '32px', display: 'flex', gap: '12px', flexDirection: 'column' }}>
              <button
                onClick={handleAdd}
                className="btn btn-primary btn-full"
              >
                Add to Wardrobe
              </button>
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
                  className="btn btn-full"
                >
                  Skip
                </button>
              )}
            </div>

            {/* Navigation Dots */}
            {canSwipe && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '8px', 
                marginTop: '24px',
                paddingBottom: '24px'
              }}>
                {allRecreatedItems.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      border: '1px solid var(--color-border)',
                      background: idx === currentIndex ? 'var(--color-border)' : 'transparent',
                      padding: 0,
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailModal;
