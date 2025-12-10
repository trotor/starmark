// Content script for extracting page content
// This runs on every page and responds to requests from the service worker

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_PAGE_CONTENT') {
    const content = extractPageContent();
    sendResponse(content);
  }
  return true; // Keep the message channel open for async response
});

// Extract relevant content from the page
function extractPageContent() {
  const content = {
    url: window.location.href,
    title: document.title,
    description: getMetaDescription(),
    keywords: getMetaKeywords(),
    headings: getHeadings(),
    mainContent: getMainContent(),
    ogTags: getOpenGraphTags()
  };

  return content;
}

// Get meta description
function getMetaDescription() {
  const meta = document.querySelector('meta[name="description"]') ||
               document.querySelector('meta[property="og:description"]');
  return meta ? meta.getAttribute('content') : '';
}

// Get meta keywords
function getMetaKeywords() {
  const meta = document.querySelector('meta[name="keywords"]');
  return meta ? meta.getAttribute('content') : '';
}

// Get headings (h1, h2)
function getHeadings() {
  const headings = [];
  document.querySelectorAll('h1, h2').forEach((heading, index) => {
    if (index < 10) { // Limit to first 10 headings
      const text = heading.textContent.trim();
      if (text) {
        headings.push(text);
      }
    }
  });
  return headings;
}

// Get main content text
function getMainContent() {
  // Try to find main content area
  const mainSelectors = [
    'main',
    'article',
    '[role="main"]',
    '.content',
    '.main-content',
    '#content',
    '#main'
  ];

  let mainElement = null;
  for (const selector of mainSelectors) {
    mainElement = document.querySelector(selector);
    if (mainElement) break;
  }

  // Fall back to body if no main content area found
  if (!mainElement) {
    mainElement = document.body;
  }

  // Get text content, cleaned up
  const text = getCleanText(mainElement);

  // Limit to first 2000 characters to avoid huge payloads
  return text.substring(0, 2000);
}

// Get clean text from element
function getCleanText(element) {
  // Clone the element to avoid modifying the page
  const clone = element.cloneNode(true);

  // Remove script, style, nav, footer, aside elements
  const removeSelectors = [
    'script', 'style', 'noscript', 'nav', 'footer', 'aside',
    'header', '.nav', '.navigation', '.menu', '.sidebar',
    '.footer', '.header', '.ad', '.advertisement', '.cookie',
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]'
  ];

  removeSelectors.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });

  // Get text content and clean it up
  let text = clone.textContent || '';

  // Remove extra whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

// Get Open Graph tags
function getOpenGraphTags() {
  const ogTags = {};
  const ogMetas = document.querySelectorAll('meta[property^="og:"]');

  ogMetas.forEach(meta => {
    const property = meta.getAttribute('property').replace('og:', '');
    const content = meta.getAttribute('content');
    if (property && content) {
      ogTags[property] = content;
    }
  });

  return ogTags;
}

// Notify that content script is ready
console.log('[Starmark] Content script loaded');
