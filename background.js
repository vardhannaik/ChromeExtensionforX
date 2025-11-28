// Background service worker for Control Panel for X

// Default settings - hideCheckmarks enabled by default
const DEFAULT_SETTINGS = {
  hideCheckmarks: true,  // Enabled by default
  hideAds: false,
  hideParody: false,
  keywordMutingEnabled: false,
  hideMediaOnlyTweets: false
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
  
  if (request.action === 'autoMute') {
    handleAutoMute(request.accounts, request.options || {})
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Auto-mute function using tabs and scripting
async function handleAutoMute(accounts, options = {}) {
  const delay = options.delay || 2000; // 2 seconds between each
  const results = [];
  
  console.log(`🔄 Auto-muting ${accounts.length} accounts...`);
  
  for (let i = 0; i < accounts.length; i++) {
    const { username } = accounts[i];
    
    try {
      // Create new tab
      const tab = await chrome.tabs.create({
        url: `https://x.com/${username}`,
        active: false // Background tab
      });
      
      // Wait for page to load
      await new Promise(resolve => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        });
      });
      
      // Wait extra time for page to fully render
      await sleep(1500);
      
      // Inject mute script
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: muteAccountOnProfile
      });
      
      // Close tab
      await chrome.tabs.remove(tab.id);
      
      const success = result[0]?.result;
      results.push({ username, success });
      
      console.log(`${success ? '✅' : '❌'} ${i + 1}/${accounts.length} ${success ? 'Muted' : 'Failed'} @${username}`);
      
      // Delay before next
      if (i < accounts.length - 1) {
        await sleep(delay);
      }
      
    } catch (error) {
      console.error(`❌ Error muting @${username}:`, error);
      results.push({ username, success: false, error: error.message });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n✅ Auto-mute complete! Successfully muted ${successCount}/${accounts.length} accounts`);
  
  return { success: true, results, successCount };
}

// Function injected into profile page to click mute
function muteAccountOnProfile() {
  try {
    // SAFETY CHECK: Don't mute accounts you follow
    const followButton = document.querySelector('[data-testid*="follow"]');
    if (followButton) {
      const buttonText = followButton.textContent.toLowerCase();
      if (buttonText.includes('following') || buttonText.includes('unfollow')) {
        console.log('⚠️ Skipping - you follow this account');
        return false;
      }
    }
    
    // Find More button
    const moreButton = document.querySelector('[data-testid="userActions"]');
    if (!moreButton) return false;
    
    moreButton.click();
    
    // Wait for menu
    return new Promise(resolve => {
      setTimeout(() => {
        const menu = document.querySelector('[role="menu"]');
        if (!menu) {
          resolve(false);
          return;
        }
        
        const menuItems = menu.querySelectorAll('[role="menuitem"]');
        const muteButton = Array.from(menuItems).find(item => {
          const text = item.textContent.trim().toLowerCase();
          return text === 'mute' || text.includes('mute @');
        });
        
        if (!muteButton) {
          resolve(false);
          return;
        }
        
        // Check if already muted
        if (muteButton.textContent.toLowerCase().includes('unmute')) {
          resolve(true); // Already muted
          return;
        }
        
        muteButton.click();
        resolve(true);
      }, 500);
    });
  } catch (error) {
    return false;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('Control Panel for X: Background service worker initialized');
