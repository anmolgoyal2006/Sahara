import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase, API_URL } from '../lib/supabase';
import ElderLayout from '../components/layout/ElderLayout';
import RecordCard from '../components/medical/RecordCard';
import CategoryBadge from '../components/medical/CategoryBadge';
import AddRecordModal from '../components/medical/AddRecordModal';
import { CATEGORIES } from '../components/medical/CategorySelector';
import './ElderMedicalRecords.css';

export default function ElderMedicalRecords() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState(null);

  // State
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals / Viewers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // Fetch session user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        window.location.href = '/login';
        return;
      }
      setUserId(session.user.id);
    });
  }, []);

  // Trigger modal open from companion navigation state
  useEffect(() => {
    if (location.state?.openAddModal) {
      setIsAddModalOpen(true);
      // Clean up router state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  
  // Toast notifications
  const [toast, setToast] = useState('');

  // Fetch all records
  const fetchRecords = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/medical/list/${userId}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setRecords(data.records || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch medical records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchRecords();
    }
  }, [userId]);

  // Toast auto-clear
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Handle Toast trigger
  const showToast = (msg) => {
    setToast(msg);
  };

  // Toggle Favourite Action
  const handleFavouriteToggle = async (record) => {
    try {
      const toggledValue = !record.is_favourite;
      const response = await fetch(`${API_URL}/api/medical/update/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favourite: toggledValue })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setRecords(records.map(r => r.id === record.id ? { ...r, is_favourite: toggledValue } : r));
        showToast(toggledValue ? 'Added to Favourites' : 'Removed from Favourites');
      }
    } catch (err) {
      console.error('Failed to toggle favourite:', err);
      showToast('Could not update favourite');
    }
  };

  // Delete Action
  const handleDeleteRecord = async (recordId) => {
    try {
      const response = await fetch(`${API_URL}/api/medical/delete/${recordId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setRecords(records.filter(r => r.id !== recordId));
        setTotal(prev => prev - 1);
        showToast('Report deleted');
      }
    } catch (err) {
      console.error('Failed to delete record:', err);
      showToast('Could not delete report');
    }
  };

  // Saved / Edited Callback from Modal
  const handleSaved = (message) => {
    fetchRecords();
    showToast(message || 'Report saved!');
  };

  // Open Edit Modal
  const handleEditRecord = (record) => {
    setEditingRecord(record);
    setIsAddModalOpen(true);
  };

  // Filter records client-side based on search query
  const searchedRecords = records.filter(record =>
    record.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Grouped counts for category badges
  const categoryCounts = {};
  records.forEach(r => {
    categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
  });

  // Favourites list
  const favourites = searchedRecords.filter(r => r.is_favourite);

  // Render Category filter badges (only those with counts > 0)
  const activeCategoriesWithRecords = Object.keys(CATEGORIES).filter(
    cat => (categoryCounts[cat] || 0) > 0
  );

  // Render logic for main records display
  const renderRecordsDisplay = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#5A7A9A' }}>
          <span className="ti-reload" style={{ fontSize: '24px', display: 'inline-block', animation: 'spin 1.5s linear infinite' }}></span>
          <p style={{ marginTop: '8px', fontSize: '14px' }}>Loading records...</p>
        </div>
      );
    }

    if (records.length === 0) {
      return (
        <div className="vault-empty">
          <span className="vault-empty__icon ti-folder-open"></span>
          <h3 className="vault-empty__title">No reports saved yet</h3>
          <p className="vault-empty__subtitle">
            Keep your medical reports in one safe place. Tap Add Report to add your first report.
          </p>
          <button
            className="vault-empty__btn"
            onClick={() => {
              setEditingRecord(null);
              setIsAddModalOpen(true);
            }}
          >
            Add First Report
          </button>
        </div>
      );
    }

    if (selectedCategory === 'all') {
      // Group searched records by category
      const grouped = {};
      searchedRecords.forEach(record => {
        if (!grouped[record.category]) {
          grouped[record.category] = [];
        }
        grouped[record.category].push(record);
      });

      const groupedEntries = Object.entries(grouped);

      if (groupedEntries.length === 0) {
        return (
          <div style={{ textAlign: 'center', padding: '40px', color: '#5A7A9A' }}>
            <p>No reports match your search query.</p>
          </div>
        );
      }

      return groupedEntries.map(([catKey, catRecords]) => {
        const catInfo = CATEGORIES[catKey];
        const displayRecords = catRecords.slice(0, 3); // show up to 3
        const hasMore = catRecords.length > 3;

        return (
          <div key={catKey} className="category-section">
            <div className="category-section__header">
              <span className="category-section__title">
                <span
                  className={`category-section__icon ${catInfo?.icon}`}
                  style={{ color: catInfo?.color }}
                ></span>
                <span>{catInfo?.label || catKey}</span>
              </span>
              <span className="category-section__count">
                {catRecords.length} {catRecords.length === 1 ? 'report' : 'reports'}
              </span>
            </div>

            <div className="category-section__list">
              {displayRecords.map(record => (
                <RecordCard
                  key={record.id}
                  record={record}
                  categoryInfo={catInfo}
                  onView={(r) => navigate(`/elder/medical-records/${r.id}/view`)}
                  onEdit={handleEditRecord}
                  onDelete={handleDeleteRecord}
                  onFavourite={handleFavouriteToggle}
                  onAnalyse={(r) => navigate(`/elder/medical-records/${r.id}/view`)}
                />
              ))}
            </div>

            {hasMore && (
              <span
                className="category-section__show-more"
                onClick={() => setSelectedCategory(catKey)}
              >
                Show more {catInfo?.label || catKey} reports →
              </span>
            )}
          </div>
        );
      });
    } else {
      // Show specific category list
      const categoryRecords = searchedRecords.filter(r => r.category === selectedCategory);
      const catInfo = CATEGORIES[selectedCategory];

      if (categoryRecords.length === 0) {
        return (
          <div className="vault-empty-category">
            <span
              className="vault-empty-category__icon ti-folder"
              style={{ color: catInfo?.color || '#1D9E75' }}
            ></span>
            <h4 className="vault-empty-category__title">
              No {catInfo?.label || selectedCategory} reports yet
            </h4>
            <button
              className="vault-empty-category__btn"
              onClick={() => {
                setEditingRecord(null);
                setIsAddModalOpen(true);
              }}
            >
              Add Report
            </button>
          </div>
        );
      }

      return (
        <div className="category-list">
          {categoryRecords.map(record => (
            <RecordCard
              key={record.id}
              record={record}
              categoryInfo={catInfo}
              onView={(r) => navigate(`/elder/medical-records/${r.id}/view`)}
              onEdit={handleEditRecord}
              onDelete={handleDeleteRecord}
              onFavourite={handleFavouriteToggle}
              onAnalyse={(r) => navigate(`/elder/medical-records/${r.id}/view`)}
            />
          ))}
        </div>
      );
    }
  };

  return (
    <ElderLayout>
      <div className="medical-vault">
        
        {/* Page Header */}
        <header className="vault-header">
          <div className="vault-header__left">
            <h1 className="vault-header__title">Medical Records</h1>
            <p className="vault-header__subtitle">Your personal health document storage vault</p>
            <span className="vault-header__count">{total} {total === 1 ? 'report' : 'reports'} saved</span>
          </div>
          <button
            className="vault-header__btn"
            onClick={() => {
              setEditingRecord(null);
              setIsAddModalOpen(true);
            }}
          >
            <span className="ti-plus"></span>
            <span>Add Report</span>
          </button>
        </header>

        {/* Search Bar */}
        <div className="vault-search">
          <span className="vault-search__icon ti-search"></span>
          <input
            type="text"
            className="vault-search__input"
            placeholder="Search reports by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category Filter Bar */}
        {records.length > 0 && (
          <div className="vault-filter-bar">
            <CategoryBadge
              category="all"
              count={records.length}
              active={selectedCategory === 'all'}
              onClick={() => setSelectedCategory('all')}
            />
            {activeCategoriesWithRecords.map(cat => (
              <CategoryBadge
                key={cat}
                category={cat}
                count={categoryCounts[cat] || 0}
                active={selectedCategory === cat}
                onClick={() => setSelectedCategory(cat)}
              />
            ))}
          </div>
        )}

        {/* Favourites Section */}
        {selectedCategory === 'all' && favourites.length > 0 && (
          <section className="vault-favourites">
            <h3 className="vault-favourites__title">⭐ Quick Access Favourites</h3>
            <div className="vault-favourites__row">
              {favourites.map(record => {
                const catInfo = CATEGORIES[record.category];
                return (
                  <div
                    key={record.id}
                    className="fav-card"
                    onClick={() => navigate(`/elder/medical-records/${record.id}/view`)}
                  >
                    <div
                      className="fav-card__icon-box"
                      style={{ backgroundColor: catInfo?.bg || '#F0FBF7' }}
                    >
                      <span
                        className={`fav-card__icon ${catInfo?.icon || 'ti-file-text'}`}
                        style={{ color: catInfo?.color || '#1D9E75' }}
                      ></span>
                    </div>
                    <div className="fav-card__details">
                      <h4 className="fav-card__name">{record.name}</h4>
                      <span className="fav-card__date">
                        {new Date(record.report_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Records List Display */}
        <section className="vault-records-display">
          {renderRecordsDisplay()}
        </section>

        {/* Add/Edit Modal */}
        <AddRecordModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSaved={handleSaved}
          editingRecord={editingRecord}
        />



        {/* Global Toast Notification */}
        {toast && (
          <div className="toast-wrapper">
            <div className="toast-notification">{toast}</div>
          </div>
        )}

      </div>
    </ElderLayout>
  );
}
