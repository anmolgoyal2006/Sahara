import React from 'react';
import { CATEGORIES } from './CategorySelector';
import './CategoryBadge.css';

export default function CategoryBadge({ category, count, active, onClick }) {
  const isAll = category === 'all';
  const catInfo = isAll
    ? { label: 'All Reports', icon: 'ti-files', color: '#1D9E75' }
    : CATEGORIES[category];

  const activeStyle = active
    ? {
        backgroundColor: catInfo?.color || '#1D9E75',
        color: '#FFFFFF',
        border: `1.5px solid ${catInfo?.color || '#1D9E75'}`
      }
    : {};

  return (
    <div
      className={`category-badge ${active ? 'category-badge--active' : 'category-badge--inactive'}`}
      style={activeStyle}
      onClick={onClick}
    >
      {catInfo?.icon && (
        <span className={`category-badge__icon ${catInfo.icon}`}></span>
      )}
      <span className="category-badge__label">{catInfo?.label || category}</span>
      <span className="category-badge__count">({count})</span>
    </div>
  );
}
