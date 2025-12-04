// Default settings - hideCheckmarks OFF by default
const DEFAULT_SETTINGS = {
  hideCheckmarks: false,  // OFF by default
  hideAds: false,
  hideParody: false,
  keywordMutingEnabled: false,
  hideMediaOnlyTweets: false,
  autoMuteEnabled: false,
  autoMuteThreshold: 10,
  autoMuteDelay: 2000,
  pageLoadTimeout: 10000,
  spaRenderDelay: 1500
};

// Load settings from storage
async function loadSettings() {
  const result = await chrome.storage.sync.get('settings');
  return result.settings || DEFAULT_SETTINGS;
}

// Save settings to storage
async function saveSettings(settings) {
  await chrome.storage.sync.set({ settings });
}

// Load statistics
async function loadStats() {
  const data = await chrome.storage.local.get(['muteKeywords', 'mutedAccounts']);
  
  const muteKeywords = data.muteKeywords || [];
  const mutedAccounts = data.mutedAccounts || [];
  
  document.getElementById('muteKeywordCount').textContent = muteKeywords.length;
  document.getElementById('mutedAccountCount').textContent = mutedAccounts.length;
}

// Initialize UI with saved settings
async function initializeUI() {
  const settings = await loadSettings();
  
  // Set toggle states based on saved settings
  document.querySelectorAll('.toggle').forEach(toggle => {
    const setting = toggle.dataset.setting;
    if (settings[setting]) {
      toggle.classList.add('active');
    }
  });
  
  // Set threshold dropdown
  const thresholdSelect = document.getElementById('autoMuteThreshold');
  if (thresholdSelect && settings.autoMuteThreshold) {
    thresholdSelect.value = settings.autoMuteThreshold;
  }
  
  // Set delay dropdown
  const delaySelect = document.getElementById('autoMuteDelay');
  if (delaySelect && settings.autoMuteDelay) {
    delaySelect.value = settings.autoMuteDelay;
  }
  
  // Set page load timeout dropdown
  const pageLoadSelect = document.getElementById('pageLoadTimeout');
  if (pageLoadSelect && settings.pageLoadTimeout) {
    pageLoadSelect.value = settings.pageLoadTimeout;
  }
  
  // Set SPA render delay dropdown
  const spaDelaySelect = document.getElementById('spaRenderDelay');
  if (spaDelaySelect && settings.spaRenderDelay) {
    spaDelaySelect.value = settings.spaRenderDelay;
  }
  
  // Load statistics
  await loadStats();
}

// Handle toggle clicks
document.querySelectorAll('.toggle').forEach(toggle => {
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
  });
});

// Handle save button
document.getElementById('saveBtn').addEventListener('click', async () => {
  const settings = {};
  
  document.querySelectorAll('.toggle').forEach(toggle => {
    const setting = toggle.dataset.setting;
    settings[setting] = toggle.classList.contains('active');
  });
  
  // Get threshold value
  const thresholdSelect = document.getElementById('autoMuteThreshold');
  if (thresholdSelect) {
    settings.autoMuteThreshold = parseInt(thresholdSelect.value);
  }
  
  // Get delay value
  const delaySelect = document.getElementById('autoMuteDelay');
  if (delaySelect) {
    settings.autoMuteDelay = parseInt(delaySelect.value);
  }
  
  // Get page load timeout value
  const pageLoadSelect = document.getElementById('pageLoadTimeout');
  if (pageLoadSelect) {
    settings.pageLoadTimeout = parseInt(pageLoadSelect.value);
  }
  
  // Get SPA render delay value
  const spaDelaySelect = document.getElementById('spaRenderDelay');
  if (spaDelaySelect) {
    settings.spaRenderDelay = parseInt(spaDelaySelect.value);
  }
  
  await saveSettings(settings);
  
  // Show saved message
  const savedMessage = document.getElementById('savedMessage');
  savedMessage.classList.add('show');
  
  // Reload all X/Twitter tabs
  const tabs = await chrome.tabs.query({ url: ['*://twitter.com/*', '*://x.com/*'] });
  tabs.forEach(tab => {
    chrome.tabs.reload(tab.id);
  });
  
  // Hide saved message after 2 seconds
  setTimeout(() => {
    savedMessage.classList.remove('show');
  }, 2000);
});

// Initialize when popup opens
initializeUI();
