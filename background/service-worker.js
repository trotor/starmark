// Starmark Service Worker
// Handles bookmark operations, API calls, and session management

import { OpenAIClient } from '../lib/openai.js';

// Initialize OpenAI client
let openai = new OpenAIClient('');

// Session-based undo history (clears when browser closes)
let undoHistory = [];

// Current settings
let settings = null;

// Initialize on install/update
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Starmark] Extension installed/updated');
  await loadSettings();
});

// Load settings on startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('[Starmark] Browser started');
  await loadSettings();
  // Clear undo history on browser start (session-based)
  undoHistory = [];
});

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get('settings');
    settings = result.settings || getDefaultSettings();
    openai.setApiKey(settings.apiKey);
    openai.setModel(settings.model);
    console.log('[Starmark] Settings loaded');
  } catch (error) {
    console.error('[Starmark] Failed to load settings:', error);
    settings = getDefaultSettings();
  }
}

// Default settings
function getDefaultSettings() {
  return {
    apiKey: '',
    model: 'gpt-4o-mini',
    autoClassify: false,
    multiCategory: 'best',
    uncertainAction: 'leave',
    confidenceThreshold: 70,
    preset: 'custom',
    customCategories: []
  };
}

// Listen for messages from popup and options
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender)
    .then(sendResponse)
    .catch(error => sendResponse({ error: error.message }));
  return true; // Keep channel open for async response
});

// Handle incoming messages
async function handleMessage(request, sender) {
  switch (request.type) {
    case 'SETTINGS_UPDATED':
      settings = request.settings;
      openai.setApiKey(settings.apiKey);
      openai.setModel(settings.model);
      return { success: true };

    case 'GET_SETTINGS':
      if (!settings) await loadSettings();
      return { settings };

    case 'CLASSIFY_PAGE':
      return await classifyPage(request.tabId);

    case 'CLASSIFY_BOOKMARK':
      return await classifyBookmark(request.bookmark);

    case 'GET_ALL_BOOKMARKS':
      return await getAllBookmarks();

    case 'GET_FOLDERS':
      return await getBookmarkFolders();

    case 'MOVE_BOOKMARK':
      return await moveBookmark(request.bookmarkId, request.folderId);

    case 'UNDO_LAST':
      return await undoLast();

    case 'UNDO_ALL':
      return await undoAll();

    case 'GET_UNDO_COUNT':
      return { count: undoHistory.length };

    case 'TEST_API':
      return await openai.testConnection();

    default:
      throw new Error(`Unknown message type: ${request.type}`);
  }
}

// Classify the current page
async function classifyPage(tabId) {
  // Get page content from content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const targetTabId = tabId || tab?.id;

  if (!targetTabId) {
    throw new Error('No active tab found');
  }

  let pageContent;
  try {
    const response = await chrome.tabs.sendMessage(targetTabId, { type: 'GET_PAGE_CONTENT' });
    pageContent = response;
  } catch (error) {
    // Content script might not be loaded, try injecting it
    await chrome.scripting.executeScript({
      target: { tabId: targetTabId },
      files: ['content/content.js']
    });
    // Try again
    pageContent = await chrome.tabs.sendMessage(targetTabId, { type: 'GET_PAGE_CONTENT' });
  }

  if (!pageContent) {
    throw new Error('Failed to get page content');
  }

  // Get available categories
  const categories = await getCategories();

  if (categories.length === 0) {
    throw new Error('No categories available. Please add folders to your bookmarks or configure categories in settings.');
  }

  // Classify with OpenAI
  const result = await openai.classifyBookmark(pageContent, categories);

  return {
    ...result,
    pageTitle: pageContent.title,
    pageUrl: pageContent.url
  };
}

// Classify a specific bookmark
async function classifyBookmark(bookmark) {
  // Fetch page content
  let pageContent = {
    url: bookmark.url,
    title: bookmark.title,
    description: '',
    keywords: '',
    headings: [],
    mainContent: ''
  };

  // Try to get more content by fetching the page
  try {
    const response = await fetch(bookmark.url, {
      method: 'GET',
      headers: {
        'Accept': 'text/html'
      }
    });

    if (response.ok) {
      const html = await response.text();
      pageContent = parseHtmlContent(html, bookmark.url, bookmark.title);
    }
  } catch (error) {
    console.log('[Starmark] Could not fetch page, using basic info:', error.message);
  }

  // Get available categories
  const categories = await getCategories();

  if (categories.length === 0) {
    throw new Error('No categories available');
  }

  // Classify with OpenAI
  const result = await openai.classifyBookmark(pageContent, categories);

  return {
    ...result,
    bookmarkId: bookmark.id,
    bookmarkTitle: bookmark.title
  };
}

