import React, { useRef, useState } from 'react';
import './FileUploadZone.css';

export default function FileUploadZone({ onFileSelected, uploading, progress, error }) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleClick = () => {
    if (!uploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!uploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (uploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFileSelected(files[0]);
    }
  };

  return (
    <div className="file-upload-zone-wrapper">
      <div
        className={`file-upload-zone ${isDragOver ? 'dragover' : ''}`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onFileSelected(e.target.files[0]);
            }
          }}
          disabled={uploading}
        />

        {uploading ? (
          <div className="file-upload-zone__uploading">
            <div className="file-upload-zone__filename">Uploading Report...</div>
            <div className="file-upload-zone__progress-bar-container">
              <div
                className="file-upload-zone__progress-bar-fill"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="file-upload-zone__progress-text">{progress}% uploaded</div>
          </div>
        ) : (
          <div className="file-upload-zone__content">
            <span className="file-upload-zone__icon ti-cloud-upload"></span>
            <div className="file-upload-zone__title">Upload Report or Test</div>
            <div className="file-upload-zone__subtitle">Tap to choose a file</div>
            <div className="file-upload-zone__pills">
              <span className="file-upload-zone__pill">PDF</span>
              <span className="file-upload-zone__pill">JPG</span>
              <span className="file-upload-zone__pill">PNG</span>
            </div>
            <div className="file-upload-zone__limit">Maximum 10MB</div>
          </div>
        )}
      </div>

      {error && (
        <div className="file-upload-zone__error">
          <span className="ti-alert-circle"></span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
