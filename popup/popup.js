// Starmark Popup Script

// DOM Elements
const elements = {
  // Views
  mainView: document.getElementById('mainView'),
  resultView: document.getElementById('resultView'),
  reviewView: document.getElementById('reviewView'),
  loadingView: document.getElementById('loadingView'),
  errorView: document.getElementById('errorView'),

  // Main view
  apiStatus: document.getElementById('apiStatus'),
  configureApi: document.getElementById('configureApi'),
  settingsBtn: document.getElementById('settingsBtn'),
  classifyCurrentBtn: document.getElementById('classifyCurrentBtn'),
  quickReviewBtn: document.getElementById('quickReviewBtn'),
  reviewAllBtn: document.getElementById('reviewAllBtn'),
  autoClassifyToggle: document.getElementById('autoClassifyToggle'),
  undoSection: document.getElementById('undoSection'),
  undoCount: document.getElementById('undoCount'),
  undoLastBtn: document.getElementById('undoLastBtn'),
  undoAllBtn: document.getElementById('undoAllBtn'),

  // Result view
  backFromResult: document.getElementById('backFromResult'),
  resultTitle: document.getElementById('resultTitle'),
  resultUrl: document.getElementById('resultUrl'),
  resultFolder: document.getElementById('resultFolder'),
  resultConfidence: document.getElementById('resultConfidence'),
  resultReason: document.getElementById('resultReason'),
  saveBookmarkBtn: document.getElementById('saveBookmarkBtn'),
  skipResultBtn: document.getElementById('skipResultBtn'),

  // Review view
  stopReview: document.getElementById('stopReview'),
  reviewTitle2: document.getElementById('reviewTitle2'),
  reviewModeBadge: document.getElementById('reviewModeBadge'),
  progressFill: document.getElementById('progressFill'),
  reviewCurrent: document.getElementById('reviewCurrent'),
  reviewTotal: document.getElementById('reviewTotal'),
  reviewContent: document.getElementById('reviewContent'),
  reviewLoading: document.getElementById('reviewLoading'),
  reviewTitle: document.getElementById('reviewTitle'),
  reviewUrl: document.getElementById('reviewUrl'),
  reviewFolder: document.getElementById('reviewFolder'),
  reviewConfidence: document.getElementById('reviewConfidence'),
  reviewReason: document.getElementById('reviewReason'),
  skipBtn: document.getElementById('skipBtn'),
  acceptBtn: document.getElementById('acceptBtn'),
  statsAccepted: document.getElementById('statsAccepted'),
  statsSkipped: document.getElementById('statsSkipped'),

  // Loading & Error
  loadingText: document.getElementById('loadingText'),
  errorMessage: document.getElementById('errorMessage'),
  errorBackBtn: document.getElementById('errorBackBtn'),

  // Token footer
  tokenFooter: document.getElementById('tokenFooter'),
  tokenCount: document.getElementById('tokenCount')
};

// State
let state = {
  settings: null,
  folders: [],
  currentClassification: null,
  reviewMode: {
    bookmarks: [],
    currentIndex: 0,
    accepted: 0,
    skipped: 0,
    active: false,
    isQuick: false // Quick review mode flag
  }
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadSettings();
  await loadFolders();
  await updateTokenUsage();
  await updateUndoCount();
  setupEventListeners();
  setupKeyboardShortcuts();
}

// Load settings from background
async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    state.settings = response.settings;

    // Update UI based on settings
    if (state.settings?.apiKey) {
      elements.apiStatus.classList.add('hidden');
      elements.classifyCurrentBtn.disabled = false;
      elements.quickReviewBtn.disabled = false;
      elements.reviewAllBtn.disabled = false;
    } else {
      elements.apiStatus.classList.remove('hidden');
      elements.classifyCurrentBtn.disabled = true;
      elements.quickReviewBtn.disabled = true;
      elements.reviewAllBtn.disabled = true;
    }

    elements.autoClassifyToggle.checked = state.settings?.autoClassify || false;
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Load bookmark folders
async function loadFolders() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_FOLDERS' });
    state.folders = response || [];
  } catch (error) {
    console.error('Failed to load folders:', error);
  }
}

// Update undo count
async function updateUndoCount() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_UNDO_COUNT' });
    const count = response.count || 0;
    elements.undoCount.textContent = count;

    if (count > 0) {
      elements.undoSection.classList.remove('hidden');
    } else {
      elements.undoSection.classList.add('hidden');
    }
  } catch (error) {
    console.error('Failed to get undo count:', error);
  }
}

