// Background service worker for Control Panel for X

// Default settings - hideCheckmarks enabled by default
const DEFAULT_SETTINGS = {
  hideCheckmarks: true,  // Enabled by default
  hideAds: false
};

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.sync.get('settings');
  
  if (!result.settings) {
    await chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
    console.log('Control Panel for X: Default settings initialized');
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.sync.get('settings', (result) => {
      sendResponse({ settings: result.settings || DEFAULT_SETTINGS });
    });
    return true; // Keep channel open for async response
  }
});

console.log('Control Panel for X: Background service worker initialized');