// Parse HTML content (simple parser for service worker)
function parseHtmlContent(html, url, title) {
  // Extract meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                    html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const description = descMatch ? descMatch[1] : '';

  // Extract meta keywords
  const keywordsMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)["']/i);
  const keywords = keywordsMatch ? keywordsMatch[1] : '';

  // Extract headings (simple regex)
  const headings = [];
  const headingRegex = /<h[12][^>]*>([^<]*)<\/h[12]>/gi;
  let match;
  while ((match = headingRegex.exec(html)) !== null && headings.length < 10) {
    const text = match[1].trim();
    if (text) headings.push(text);
  }

  // Extract body text (very basic)
  let mainContent = '';
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    mainContent = bodyMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 2000);
  }

  return {
    url,
    title,
    description,
    keywords,
    headings,
    mainContent
  };
}

// Get all available categories (folders + custom)
async function getCategories() {
  const folders = await getBookmarkFolders();
  const folderNames = folders.map(f => f.title);

  // Add custom categories from settings
  const customCategories = settings?.customCategories || [];

  // Combine and deduplicate
  const allCategories = [...new Set([...folderNames, ...customCategories])];

  return allCategories.filter(c => c && c.trim());
}

// Get all bookmark folders
async function getBookmarkFolders() {
  const tree = await chrome.bookmarks.getTree();
  const folders = [];

  function traverse(nodes, path = '') {
    for (const node of nodes) {
      if (node.children) {
        // It's a folder
        if (node.title) {
          folders.push({
            id: node.id,
            title: node.title,
            path: path ? `${path}/${node.title}` : node.title
          });
        }
        traverse(node.children, node.title ? (path ? `${path}/${node.title}` : node.title) : path);
      }
    }
  }

  traverse(tree);
  return folders;
}

// Get all bookmarks (non-folders)
async function getAllBookmarks() {
  const tree = await chrome.bookmarks.getTree();
  const bookmarks = [];

  function traverse(nodes) {
    for (const node of nodes) {
      if (node.children) {
        traverse(node.children);
      } else if (node.url) {
        bookmarks.push({
          id: node.id,
          title: node.title,
          url: node.url,
          parentId: node.parentId,
          dateAdded: node.dateAdded
        });
      }
    }
  }

  traverse(tree);
  return { bookmarks };
}

// Move a bookmark to a folder
async function moveBookmark(bookmarkId, folderId) {
  // Get current bookmark info for undo
  const [bookmark] = await chrome.bookmarks.get(bookmarkId);
  const previousParentId = bookmark.parentId;

  // Move the bookmark
  await chrome.bookmarks.move(bookmarkId, { parentId: folderId });

  // Record for undo
  undoHistory.push({
    type: 'move',
    bookmarkId,
    previousParentId,
    newParentId: folderId,
    timestamp: Date.now()
  });

  return { success: true };
}

// Undo last action
async function undoLast() {
  if (undoHistory.length === 0) {
    return { success: false, message: 'Nothing to undo' };
  }

  const action = undoHistory.pop();

  if (action.type === 'move') {
    try {
      await chrome.bookmarks.move(action.bookmarkId, { parentId: action.previousParentId });
      return { success: true, message: 'Bookmark moved back' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  return { success: false, message: 'Unknown action type' };
}

// Undo all actions from this session
async function undoAll() {
  if (undoHistory.length === 0) {
    return { success: false, message: 'Nothing to undo' };
  }

  const count = undoHistory.length;
  let undoneCount = 0;

  // Undo in reverse order
  while (undoHistory.length > 0) {
    const action = undoHistory.pop();
    if (action.type === 'move') {
      try {
        await chrome.bookmarks.move(action.bookmarkId, { parentId: action.previousParentId });
        undoneCount++;
      } catch (error) {
        console.error('[Starmark] Failed to undo:', error);
      }
    }
  }

  return {
    success: true,
    message: `Undone ${undoneCount} of ${count} actions`
  };
}

// Listen for new bookmarks (for auto-classify feature)
chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
  if (!settings?.autoClassify || !bookmark.url) {
    return;
  }

  console.log('[Starmark] New bookmark created, auto-classifying...');

  try {
    const result = await classifyBookmark(bookmark);

    if (result.confidence >= settings.confidenceThreshold) {
      // Find folder with matching name
      const folders = await getBookmarkFolders();
      const targetFolder = folders.find(f => f.title === result.category);

      if (targetFolder && targetFolder.id !== bookmark.parentId) {
        await moveBookmark(id, targetFolder.id);
        console.log(`[Starmark] Auto-moved "${bookmark.title}" to "${result.category}"`);
      }
    }
  } catch (error) {
    console.error('[Starmark] Auto-classify failed:', error);
  }
});

// Initialize settings on load
loadSettings();
