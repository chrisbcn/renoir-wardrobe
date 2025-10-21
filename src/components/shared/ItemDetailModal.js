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

  const handleNext = () => {
    if (currentIndex < allRecreatedItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
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
    <div 
      className="fixed inset-0 bg-white z-50 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div 
        className="flex justify-between items-center p-xl"
        style={{ borderBottom: '1px solid #232323' }}
      >
        <button
          onClick={onClose}
          className="body-text"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← Back
        </button>
        {canSwipe && (
          <p className="body-small" style={{ color: '#666' }}>
            {currentIndex + 1} of {allRecreatedItems.length}
          </p>
        )}
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '0 20px' }}>
        {/* Image */}
        <div className="mt-2xl mb-2xl">
          <img 
            src={currentRecreatedData.recreatedImageUrl}
            alt={currentItem.type}
            className="w-full h-auto"
            style={{ border: '1px solid #232323' }}
          />
        </div>

        {/* Details */}
        <h2 className="heading-2 mb-md">{currentItem.type}</h2>
        
        {currentItem.color && (
          <p className="body-text mb-sm" style={{ color: '#666' }}>
            Color: {currentItem.color}
          </p>
        )}
        
        {currentItem.material && (
          <p className="body-text mb-sm" style={{ color: '#666' }}>
            Material: {currentItem.material}
          </p>
        )}

        {currentItem.description && (
          <p className="body-text mt-lg" style={{ color: '#232323', lineHeight: 1.6 }}>
            {currentItem.description}
          </p>
        )}

        <div className="h-32"></div> {/* Spacer for fixed buttons */}
      </div>

      {/* Fixed Bottom Actions */}
      <div 
        className="p-xl"
        style={{ 
          borderTop: '1px solid #232323',
          background: '#fff'
        }}
      >
        <div className="gap-lg" style={{ display: 'flex' }}>
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
              className="btn"
              style={{ flex: 1 }}
            >
              Skip
            </button>
          )}
          <button
            onClick={handleAdd}
            className="btn btn-primary"
            style={{ flex: 2 }}
          >
            Add to Wardrobe
          </button>
        </div>

        {/* Navigation Dots */}
        {canSwipe && (
          <div className="flex justify-center gap-sm mt-lg">
            {allRecreatedItems.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  border: '1px solid #232323',
                  background: idx === currentIndex ? '#232323' : 'transparent',
                  padding: 0,
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemDetailModal;

