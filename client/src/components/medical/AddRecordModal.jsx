import React, { useState, useEffect } from 'react';
import { supabase, API_URL } from '../../lib/supabase';
import { useCloudinaryUpload } from '../../hooks/useCloudinaryUpload';
import FileUploadZone from './FileUploadZone';
import CategorySelector from './CategorySelector';
import './AddRecordModal.css';

export default function AddRecordModal({ isOpen, onClose, onSaved, editingRecord }) {
  const [userId, setUserId] = useState(null);
  const today = new Date().toISOString().split('T')[0];

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('general');
  const [reportDate, setReportDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const { upload, uploading, progress, error: uploadError } = useCloudinaryUpload();

  // Get active session user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
      }
    });
  }, []);

  // Reset or pre-fill state when modal opens/changes
  useEffect(() => {
    if (isOpen) {
      if (editingRecord) {
        setStep(2);
        setName(editingRecord.name || '');
        setCategory(editingRecord.category || 'general');
        setReportDate(editingRecord.report_date ? editingRecord.report_date.split('T')[0] : today);
        setNotes(editingRecord.notes || '');
        setUploadedFile({
          url: editingRecord.file_url,
          fileType: editingRecord.file_type,
          fileName: editingRecord.file_name,
          fileSizeKb: editingRecord.file_size_kb
        });
      } else {
        setStep(1);
        setName('');
        setCategory('general');
        setReportDate(today);
        setNotes('');
        setUploadedFile(null);
      }
      setError(null);
    }
  }, [isOpen, editingRecord]);

  if (!isOpen) return null;

  const handleFileSelected = async (file) => {
    try {
      setError(null);
      const result = await upload(file);
      setUploadedFile(result);
    } catch (err) {
      setError(err.message || 'File upload failed');
    }
  };

  const handleContinue = () => {
    if (uploadedFile) {
      setStep(2);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Report Name is required');
      return;
    }
    if (!reportDate) {
      setError('Report Date is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (!userId) {
        throw new Error('User not logged in');
      }

      if (editingRecord) {
        // Edit Mode: PUT update
        const response = await fetch(`${API_URL}/api/medical/update/${editingRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            category,
            report_date: reportDate,
            notes: notes || null
          })
        });

        const resData = await response.json();
        if (response.ok && resData.success) {
          onSaved('Report updated!');
          onClose();
        } else {
          throw new Error(resData?.error || 'Failed to update report');
        }
      } else {
        // Create Mode: POST upload
        if (!uploadedFile) {
          throw new Error('No uploaded file found');
        }

        const response = await fetch(`${API_URL}/api/medical/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            elder_id: userId,
            name,
            category,
            report_date: reportDate,
            file_url: uploadedFile.url,
            file_type: uploadedFile.fileType,
            file_name: uploadedFile.fileName,
            file_size_kb: uploadedFile.fileSizeKb,
            notes: notes || null
          })
        });

        const resData = await response.json();
        if (response.ok && resData.success) {
          onSaved('Report saved!');
          onClose();
        } else {
          throw new Error(resData?.error || 'Failed to save report');
        }
      }
    } catch (err) {
      setError(err.message || 'Could not save report');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            {editingRecord ? 'Edit Report' : 'Add Medical Report'}
          </h2>
          <button className="modal-close-btn" onClick={onClose}>
            <span className="ti ti-close"></span>
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {error && (
            <div className="error-banner">
              <span className="ti ti-alert"></span>
              <span>{error}</span>
            </div>
          )}

          {/* Progress dots for new record creation */}
          {!editingRecord && (
            <div className="modal-progress-dots">
              <span className={`modal-dot ${step === 1 ? 'active' : ''}`}>●</span>
              <span className={`modal-dot ${step === 2 ? 'active' : ''}`}>●</span>
            </div>
          )}

          {/* Step 1: File Upload */}
          {step === 1 && !editingRecord && (
            <div className="modal-step">
              <h3 className="modal-step-title">Upload Your Report</h3>
              <p className="modal-step-subtitle">PDF or image of test/report</p>
              
              <FileUploadZone
                onFileSelected={handleFileSelected}
                uploading={uploading}
                progress={progress}
                error={uploadError || error}
              />

              {uploadedFile && (
                <div className="preview-container">
                  {uploadedFile.fileType === 'image' ? (
                    <img
                      src={uploadedFile.url}
                      alt="Report preview"
                      className="preview-image"
                    />
                  ) : (
                    <div className="preview-pdf-card">
                      <span className="preview-pdf-icon ti ti-file-text"></span>
                      <div className="preview-pdf-details">
                        <span className="preview-pdf-name">{uploadedFile.fileName}</span>
                        <span className="preview-pdf-size">{uploadedFile.fileSizeKb} KB</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: '24px' }}>
                <button
                  type="button"
                  className="modal-btn-primary"
                  disabled={!uploadedFile || uploading}
                  onClick={handleContinue}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Form Details */}
          {step === 2 && (
            <form onSubmit={handleSave} className="modal-step" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 className="modal-step-title">Report Details</h3>

              {/* Name */}
              <div className="form-field">
                <label className="form-field__label">REPORT NAME</label>
                <input
                  type="text"
                  className="form-field__input"
                  placeholder="e.g. Blood Sugar Test, ECG Report"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Category */}
              <div className="form-field">
                <label className="form-field__label">CATEGORY</label>
                <CategorySelector
                  selected={category}
                  onChange={setCategory}
                />
              </div>

              {/* Date */}
              <div className="form-field">
                <label className="form-field__label">DATE OF REPORT</label>
                <input
                  type="date"
                  className="form-field__input"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  required
                />
              </div>

              {/* Notes */}
              <div className="form-field">
                <label className="form-field__label">NOTES (optional)</label>
                <textarea
                  className="form-field__textarea"
                  rows="3"
                  placeholder="e.g. Fasting blood test, Dr. Sharma's clinic"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="modal-btn-primary"
                disabled={saving}
                style={{ marginTop: '12px' }}
              >
                {saving ? 'Saving...' : editingRecord ? 'Update Report' : 'Save Report'}
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}