// Update token usage display
async function updateTokenUsage() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_TOKEN_USAGE' });
    const total = response.total || 0;
    elements.tokenCount.textContent = total.toLocaleString();
  } catch (error) {
    console.error('Failed to get token usage:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Settings
  elements.settingsBtn.addEventListener('click', openSettings);
  elements.configureApi.addEventListener('click', openSettings);

  // Main actions
  elements.classifyCurrentBtn.addEventListener('click', classifyCurrentPage);
  elements.quickReviewBtn.addEventListener('click', () => startReviewMode(true));
  elements.reviewAllBtn.addEventListener('click', () => startReviewMode(false));
  elements.autoClassifyToggle.addEventListener('change', toggleAutoClassify);

  // Undo
  elements.undoLastBtn.addEventListener('click', undoLast);
  elements.undoAllBtn.addEventListener('click', undoAll);

  // Result view
  elements.backFromResult.addEventListener('click', () => showView('main'));
  elements.saveBookmarkBtn.addEventListener('click', saveClassification);
  elements.skipResultBtn.addEventListener('click', () => showView('main'));

  // Review view
  elements.stopReview.addEventListener('click', stopReviewMode);
  elements.skipBtn.addEventListener('click', skipCurrentBookmark);
  elements.acceptBtn.addEventListener('click', acceptCurrentBookmark);

  // Error view
  elements.errorBackBtn.addEventListener('click', () => showView('main'));
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Only in review mode
    if (!state.reviewMode.active) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      acceptCurrentBookmark();
    } else if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      skipCurrentBookmark();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      stopReviewMode();
    }
  });
}

// Show a specific view
function showView(viewName) {
  elements.mainView.classList.add('hidden');
  elements.resultView.classList.add('hidden');
  elements.reviewView.classList.add('hidden');
  elements.loadingView.classList.add('hidden');
  elements.errorView.classList.add('hidden');

  switch (viewName) {
    case 'main':
      elements.mainView.classList.remove('hidden');
      updateUndoCount();
      updateTokenUsage();
      break;
    case 'result':
      elements.resultView.classList.remove('hidden');
      updateTokenUsage();
      break;
    case 'review':
      elements.reviewView.classList.remove('hidden');
      break;
    case 'loading':
      elements.loadingView.classList.remove('hidden');
      break;
    case 'error':
      elements.errorView.classList.remove('hidden');
      break;
  }
}

// Show loading with message
function showLoading(message) {
  elements.loadingText.textContent = message;
  showView('loading');
}

// Show error
function showError(message) {
  elements.errorMessage.textContent = message;
  showView('error');
}

// Open settings page
function openSettings() {
  chrome.runtime.openOptionsPage();
}

// Toggle auto-classify
async function toggleAutoClassify() {
  const enabled = elements.autoClassifyToggle.checked;
  state.settings.autoClassify = enabled;

  await chrome.storage.local.set({
    settings: { ...state.settings, autoClassify: enabled }
  });

  chrome.runtime.sendMessage({
    type: 'SETTINGS_UPDATED',
    settings: state.settings
  });
}

// Classify current page
async function classifyCurrentPage() {
  showLoading('Analyzing page...');

  try {
    const response = await chrome.runtime.sendMessage({ type: 'CLASSIFY_PAGE' });

    if (response.error) {
      throw new Error(response.error);
    }

    state.currentClassification = response;
    await updateTokenUsage(); // Update tokens after API call
    showClassificationResult(response);
  } catch (error) {
    showError(error.message);
  }
}

// Show classification result
function showClassificationResult(result) {
  elements.resultTitle.textContent = result.pageTitle || 'Untitled';
  elements.resultUrl.textContent = result.pageUrl || '';

  // Populate folder dropdown
  populateFolderDropdown(elements.resultFolder, result.category);

  // Set confidence
  elements.resultConfidence.textContent = `${result.confidence}%`;
  elements.resultConfidence.className = 'confidence-badge ' + getConfidenceClass(result.confidence);

  // Set reason
  elements.resultReason.textContent = result.reason || 'No explanation provided';

  showView('result');
}

// Save classification (bookmark current page to selected folder)
async function saveClassification() {
  const folderId = elements.resultFolder.value;

  showLoading('Saving bookmark...');

  try {
    // First, create the bookmark
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const bookmark = await chrome.bookmarks.create({
      parentId: folderId,
      title: tab.title,
      url: tab.url
    });

    showView('main');
    await updateUndoCount();
  } catch (error) {
    showError(error.message);
  }
}

// Start review mode (quick or deep)
async function startReviewMode(isQuick = false) {
  showLoading('Loading bookmarks...');

  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_BOOKMARKS' });

    if (!response.bookmarks || response.bookmarks.length === 0) {
      showError('No bookmarks found to review');
      return;
    }

    state.reviewMode = {
      bookmarks: response.bookmarks,
      currentIndex: 0,
      accepted: 0,
      skipped: 0,
      active: true,
      isQuick: isQuick
    };

    // Update UI for quick vs deep mode
    if (isQuick) {
      elements.reviewTitle2.textContent = 'Quick Review';
      elements.reviewModeBadge.textContent = 'URL only';
      elements.reviewModeBadge.className = 'mode-badge quick';
    } else {
      elements.reviewTitle2.textContent = 'Deep Review';
      elements.reviewModeBadge.textContent = 'Full analysis';
      elements.reviewModeBadge.className = 'mode-badge deep';
    }

    elements.reviewTotal.textContent = response.bookmarks.length;
    updateReviewStats();

    showView('review');
    await classifyNextBookmark();
  } catch (error) {
    showError(error.message);
  }
}

