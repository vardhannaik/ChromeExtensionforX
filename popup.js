// Default settings - hideCheckmarks enabled by default
const DEFAULT_SETTINGS = {
  hideCheckmarks: true,  // Enabled by default
  hideAds: false,
  hideParody: false,
  keywordMutingEnabled: false
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
