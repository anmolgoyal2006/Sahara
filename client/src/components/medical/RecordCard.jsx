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
  const actionsRef = useRef(null);
  const moreBtnRef = useRef(null);

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
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeMenuAndFocusTrigger = () => {
    setShowDropdown(false);
    moreBtnRef.current?.focus();
  };

  const handleMenuKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeMenuAndFocusTrigger();
    }
  };

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

  const favouriteLabel = record.is_favourite ? 'Remove from favourites' : 'Add to favourites';

  return (
    <div className="record-card">
      {/* Left: icon + report info */}
      <div className="record-card__info">
        <div
          className="record-card__icon-box"
          style={{ backgroundColor: categoryInfo?.bg || '#F0FBF7' }}
        >
          <span
            className={`record-card__icon ti ${categoryInfo?.icon || 'ti-file-text'}`}
            style={{ color: categoryInfo?.color || '#1D9E75' }}
          ></span>
        </div>

        <div className="record-card__details">
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
      </div>

      {/* Right: action group */}
      <div className="record-card__actions" ref={actionsRef}>
        <button
          type="button"
          className={`record-card__icon-btn record-card__icon-btn--favourite ${
            record.is_favourite ? 'active' : ''
          }`}
          onClick={() => onFavourite(record)}
          aria-label={favouriteLabel}
          aria-pressed={!!record.is_favourite}
          data-tooltip={favouriteLabel}
        >
          <span className="ti ti-star"></span>
        </button>

        <button
          type="button"
          className="record-card__icon-btn record-card__icon-btn--view"
          onClick={() => onView(record)}
          aria-label="View report"
          data-tooltip="View report"
        >
          <span className="ti ti-eye"></span>
        </button>

        <button
          type="button"
          ref={moreBtnRef}
          className="record-card__icon-btn record-card__icon-btn--more"
          onClick={() => setShowDropdown((prev) => !prev)}
          aria-label="More options"
          aria-haspopup="true"
          aria-expanded={showDropdown}
          data-tooltip="More options"
        >
          <span className="ti ti-dots-vertical"></span>
        </button>

        {showDropdown && (
          <div className="record-card__menu" role="menu" onKeyDown={handleMenuKeyDown}>
            {/* Shown at all sizes so there's always a visible text label */}
            <button
              type="button"
              role="menuitem"
              className="record-card__menu-item record-card__menu-item--favourite-mobile"
              onClick={() => {
                setShowDropdown(false);
                onFavourite(record);
              }}
            >
              <span className="ti ti-star"></span>
              <span>{favouriteLabel}</span>
            </button>
            <a
              role="menuitem"
              className="record-card__menu-item"
              href={record.file_url}
              download={record.file_name || record.name}
              onClick={() => setShowDropdown(false)}
            >
              <span className="ti ti-download"></span>
              <span>Download</span>
            </a>
            <button type="button" role="menuitem" className="record-card__menu-item" onClick={handleShare}>
              <span className="ti ti-share"></span>
              <span>Share</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="record-card__menu-item"
              onClick={() => {
                setShowDropdown(false);
                onEdit(record);
              }}
            >
              <span className="ti ti-pencil"></span>
              <span>Edit</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="record-card__menu-item"
              onClick={() => {
                setShowDropdown(false);
                onAnalyse(record);
              }}
            >
              <span className="ti ti-wand"></span>
              <span>Analyse with AI</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="record-card__menu-item record-card__menu-item--delete"
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
