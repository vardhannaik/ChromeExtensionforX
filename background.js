// Background service worker for Control Panel for X

// Default settings - hideCheckmarks OFF by default
const DEFAULT_SETTINGS = {
  hideCheckmarks: false,  // OFF by default
  hideAds: false,
  hideParody: false,
  keywordMutingEnabled: false,
  hideMediaOnlyTweets: false,
  muteEmojis: false,          // Mute tweets with emojis
  autoMuteEnabled: false,     // Auto-trigger when threshold reached
  autoMuteThreshold: 10,      // Default: 10 accounts
  autoMuteDelay: 2000,        // Default: 2 seconds between accounts
  pageLoadTimeout: 10000,     // Default: 10 seconds to wait for page load
  spaRenderDelay: 1500,       // Default: 1.5 seconds for React to render
  debugLogging: false         // Debug logging OFF by default
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
  
  if (request.action === 'closeMuteTab') {
    // Get debug setting
    chrome.storage.sync.get('settings', async (result) => {
      const settings = result.settings || DEFAULT_SETTINGS;
      const debug = settings.debugLogging || false;
      
      if (debug) {
        console.log('📩 [closeMuteTab] Received close request');
        console.log(`📩 [closeMuteTab] Current state: windowId=${muteWindowId}, tabId=${muteTabId}`);
      }
      
      // Close the mute tab when queue is empty
      if (muteWindowId) {
        chrome.windows.remove(muteWindowId)
          .then(() => {
            console.log('🧹 Closed mute tab');
            muteWindowId = null;
            muteTabId = null;
          })
          .catch(err => {
            console.log(`⚠️  Error closing window: ${err.message}`);
          });
      } else if (muteTabId) {
        const tabToClose = muteTabId;
        chrome.tabs.remove(tabToClose)
          .then(() => {
            // Verify it actually closed before clearing the ID
            setTimeout(() => {
              chrome.tabs.get(tabToClose).then(() => {
                console.log(`⚠️  WARNING: Tab ${tabToClose} still exists after close attempt!`);
                // Tab still exists - don't clear the ID so it can be reused
              }).catch(() => {
                // Tab successfully closed
                console.log(`🧹 Closed mute tab (ID: ${tabToClose})`);
                muteTabId = null;
                if (debug) console.log(`✅ Verified: Tab ${tabToClose} is closed`);
              });
            }, 100);
          })
          .catch(err => {
            console.log(`⚠️  Error closing tab ${tabToClose}: ${err.message}`);
            // Don't clear muteTabId on error - tab might still exist
          });
      } else {
        if (debug) console.log('⚠️  [closeMuteTab] No tab/window to close');
      }
    });
    
    sendResponse({ success: true });
    return true;
  }
});

// Reusable minimized window for muting
let muteWindowId = null;
let muteTabId = null;
let isProcessing = false; // Lock to prevent simultaneous auto-mute operations

// Get or create reusable minimized window
async function getReuseWindow() {
  console.log(`🔍 [getReuseWindow] Called - Current state: windowId=${muteWindowId}, tabId=${muteTabId}`);
  
  // Check if we have EITHER a window or a tab to reuse
  if (muteWindowId || muteTabId) {
    try {
      console.log(`🔍 [getReuseWindow] Checking if ${muteWindowId ? `window ${muteWindowId}` : `tab ${muteTabId}`} exists...`);
      
      // If we have a window, verify both window and tab
      if (muteWindowId) {
        await chrome.windows.get(muteWindowId);
        await chrome.tabs.get(muteTabId);
        console.log(`♻️  [getReuseWindow] Reusing existing window (Tab ID: ${muteTabId})`);
        return { windowId: muteWindowId, tabId: muteTabId };
      } else {
        // Just verify the tab exists
        await chrome.tabs.get(muteTabId);
        console.log(`♻️  [getReuseWindow] Reusing existing tab (Tab ID: ${muteTabId})`);
        return { windowId: null, tabId: muteTabId };
      }
    } catch (err) {
      console.log(`⚠️  [getReuseWindow] Window/tab no longer exists: ${err.message}`);
      
      // Try to clean up orphaned tab if it still exists
      if (muteTabId) {
        try {
          await chrome.tabs.remove(muteTabId);
          console.log('🧹 [getReuseWindow] Cleaned up orphaned tab');
        } catch (e) {
          console.log(`🧹 [getReuseWindow] Orphaned tab already gone`);
        }
      }
      
      muteWindowId = null;
      muteTabId = null;
    }
  }
  
  console.log(`🔨 [getReuseWindow] Creating NEW window/tab...`);
  
  // Try multiple strategies in order
  let window;
  
  try {
    // Strategy 1: Try minimized popup window (most hidden)
    console.log('🔨 [getReuseWindow] Attempting minimized window...');
    window = await chrome.windows.create({
      url: 'https://x.com',
      type: 'popup',
      state: 'minimized',
      focused: false,
      width: 800,
      height: 600
    });
    console.log(`✅ [getReuseWindow] Created minimized window (Window ID: ${window.id}, Tab ID: ${window.tabs[0].id})`);
  } catch (error1) {
    console.log(`❌ [getReuseWindow] Minimized failed: ${error1.message}`);
    try {
      // Strategy 2: Small window in bottom-right corner (visible but minimal)
      console.log('🔨 [getReuseWindow] Attempting corner window...');
      const screenWidth = screen.availWidth || 1920;
      const screenHeight = screen.availHeight || 1080;
      const windowWidth = 400;
      const windowHeight = 300;
      
      window = await chrome.windows.create({
        url: 'https://x.com',
        type: 'popup',
        focused: false,
        left: screenWidth - windowWidth - 20,
        top: screenHeight - windowHeight - 100,
        width: windowWidth,
        height: windowHeight
      });
      console.log(`✅ [getReuseWindow] Created corner window (Window ID: ${window.id}, Tab ID: ${window.tabs[0].id})`);
    } catch (error2) {
      console.log(`❌ [getReuseWindow] Corner window failed: ${error2.message}`);
      // Strategy 3: Fallback to background tab (most compatible)
      console.log('🔨 [getReuseWindow] Attempting background tab...');
      const tab = await chrome.tabs.create({
        url: 'https://x.com',
        active: false
      });
      console.log(`✅ [getReuseWindow] Created background tab (Tab ID: ${tab.id})`);
      muteTabId = tab.id;
      muteWindowId = null; // No window, just tab
      console.log(`🔍 [getReuseWindow] Returning: windowId=null, tabId=${tab.id}`);
      return { windowId: null, tabId: tab.id };
    }
  }
  
  muteWindowId = window.id;
  muteTabId = window.tabs[0].id;
  
  console.log(`🔍 [getReuseWindow] Returning: windowId=${muteWindowId}, tabId=${muteTabId}`);
  return { windowId: muteWindowId, tabId: muteTabId };
}

