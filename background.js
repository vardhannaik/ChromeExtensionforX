// Background service worker for Control Panel for X

// Default settings - hideCheckmarks enabled by default
const DEFAULT_SETTINGS = {
  hideCheckmarks: true,  // Enabled by default
  hideAds: false,
  hideParody: false,
  keywordMutingEnabled: false
};

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.sync.get('settings');
  
  if (!result.settings) {
    await chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
    console.log('Control Panel for X: Default settings initialized');
  }
  
  // Initialize keyword storage if not exists
  const localData = await chrome.storage.local.get(['muteKeywords', 'mutedAccounts']);
  
  if (!localData.muteKeywords) {
    await chrome.storage.local.set({ muteKeywords: [] });
  }
  if (!localData.mutedAccounts) {
    await chrome.storage.local.set({ mutedAccounts: [] });
  }
  
  console.log('Control Panel for X: Keyword storage initialized');
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
