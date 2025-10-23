// DetectedItemCard.js - Compact card for 2-column grid
import React from 'react';

// Import garment type icons
import { ReactComponent as PantsIcon } from '../../assets/icons/24-leggins.svg';
import { ReactComponent as JacketIcon } from '../../assets/icons/24-blazer.svg';
import { ReactComponent as DressIcon } from '../../assets/icons/24-dress.svg';
import { ReactComponent as ShirtIcon } from '../../assets/icons/24-shirt-2.svg';
import { ReactComponent as TshirtIcon } from '../../assets/icons/24-tshirt.svg';
import { ReactComponent as SweaterIcon } from '../../assets/icons/24-sweater.svg';
import { ReactComponent as BootsIcon } from '../../assets/icons/24-boots.svg';
import { ReactComponent as ShoesIcon } from '../../assets/icons/24-shoe.svg';
import { ReactComponent as BagIcon } from '../../assets/icons/24-handbag.svg';
import { ReactComponent as BeltIcon } from '../../assets/icons/24-belt.svg';
import { ReactComponent as SuitIcon } from '../../assets/icons/24-suit.svg';
import { ReactComponent as ShortsIcon } from '../../assets/icons/24-shorts.svg';
import { ReactComponent as HangerIcon } from '../../assets/icons/24-hanger.svg';
import { ReactComponent as DeleteIcon } from '../../assets/icons/24-trash-2.svg';
import { ReactComponent as RetryIcon } from '../../assets/icons/24-refresh.svg';

const DetectedItemCard = ({ 
  item, 
  index,
  isRecreating,
  isRecreated,
  recreatedData,
  onRecreate,
  onViewRecreation,
  onDelete,
  onRetry
}) => {
  // Truncate description for compact view
  const truncateText = (text, maxLength = 80) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Get icon based on garment type
  const getGarmentIcon = (type) => {
    if (!type) return HangerIcon;
    
    const typeLower = type.toLowerCase();
    
    if (typeLower.includes('pants') || typeLower.includes('trouser') || typeLower.includes('jean')) {
      return PantsIcon;
    } else if (typeLower.includes('jacket') || typeLower.includes('blazer') || typeLower.includes('coat')) {
      return JacketIcon;
    } else if (typeLower.includes('dress')) {
      return DressIcon;
    } else if (typeLower.includes('shirt') || typeLower.includes('blouse')) {
      return ShirtIcon;
    } else if (typeLower.includes('t-shirt') || typeLower.includes('tee')) {
      return TshirtIcon;
    } else if (typeLower.includes('sweater') || typeLower.includes('cardigan') || typeLower.includes('pullover')) {
      return SweaterIcon;
    } else if (typeLower.includes('boot')) {
      return BootsIcon;
    } else if (typeLower.includes('shoe') || typeLower.includes('sneaker') || typeLower.includes('flat')) {
      return ShoesIcon;
    } else if (typeLower.includes('bag') || typeLower.includes('purse') || typeLower.includes('handbag')) {
      return BagIcon;
    } else if (typeLower.includes('belt')) {
      return BeltIcon;
    } else if (typeLower.includes('suit')) {
      return SuitIcon;
    } else if (typeLower.includes('shorts')) {
      return ShortsIcon;
    } else if (typeLower.includes('vest')) {
      return JacketIcon;
    }
    
    return HangerIcon; // Fallback
  };

  const GarmentIcon = getGarmentIcon(item.type);

  return (
    <div className="card-compact">
      {/* Recreated Image or Placeholder */}
      {isRecreated && recreatedData ? (
        <>
          {/* Top Icons Row */}
          <div className="card-icons-row">
            <div className="card-icon-left">
              <GarmentIcon style={{ width: '20px', height: '20px' }} />
            </div>
            <button
              onClick={() => onDelete && onDelete(item)}
              className="card-icon-right"
              aria-label="Delete item"
            >
              <DeleteIcon style={{ width: '20px', height: '20px' }} />
            </button>
          </div>

          {/* Image */}
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
          
          {/* Retry button */}
          <button
            onClick={() => onRetry && onRetry(item)}
            className="card-retry-btn"
            aria-label="Retry recreation"
          >
            <RetryIcon style={{ width: '20px', height: '20px' }} />
          </button>
        </>
      ) : (
        <>
          {/* Top Icons Row */}
          <div className="card-icons-row">
            <div className="card-icon-left">
              <GarmentIcon style={{ width: '20px', height: '20px' }} />
            </div>
            <button
              onClick={() => onDelete && onDelete(item)}
              className="card-icon-right"
              aria-label="Delete item"
            >
              <DeleteIcon style={{ width: '20px', height: '20px' }} />
            </button>
          </div>

          {/* Description */}
          <div className="card-description">
            <p className="body-small item-description">
              {truncateText(item.description || `${item.color || ''} ${item.type || ''}`.trim())}
            </p>
          </div>

          {/* Button */}
          <button
            onClick={() => onRecreate(item)}
            disabled={isRecreating}
            className="btn-compact"
          >
            {isRecreating ? 'Recreating...' : 'Recreate'}
          </button>
        </>
      )}
    </div>
  );
};

export default DetectedItemCard;