// Classify next bookmark in queue
async function classifyNextBookmark() {
  const { bookmarks, currentIndex, isQuick } = state.reviewMode;

  if (currentIndex >= bookmarks.length) {
    // Done!
    stopReviewMode();
    return;
  }

  const bookmark = bookmarks[currentIndex];

  // Update progress
  elements.reviewCurrent.textContent = currentIndex + 1;
  const progress = ((currentIndex) / bookmarks.length) * 100;
  elements.progressFill.style.width = `${progress}%`;

  // Show loading state
  elements.reviewContent.classList.add('hidden');
  elements.reviewLoading.classList.remove('hidden');

  try {
    // Use quick or deep classification based on mode
    const messageType = isQuick ? 'QUICK_CLASSIFY_BOOKMARK' : 'CLASSIFY_BOOKMARK';

    const response = await chrome.runtime.sendMessage({
      type: messageType,
      bookmark
    });

    if (response.error) {
      throw new Error(response.error);
    }

    state.currentClassification = {
      ...response,
      bookmarkId: bookmark.id
    };

    showReviewItem(bookmark, response);
  } catch (error) {
    // Show bookmark with error, let user skip or choose manually
    showReviewItem(bookmark, {
      category: state.folders[0]?.title || 'Unknown',
      confidence: 0,
      reason: `Error: ${error.message}`
    });
  }
}

// Show review item
function showReviewItem(bookmark, classification) {
  elements.reviewTitle.textContent = bookmark.title || 'Untitled';
  elements.reviewUrl.textContent = bookmark.url || '';

  // Populate folder dropdown
  populateFolderDropdown(elements.reviewFolder, classification.category);

  // Set confidence
  elements.reviewConfidence.textContent = `${classification.confidence}%`;
  elements.reviewConfidence.className = 'confidence-badge ' + getConfidenceClass(classification.confidence);

  // Set reason
  elements.reviewReason.textContent = classification.reason || 'No explanation provided';

  // Update token usage after each classification
  updateTokenUsage();

  // Show content, hide loading
  elements.reviewLoading.classList.add('hidden');
  elements.reviewContent.classList.remove('hidden');
}

// Accept current bookmark classification
async function acceptCurrentBookmark() {
  const folderId = elements.reviewFolder.value;
  const bookmark = state.reviewMode.bookmarks[state.reviewMode.currentIndex];

  try {
    await chrome.runtime.sendMessage({
      type: 'MOVE_BOOKMARK',
      bookmarkId: bookmark.id,
      folderId
    });

    state.reviewMode.accepted++;
  } catch (error) {
    console.error('Failed to move bookmark:', error);
  }

  state.reviewMode.currentIndex++;
  updateReviewStats();
  await classifyNextBookmark();
}

// Skip current bookmark
async function skipCurrentBookmark() {
  state.reviewMode.skipped++;
  state.reviewMode.currentIndex++;
  updateReviewStats();
  await classifyNextBookmark();
}

// Update review stats
function updateReviewStats() {
  elements.statsAccepted.textContent = state.reviewMode.accepted;
  elements.statsSkipped.textContent = state.reviewMode.skipped;
}

// Stop review mode
function stopReviewMode() {
  state.reviewMode.active = false;
  showView('main');
}

// Populate folder dropdown
function populateFolderDropdown(selectElement, selectedCategory) {
  selectElement.innerHTML = '';

  state.folders.forEach(folder => {
    const option = document.createElement('option');
    option.value = folder.id;
    option.textContent = folder.path || folder.title;

    if (folder.title === selectedCategory) {
      option.selected = true;
    }

    selectElement.appendChild(option);
  });
}

// Get confidence CSS class
function getConfidenceClass(confidence) {
  if (confidence >= 70) return 'confidence-high';
  if (confidence >= 40) return 'confidence-medium';
  return 'confidence-low';
}

// Undo last action
async function undoLast() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'UNDO_LAST' });
    if (response.success) {
      await updateUndoCount();
    } else {
      showError(response.message);
    }
  } catch (error) {
    showError(error.message);
  }
}

// Undo all actions
async function undoAll() {
  if (!confirm('Undo all changes from this session?')) return;

  try {
    const response = await chrome.runtime.sendMessage({ type: 'UNDO_ALL' });
    if (response.success) {
      await updateUndoCount();
    } else {
      showError(response.message);
    }
  } catch (error) {
    showError(error.message);
  }
}
