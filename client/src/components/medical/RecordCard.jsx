import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../../lib/supabase';
import './RecordCard.css';

export default function RecordCard({
  record,
  categoryInfo,
  onView,
  onEdit,
  onDelete,
  onFavourite,
  onAnalyse
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Format date nicely (e.g., "12 Jul 2026")
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleShare = async () => {
    try {
      const response = await fetch(`${API_URL}/api/medical/share/${record.id}`);
      const data = await response.json();
      if (response.ok && data.success) {
        await navigator.clipboard.writeText(data.shareUrl);
      } else {
        await navigator.clipboard.writeText(record.file_url);
      }
      alert('Link copied to clipboard!');
    } catch (err) {
      await navigator.clipboard.writeText(record.file_url);
      alert('Link copied to clipboard!');
    }
    setShowDropdown(false);
  };

  const handleDeleteClick = () => {
    setShowDropdown(false);
    if (window.confirm(`Are you sure you want to permanently delete "${record.name}"?`)) {
      onDelete(record.id);
    }
  };

  return (
    <div className="record-card">
      {/* Left Icon Box */}
      <div className="record-card__left">
        <div
          className="record-card__icon-box"
          style={{ backgroundColor: categoryInfo?.bg || '#F0FBF7' }}
        >
          <span
            className={`record-card__icon ti ${categoryInfo?.icon || 'ti-file-text'}`}
            style={{ color: categoryInfo?.color || '#1D9E75' }}
          ></span>
        </div>
      </div>

      {/* Center Details */}
      <div className="record-card__center">
        <h4 className="record-card__title">{record.name}</h4>
        <span className="record-card__category">{categoryInfo?.label || 'General'}</span>
        <div className="record-card__date-row">
          <span className="ti ti-calendar"></span>
          <span>{formatDate(record.report_date)}</span>
        </div>
        {record.notes && <p className="record-card__notes">"{record.notes}"</p>}
        {record.ai_analysis && (
          <div className="record-card__ai-badge">
            <span>AI Analysed</span>
            <span className="ti ti-check"></span>
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="record-card__right" ref={dropdownRef}>
        {/* Favourite Star */}
        <button
          className={`record-card__btn record-card__btn--favourite ${
            record.is_favourite ? 'active' : ''
          }`}
          onClick={() => onFavourite(record)}
          title={record.is_favourite ? 'Remove from Favourites' : 'Add to Favourites'}
        >
          <span className={record.is_favourite ? 'ti ti-star-filled' : 'ti ti-star'}></span>
        </button>

        {/* View Document */}
        <button
          className="record-card__btn"
          onClick={() => onView(record)}
          title="View Document"
        >
          <span className="ti ti-eye"></span>
        </button>

        {/* More Actions Dropdown */}
        <button
          className="record-card__btn"
          onClick={() => setShowDropdown(!showDropdown)}
          title="More options"
        >
          <span className="ti ti-dots-vertical"></span>
        </button>

        {showDropdown && (
          <div className="record-card__dropdown">
            <button
              className="record-card__dropdown-item"
              onClick={() => {
                setShowDropdown(false);
                onEdit(record);
              }}
            >
              <span className="ti ti-pencil"></span>
              <span>Edit</span>
            </button>
            <button
              className="record-card__dropdown-item"
              onClick={() => {
                setShowDropdown(false);
                onAnalyse(record);
              }}
            >
              <span className="ti ti-wand"></span>
              <span>Analyse with AI</span>
            </button>
            <button className="record-card__dropdown-item" onClick={handleShare}>
              <span className="ti ti-share"></span>
              <span>Share</span>
            </button>
            <button
              className="record-card__dropdown-item record-card__dropdown-item--delete"
              onClick={handleDeleteClick}
            >
              <span className="ti ti-trash"></span>
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
