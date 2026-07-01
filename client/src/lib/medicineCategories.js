// Shared medicine categories — used by CategoryPicker (add/edit form)
// and ElderMedicines (grouped "All Medicines" list) so icons/colors
// always match between the two.

export const MEDICINE_CATEGORIES = [
  { id: 'diabetes',    label: 'Diabetes',              icon: 'ti-droplet',    color: '#1D9E75' },
  { id: 'bp',          label: 'Blood Pressure',        icon: 'ti-heartbeat',  color: '#E24B4A' },
  { id: 'heart',       label: 'Heart',                 icon: 'ti-heart',      color: '#BA2D65' },
  { id: 'cholesterol', label: 'Cholesterol',           icon: 'ti-chart-line', color: '#BA7517' },
  { id: 'thyroid',     label: 'Thyroid',                icon: 'ti-activity',   color: '#6366F1' },
  { id: 'pain',        label: 'Pain / Fever',           icon: 'ti-thermometer',color: '#185FA5' },
  { id: 'vitamins',    label: 'Vitamins & Supplements', icon: 'ti-apple',      color: '#1D9E75' },
  { id: 'other',       label: 'Other',                  icon: 'ti-pill',       color: '#5A7A9A' },
]

export function getCategory(id) {
  return MEDICINE_CATEGORIES.find(c => c.id === id) || MEDICINE_CATEGORIES[MEDICINE_CATEGORIES.length - 1]
}