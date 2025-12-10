// Default settings
const DEFAULT_SETTINGS = {
  apiKey: '',
  model: 'gpt-4o-mini',
  autoClassify: false,
  multiCategory: 'best',
  uncertainAction: 'leave',
  confidenceThreshold: 70,
  preset: 'custom',
  customCategories: []
};

// Preset categories
const PRESETS = {
  custom: [],
  developer: [
    'Documentation',
    'Tutorials',
    'Tools',
    'Libraries & Frameworks',
    'APIs',
    'DevOps',
    'Security',
    'Code Examples',
    'Stack Overflow',
    'GitHub Repos'
  ],
  researcher: [
    'Papers & Publications',
    'Data Sources',
    'Statistics',
    'References',
    'News & Articles',
    'Journals',
    'Books',
    'Courses',
    'Organizations'
  ],
  designer: [
    'Inspiration',
    'UI Kits',
    'Icons & Assets',
    'Color Palettes',
    'Typography',
    'Design Systems',
    'Tutorials',
    'Tools',
    'Portfolios'
  ],
  general: [
    'News',
    'Entertainment',
    'Shopping',
    'Social Media',
    'Finance',
    'Health',
    'Travel',
    'Food & Recipes',
    'Learning',
    'Work'
  ]
};

// DOM elements
const elements = {
  apiKey: document.getElementById('apiKey'),
  toggleApiKey: document.getElementById('toggleApiKey'),
  model: document.getElementById('model'),
  autoClassify: document.getElementById('autoClassify'),
  multiCategory: document.getElementById('multiCategory'),
  uncertainAction: document.getElementById('uncertainAction'),
  confidenceThreshold: document.getElementById('confidenceThreshold'),
  confidenceValue: document.getElementById('confidenceValue'),
  preset: document.getElementById('preset'),
  customCategories: document.getElementById('customCategories'),
  newCategory: document.getElementById('newCategory'),
  addCategory: document.getElementById('addCategory'),
  saveSettings: document.getElementById('saveSettings'),
  resetSettings: document.getElementById('resetSettings'),
  statusMessage: document.getElementById('statusMessage')
};

// Current settings state
let currentSettings = { ...DEFAULT_SETTINGS };

// Initialize
document.addEventListener('DOMContentLoaded', loadSettings);

// Event listeners
elements.toggleApiKey.addEventListener('click', toggleApiKeyVisibility);
elements.confidenceThreshold.addEventListener('input', updateConfidenceDisplay);
elements.preset.addEventListener('change', handlePresetChange);
elements.addCategory.addEventListener('click', addCustomCategory);
elements.newCategory.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addCustomCategory();
});
elements.saveSettings.addEventListener('click', saveSettings);
elements.resetSettings.addEventListener('click', resetSettings);

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get('settings');
    currentSettings = { ...DEFAULT_SETTINGS, ...result.settings };
    applySettingsToUI();
  } catch (error) {
    console.error('Failed to load settings:', error);
    showStatus('Failed to load settings', 'error');
  }
}

// Apply settings to UI elements
function applySettingsToUI() {
  elements.apiKey.value = currentSettings.apiKey;
  elements.model.value = currentSettings.model;
  elements.autoClassify.checked = currentSettings.autoClassify;
  elements.multiCategory.value = currentSettings.multiCategory;
  elements.uncertainAction.value = currentSettings.uncertainAction;
  elements.confidenceThreshold.value = currentSettings.confidenceThreshold;
  elements.confidenceValue.textContent = `${currentSettings.confidenceThreshold}%`;
  elements.preset.value = currentSettings.preset;
  renderCustomCategories();
}

// Toggle API key visibility
function toggleApiKeyVisibility() {
  const isPassword = elements.apiKey.type === 'password';
  elements.apiKey.type = isPassword ? 'text' : 'password';
  elements.toggleApiKey.textContent = isPassword ? '🙈' : '👁️';
}

// Update confidence display
function updateConfidenceDisplay() {
  elements.confidenceValue.textContent = `${elements.confidenceThreshold.value}%`;
}

// Handle preset change
function handlePresetChange() {
  const preset = elements.preset.value;
  if (preset !== 'custom' && PRESETS[preset]) {
    // Add preset categories to custom categories (without duplicates)
    const existingCategories = new Set(currentSettings.customCategories);
    PRESETS[preset].forEach(cat => existingCategories.add(cat));
    currentSettings.customCategories = Array.from(existingCategories);
    renderCustomCategories();
  }
}

// Render custom categories
function renderCustomCategories() {
  elements.customCategories.innerHTML = '';
  currentSettings.customCategories.forEach((category, index) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML = `
      ${escapeHtml(category)}
      <button type="button" data-index="${index}" title="Remove">&times;</button>
    `;
    tag.querySelector('button').addEventListener('click', () => removeCategory(index));
    elements.customCategories.appendChild(tag);
  });
}

// Add custom category
function addCustomCategory() {
  const category = elements.newCategory.value.trim();
  if (category && !currentSettings.customCategories.includes(category)) {
    currentSettings.customCategories.push(category);
    renderCustomCategories();
    elements.newCategory.value = '';
  }
}

// Remove category
function removeCategory(index) {
  currentSettings.customCategories.splice(index, 1);
  renderCustomCategories();
}

// Save settings
async function saveSettings() {
  try {
    currentSettings = {
      ...currentSettings,
      apiKey: elements.apiKey.value.trim(),
      model: elements.model.value,
      autoClassify: elements.autoClassify.checked,
      multiCategory: elements.multiCategory.value,
      uncertainAction: elements.uncertainAction.value,
      confidenceThreshold: parseInt(elements.confidenceThreshold.value, 10),
      preset: elements.preset.value
    };

    await chrome.storage.local.set({ settings: currentSettings });

    // Notify background script of settings change
    chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED', settings: currentSettings });

    showStatus('Settings saved successfully!', 'success');
  } catch (error) {
    console.error('Failed to save settings:', error);
    showStatus('Failed to save settings', 'error');
  }
}

// Reset settings
async function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to defaults?')) {
    currentSettings = { ...DEFAULT_SETTINGS };
    applySettingsToUI();
    await saveSettings();
  }
}

// Show status message
function showStatus(message, type) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status-message ${type}`;
  setTimeout(() => {
    elements.statusMessage.className = 'status-message';
  }, 3000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
