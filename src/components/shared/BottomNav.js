// BottomNav.js - Mobile bottom navigation component
import React from 'react';
import { ReactComponent as HomeIcon } from '../../assets/icons/house-4 1.svg';
import { ReactComponent as WardrobeIcon } from '../../assets/icons/wardrobe-3 3.svg';
import { ReactComponent as HangerIcon } from '../../assets/icons/hanger 1.svg';
import { ReactComponent as DressIcon } from '../../assets/icons/dress.svg';

const BottomNav = ({ activeSection, onNavigate }) => {
  const navItems = [
    { id: 'home', label: 'Home', IconComponent: HomeIcon },
    { id: 'wardrobe', label: 'Wardrobe', IconComponent: WardrobeIcon },
    { id: 'multi-item', label: 'Upload', IconComponent: HangerIcon },
    { id: 'look-matcher', label: 'Looks', IconComponent: DressIcon },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <button
          key={item.id}
          className={`bottom-nav-item ${activeSection === item.id ? 'active' : ''}`}
          onClick={() => onNavigate(item.id)}
          aria-label={item.label}
        >
          <item.IconComponent style={{ width: '24px', height: '24px' }} />
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;

