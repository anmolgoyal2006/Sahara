import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, API_URL } from '../lib/supabase';
import ElderLayout from '../components/layout/ElderLayout';
import { CATEGORIES } from '../components/medical/CategorySelector';
import './ElderRecordViewer.css';

export default function ElderRecordViewer() {
  const { recordId } = useParams();
  const navigate = useNavigate();

  // State
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [doctorMode, setDoctorMode] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState(null);
  const [aiError, setAiError] = useState(null);

  // Load record details
  const fetchRecordDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/medical/record/${recordId}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setRecord(data.record);
      } else {
        throw new Error('Record not found');
      }
    } catch (err) {
      console.error('Failed to load record details:', err);
      setError('Could not load record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recordId) {
      fetchRecordDetails();
    }
  }, [recordId]);

  // Toast clear timer
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (msg) => {
    setToast(msg);
  };

  // Copy shareable link
  const handleShare = async () => {
    if (!record) return;
    try {
      const response = await fetch(`${API_URL}/api/medical/share/${record.id}`);
      const data = await response.json();
      if (response.ok && data.success) {
        await navigator.clipboard.writeText(data.shareUrl);
      } else {
        await navigator.clipboard.writeText(record.file_url);
      }
      showToast('Link copied!');
    } catch (err) {
      await navigator.clipboard.writeText(record?.file_url || '');
      showToast('Link copied!');
    }
  };

  // Run AI analysis
  const handleRunAIAnalysis = async () => {
    if (!record) return;
    setAnalysing(true);
    setAiError(null);
    try {
      const response = await fetch(`${API_URL}/api/medical/analyse/${record.id}`, {
        method: 'POST'
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setRecord(prev => ({
          ...prev,
          ai_analysis: data.analysis,
          ai_doctor_recommendation: data.doctorRecommendation,
          ai_analysed_at: data.analysedAt
        }));
        showToast('Analysis complete!');
        // Scroll to analysis section
        setTimeout(() => {
          document.getElementById('ai-analysis-box')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (err) {
      console.error('AI Analysis failed:', err);
      setAiError(err.message || 'Could not analyse report. Please try again.');
      showToast('Analysis failed');
    } finally {
      setAnalysing(false);
    }
  };

  // Format Date (e.g. "12 July 2026")
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Helper to render image or pdf viewer
  const renderFileViewer = (isDocMode = false) => {
    if (!record) return null;

    if (record.file_type === 'image') {
      return (
        <div
          className="file-view-container file-view-container--image"
          style={isDocMode ? { maxHeight: 'none', height: '100%' } : {}}
        >
          <img
            src={record.file_url}
            alt={record.name}
            className="file-view-container__image"
            style={isDocMode ? { maxHeight: '85vh' } : {}}
          />
        </div>
      );
    }

    if (record.file_type === 'pdf') {
      return (
        <div
          className="file-view-container file-view-container--pdf"
          style={isDocMode ? { height: '100%' } : {}}
        >
          {/* Native iframe view */}
          <iframe
            src={record.file_url}
            title={record.name}
            className="file-view-iframe"
            style={isDocMode ? { height: '85vh' } : {}}
          />
          
          {/* Download and External view backups in case iframe is blocked */}
          {!isDocMode && (
            <div className="pdf-fallback-card" style={{ marginTop: '16px' }}>
              <span className="pdf-fallback-card__icon ti-file-text"></span>
              <p className="pdf-fallback-card__title">PDF Report Previewed Above</p>
              <div className="pdf-fallback-card__actions">
                <button
                  className="pdf-fallback-card__btn pdf-fallback-card__btn--open"
                  onClick={() => window.open(record.file_url, '_blank')}
                >
                  <span className="ti-export"></span>
                  <span>Open in New Tab</span>
                </button>
                <a
                  href={record.file_url}
                  download={record.file_name}
                  className="pdf-fallback-card__btn pdf-fallback-card__btn--download"
                  style={{ textDecoration: 'none' }}
                >
                  <span className="ti-download"></span>
                  <span>Download PDF</span>
                </a>
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // ─────────────────────────────────────
  // RENDER DOCTOR MODE (Full screen layout)
  // ─────────────────────────────────────
  if (record && doctorMode) {
    return (
      <div className="doctor-mode-screen">
        <div className="doctor-mode-strip">
          <span style={{ width: '80px' }}></span>
          <h4 className="doctor-mode-strip__title">{record.name}</h4>
          <button className="doctor-mode-strip__exit" onClick={() => setDoctorMode(false)}>
            Exit Doctor Mode
          </button>
        </div>
        <div className="doctor-mode-viewer">
          {renderFileViewer(true)}
        </div>
        {/* Global Toast inside Doctor Mode */}
        {toast && (
          <div className="toast-wrapper">
            <div className="toast-notification">{toast}</div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────
  // RENDER NORMAL VAULT VIEW
  // ─────────────────────────────────────
  const catInfo = record ? CATEGORIES[record.category] : null;

  return (
    <ElderLayout>
      <div className="record-viewer-page">
        
        {/* Header Bar */}
        <header className="viewer-header-bar">
          <div className="viewer-header-bar__left">
            <button className="viewer-header-bar__back" onClick={() => navigate(-1)}>
              <span className="ti-arrow-left"></span>
            </button>
            <div className="viewer-header-bar__info">
              <h2 className="viewer-header-bar__title">{record ? record.name : 'Loading...'}</h2>
              {catInfo && (
                <span
                  className="viewer-header-bar__badge"
                  style={{ backgroundColor: catInfo.bg, color: catInfo.color }}
                >
                  {catInfo.label}
                </span>
              )}
            </div>
          </div>

          <div className="viewer-header-bar__right">
            {record && (
              <button
                className="doc-mode-toggle doc-mode-toggle--inactive"
                onClick={() => setDoctorMode(true)}
              >
                <span className="ti-user"></span>
                <span>Doctor Mode</span>
              </button>
            )}
            <button className="viewer-header-bar__share" onClick={handleShare} title="Copy file link">
              <span className="ti-share"></span>
            </button>
          </div>
        </header>

        {/* Body content */}
        <div className="viewer-content-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px', color: '#5A7A9A' }}>
              <span className="ti-reload" style={{ fontSize: '24px', display: 'inline-block', animation: 'spin 1.5s linear infinite' }}></span>
              <p style={{ marginTop: '8px' }}>Loading document details...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '80px', color: '#E24B4A' }}>
              <span className="ti-alert" style={{ fontSize: '32px' }}></span>
              <p style={{ marginTop: '8px' }}>{error}</p>
              <button
                onClick={fetchRecordDetails}
                style={{ background: '#1D9E75', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', marginTop: '12px' }}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Report Info Card */}
              <div className="report-info-card">
                <h3 className="report-info-card__title">{record.name}</h3>
                <div className="report-info-card__meta">
                  {catInfo && (
                    <span
                      className="report-info-card__badge"
                      style={{ backgroundColor: catInfo.bg, color: catInfo.color }}
                    >
                      {catInfo.label}
                    </span>
                  )}
                  <span className="report-info-card__date">
                    <span className="ti-calendar"></span>
                    <span>{formatDate(record.report_date)}</span>
                  </span>
                </div>
                {record.notes && (
                  <p className="report-info-card__notes">
                    <strong>Patient Notes:</strong> "{record.notes}"
                  </p>
                )}
              </div>

              {/* Document File Viewer */}
              {renderFileViewer(false)}

              {/* AI Analysis Section */}
              <div className="ai-analysis-card" id="ai-analysis-box">
                <div className="ai-analysis-card__header">
                  <h3 className="ai-analysis-card__title">
                    <span className="ai-analysis-card__icon ti-wand"></span>
                    <span>Sahara AI Analysis</span>
                  </h3>
                  <span className="ai-analysis-card__subtitle">Powered by Gemini AI</span>
                </div>

                {aiError && (
                  <div className="error-banner-ai">
                    <span className="ti-alert"></span>
                    <span>{aiError}</span>
                  </div>
                )}

                {analysing ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#5A7A9A' }}>
                    <span className="ti-reload" style={{ fontSize: '24px', display: 'inline-block', animation: 'spin 1.5s linear infinite' }}></span>
                    <p style={{ marginTop: '12px', fontWeight: 'bold' }}>Analysing... this may take 30 seconds</p>
                  </div>
                ) : record.ai_analysis ? (
                  <div className="ai-result-block">
                    {/* Summary */}
                    <div className="ai-card-summary">
                      <h4 className="ai-card-title">What this report shows</h4>
                      <p className="ai-card-text">{record.ai_analysis}</p>
                    </div>

                    {/* Doctor Recommendation */}
                    {record.ai_doctor_recommendation && (
                      <div className="ai-card-recommendation">
                        <h4 className="ai-card-title ai-card-title--rec">
                          <span className="ti-stethoscope"></span>
                          <span>Which Doctor to See</span>
                        </h4>
                        <p className="ai-card-text">{record.ai_doctor_recommendation}</p>
                      </div>
                    )}

                    <div className="ai-last-analysed">
                      <span>
                        Last analysed:{' '}
                        {record.ai_analysed_at
                          ? new Date(record.ai_analysed_at).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Recent'}
                      </span>
                      <span className="ai-reanalyse-link" onClick={handleRunAIAnalysis}>
                        Re-analyse Report →
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="ai-empty-state">
                    <span className="ai-empty-state__icon ti-face-smile" style={{ fontSize: '48px' }}></span>
                    <h4 className="ai-empty-state__title">Get AI Analysis</h4>
                    <p className="ai-empty-state__desc">
                      Sahara AI will explain what this report means and suggest which doctor type to visit.
                    </p>
                    <button className="ai-analyse-btn" onClick={handleRunAIAnalysis}>
                      <span className="ti-wand"></span>
                      <span>Analyse This Report</span>
                    </button>
                  </div>
                )}

                {/* Disclaimer - always visible */}
                <div className="ai-disclaimer-card">
                  <span className="ai-disclaimer-card__icon ti-alert-circle"></span>
                  <p className="ai-disclaimer-card__text">
                    This AI analysis is for information only. Always consult your doctor for medical advice.
                    Do not change medication based on this analysis.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Global Toast */}
        {toast && (
          <div className="toast-wrapper">
            <div className="toast-notification">{toast}</div>
          </div>
        )}

      </div>
    </ElderLayout>
  );
}