// Wait for tab to complete loading (with timeout)
async function waitForTabLoad(tabId, timeout = 10000) {
  return new Promise((resolve, reject) => {
    let resolved = false;
    
    const listener = (id, info) => {
      if (id === tabId && info.status === 'complete' && !resolved) {
        resolved = true;
        chrome.tabs.onUpdated.removeListener(listener);
        chrome.tabs.onRemoved.removeListener(removeListener);
        clearTimeout(timer);
        resolve();
      }
    };
    
    const removeListener = (id) => {
      if (id === tabId && !resolved) {
        resolved = true;
        chrome.tabs.onUpdated.removeListener(listener);
        chrome.tabs.onRemoved.removeListener(removeListener);
        clearTimeout(timer);
        reject(new Error('Tab was closed'));
      }
    };
    
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        chrome.tabs.onUpdated.removeListener(listener);
        chrome.tabs.onRemoved.removeListener(removeListener);
        reject(new Error('Timeout waiting for tab to load'));
      }
    }, timeout);
    
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.onRemoved.addListener(removeListener);
  });
}

// Auto-mute function using single minimized window
async function handleAutoMute(accounts, options = {}) {
  // Check if already processing
  if (isProcessing) {
    console.log('⚠️  [handleAutoMute] Already processing, rejecting new request');
    return { success: false, error: 'Auto-mute already in progress' };
  }
  
  isProcessing = true;
  
  const delay = options.delay || 2000;
  const debugLog = options.debugLogging || false;
  const results = [];
  
  // Helper for conditional debug logging
  const log = (msg) => {
    if (debugLog) console.log(msg);
  };
  
  log('🔒 [handleAutoMute] Lock acquired');
  
  console.log(`\n========================================`);
  console.log(`🔄 Auto-mute starting: ${accounts.length} accounts`);
  console.log(`========================================\n`);
  
  let windowId, tabId;
  
  try {
    // Get or create minimized window
    log(`🔍 [handleAutoMute] Calling getReuseWindow()...`);
    const windowData = await getReuseWindow();
    windowId = windowData.windowId;
    tabId = windowData.tabId;
    log(`🔍 [handleAutoMute] Got window/tab - windowId=${windowId}, tabId=${tabId}`);
    
    for (let i = 0; i < accounts.length; i++) {
      const { username } = accounts[i];
      
      log(`\n🔍 [handleAutoMute] Processing account ${i+1}/${accounts.length}: @${username}`);
      log(`🔍 [handleAutoMute] Using tabId=${tabId}`);
      
      try {
        // Navigate to profile in minimized window
        log(`🔍 [handleAutoMute] Navigating to https://x.com/${username}...`);
        await chrome.tabs.update(tabId, { 
          url: `https://x.com/${username}` 
        });
        
        // Wait for navigation to complete
        log(`🔍 [handleAutoMute] Waiting for tab to load...`);
        await waitForTabLoad(tabId, options.pageLoadTimeout || 10000);
        
        // Extra wait for SPA (React) content to load
        // X is a Single Page App - the page status is 'complete' but React takes time to render
        const spaDelay = options.spaRenderDelay || 1500;
        log(`🔍 [handleAutoMute] Waiting ${spaDelay}ms for SPA content to render...`);
        await sleep(spaDelay);
        
        // Inject and execute mute script with MutationObserver
        log(`🔍 [handleAutoMute] Executing mute script...`);
        const result = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: muteAccountOnProfile
        });
        
        const success = result[0]?.result;
        results.push({ username, success });
        
        console.log(`${success ? '✅' : '❌'} ${i + 1}/${accounts.length} ${success ? 'Muted' : 'Failed'} @${username}`);
        
        // Progress summary every 10 accounts
        if ((i + 1) % 10 === 0 && i < accounts.length - 1) {
          const successSoFar = results.filter(r => r.success).length;
          const failedSoFar = results.length - successSoFar;
          console.log(`\n📊 Progress: ${i + 1}/${accounts.length} processed (✅ ${successSoFar} | ❌ ${failedSoFar})\n`);
          
          // Send progress to content script for page console logging
          try {
            chrome.tabs.query({}, (tabs) => {
              tabs.forEach(tab => {
                if (tab.url?.includes('x.com')) {
                  chrome.tabs.sendMessage(tab.id, {
                    action: 'autoMuteProgress',
                    current: i + 1,
                    total: accounts.length,
                    success: successSoFar,
                    failed: failedSoFar
                  }).catch(() => {}); // Ignore errors if content script not loaded
                }
              });
            });
          } catch (e) {
            // Ignore message send errors
          }
        }
        
        // Delay before next
        if (i < accounts.length - 1) {
          await sleep(delay);
        }
        
      } catch (error) {
        const errorMsg = error.message || 'Unknown error';
        console.error(`❌ Error muting @${username}: ${errorMsg}`);
        results.push({ username, success: false, error: errorMsg });
      }
    }
    
  } finally {
    // DON'T close tab here - keep it open for next cycle
    // It will be reused via getReuseWindow() if another cycle starts
    // Only manual cleanup or idle timeout will close it
    
    // Release lock
    isProcessing = false;
    console.log('🔓 [handleAutoMute] Lock released (tab kept open for reuse)');
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n✅ [handleAutoMute] Complete! Successfully muted ${successCount}/${accounts.length} accounts`);
  
  return { success: true, results, successCount };
}

// Function injected into profile page to click mute (with MutationObserver)
function muteAccountOnProfile() {
  return new Promise(async (resolve) => {
    try {
      // Helper: Wait for element to appear using MutationObserver
      const waitForElement = (selector, timeout = 5000) => {
        return new Promise((res, rej) => {
          // Check if already exists
          const existing = document.querySelector(selector);
          if (existing) return res(existing);
          
          // Watch for it to appear
          const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
              observer.disconnect();
              res(element);
            }
          });
          
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
          
          // Timeout
          setTimeout(() => {
            observer.disconnect();
            rej(new Error('Element not found'));
          }, timeout);
        });
      };
      
      // Wait for page to be fully ready
      await waitForElement('[data-testid="userActions"]');
      console.log('✓ Found userActions button');
      
      // Extra settle time
      await new Promise(r => setTimeout(r, 300));
      
      // SAFETY CHECK: Don't mute accounts you follow
      const followButton = document.querySelector('[data-testid*="follow"]');
      if (followButton) {
        const buttonText = followButton.textContent.toLowerCase();
        if (buttonText.includes('following') || buttonText.includes('unfollow')) {
          console.log('⚠️  Skipping - you follow this account');
          resolve(false);
          return;
        }
      }
      
      // Find and click More button
      const moreButton = document.querySelector('[data-testid="userActions"]');
      if (!moreButton) {
        console.log('❌ More button not found');
        resolve(false);
        return;
      }
      
      moreButton.click();
      console.log('✓ Clicked More button');
      
      // Wait for menu to appear using MutationObserver
      await waitForElement('[role="menu"]');
      console.log('✓ Menu appeared');
      
      // Extra time for menu to settle
      await new Promise(r => setTimeout(r, 300));
      
      const menu = document.querySelector('[role="menu"]');
      if (!menu) {
        console.log('❌ Menu disappeared');
        resolve(false);
        return;
      }
      
      const menuItems = menu.querySelectorAll('[role="menuitem"]');
      console.log(`✓ Found ${menuItems.length} menu items`);
      
      const muteButton = Array.from(menuItems).find(item => {
        const text = item.textContent.trim().toLowerCase();
        return text === 'mute' || text.includes('mute @');
      });
      
      if (!muteButton) {
        console.log(`❌ Mute button not found. Menu items: ${Array.from(menuItems).map(i => i.textContent.trim()).join(', ')}`);
        resolve(false);
        return;
      }
      
      console.log(`✓ Found mute button: "${muteButton.textContent.trim()}"`);
      
      // Check if already muted
      if (muteButton.textContent.toLowerCase().includes('unmute')) {
        console.log('⏭️  Already muted - skipping');
        resolve(true); // Already muted - return success
        return;
      }
      
      muteButton.click();
      console.log('✅ Mute button clicked');
      resolve(true);
      
    } catch (error) {
      console.error('Mute error:', error);
      resolve(false);
    }
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('Control Panel for X: Background service worker initialized');
