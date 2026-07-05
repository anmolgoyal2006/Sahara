import React from 'react';
import './CategorySelector.css';

export const CATEGORIES = {
  heart: {
    label: 'Heart & Cardiac',
    icon: 'ti-heart',
    color: '#E24B4A',
    bg: '#FFF0F0'
  },
  dental: {
    label: 'Dental',
    icon: 'ti-dental',
    color: '#185FA5',
    bg: '#EBF4FF'
  },
  xray: {
    label: 'X-Ray & Scan',
    icon: 'ti-scan',
    color: '#7C3AED',
    bg: '#F3EFFE'
  },
  blood_test: {
    label: 'Blood Test',
    icon: 'ti-droplet',
    color: '#BA7517',
    bg: '#FAEEDA'
  },
  eye: {
    label: 'Eye & Vision',
    icon: 'ti-eye',
    color: '#0891B2',
    bg: '#ECFEFF'
  },
  kidney: {
    label: 'Kidney',
    icon: 'ti-flask',
    color: '#DB2777',
    bg: '#FDF2F8'
  },
  diabetes: {
    label: 'Diabetes',
    icon: 'ti-activity',
    color: '#BA7517',
    bg: '#FAEEDA'
  },
  brain: {
    label: 'Brain & Neuro',
    icon: 'ti-brain',
    color: '#7C3AED',
    bg: '#F3EFFE'
  },
  bone: {
    label: 'Bone & Joint',
    icon: 'ti-bone',
    color: '#6B7280',
    bg: '#F9FAFB'
  },
  lung: {
    label: 'Lung & Chest',
    icon: 'ti-lungs',
    color: '#059669',
    bg: '#ECFDF5'
  },
  skin: {
    label: 'Skin',
    icon: 'ti-sparkles',
    color: '#D97706',
    bg: '#FFFBEB'
  },
  general: {
    label: 'General',
    icon: 'ti-stethoscope',
    color: '#1D9E75',
    bg: '#F0FBF7'
  },
  other: {
    label: 'Other',
    icon: 'ti-file-text',
    color: '#5A7A9A',
    bg: '#EBF4FF'
  }
};

export default function CategorySelector({ selected, onChange }) {
  return (
    <div className="category-selector">
      {Object.entries(CATEGORIES).map(([key, cat]) => {
        const isSelected = selected === key;
        const tileStyle = {
          backgroundColor: cat.bg,
          border: isSelected ? `2px solid ${cat.color}` : '1.5px solid #DDE8F5',
          transform: isSelected ? 'scale(1.03)' : 'scale(1)',
          boxShadow: isSelected ? `0 0 0 3px ${cat.color}33` : 'none',
        };

        return (
          <div
            key={key}
            className={`category-tile ${isSelected ? 'selected' : ''}`}
            style={tileStyle}
            onClick={() => onChange(key)}
          >
            <span
              className={`category-tile__icon ${cat.icon}`}
              style={{ color: cat.color }}
            ></span>
            <span
              className="category-tile__label"
              style={{ color: cat.color }}
            >
              {cat.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
