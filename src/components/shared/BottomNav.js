// BottomNav.js - Mobile bottom navigation component
import React from 'react';

const BottomNav = ({ activeSection, onNavigate }) => {
  const navItems = [
    { id: 'wardrobe', label: 'Wardrobe', icon: '👗' },
    { id: 'multi-item', label: 'Upload', icon: '📸' },
    { id: 'look-matcher', label: 'Looks', icon: '🔍' },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
          onClick={() => onNavigate(item.id)}
          aria-label={item.label}
        >
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;

