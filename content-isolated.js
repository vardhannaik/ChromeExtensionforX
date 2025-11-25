// Control Panel for X - Isolated World Script
// Runs with Chrome API access

console.log('🎮 X Control Panel: Starting backend...');

(async function() {
  'use strict';

  // Get settings from storage
  let settings;
  try {
    const result = await chrome.storage.sync.get('settings');
    settings = result.settings || { 
      hideCheckmarks: true, 
      hideAds: false, 
      hideParody: false,
      keywordMutingEnabled: false
    };
    console.log('Control Panel for X: Settings loaded', settings);
  } catch (error) {
    console.error('Control Panel for X: Error loading settings', error);
    settings = { 
      hideCheckmarks: true, 
      hideAds: false, 
      hideParody: false,
      keywordMutingEnabled: false
    };
  }

  // Apply settings as CSS classes to the body
  function applySettings() {
    const body = document.body || document.documentElement;
    
    if (settings.hideCheckmarks) {
      body.classList.add('xcp-hideCheckmarks');
    } else {
      body.classList.remove('xcp-hideCheckmarks');
    }
    
    if (settings.hideAds) {
      body.classList.add('xcp-hideAds');
    } else {
      body.classList.remove('xcp-hideAds');
    }
    
    if (settings.hideParody) {
      body.classList.add('xcp-hideParody');
    } else {
      body.classList.remove('xcp-hideParody');
    }
  }

  // ============================================
  // KEYWORD MANAGEMENT
  // ============================================

  let muteKeywords = [];
  let mutedAccounts = [];
  const mutedThisSession = new Set();
  const muteQueue = [];
  let isProcessingQueue = false;

  // Load keywords from storage
  async function loadKeywords() {
    const data = await chrome.storage.local.get(['muteKeywords', 'mutedAccounts']);
    muteKeywords = data.muteKeywords || [];
    mutedAccounts = data.mutedAccounts || [];
    
    // Add existing muted accounts to session cache
    mutedAccounts.forEach(m => mutedThisSession.add(m.username));
    
    console.log(`Loaded ${muteKeywords.length} mute keywords, ${mutedAccounts.length} muted accounts`);
  }

  await loadKeywords();

  // ============================================
  // MUTE QUEUE SYSTEM
  // ============================================

  async function addToMuteQueue(tweetElement, username, keyword) {
    // Check if already muted
    if (mutedThisSession.has(username)) {
      return;
    }

    muteQueue.push({ tweetElement, username, keyword });
    mutedThisSession.add(username);

    if (!isProcessingQueue) {
      processMuteQueue();
    }
  }

  async function processMuteQueue() {
    if (muteQueue.length === 0) {
      isProcessingQueue = false;
      return;
    }

    isProcessingQueue = true;
    const { tweetElement, username, keyword } = muteQueue.shift();

    console.log(`🔇 Attempting to mute @${username} (keyword: "${keyword}")`);

    const success = await muteUsernameViaUI(tweetElement, username);

    if (success) {
      // Track in storage
      await markAsMuted(username, `keyword:${keyword}`);
      showNotification(`Muted @${username}`, `Keyword: "${keyword}"`, 'mute');
    }

    // Wait 1 second before next mute (avoid rate limits)
    setTimeout(() => {
      processMuteQueue();
    }, 1000);
  }

  async function muteUsernameViaUI(tweetElement, username) {
    try {
      // Find the "..." menu button
      const menuButton = tweetElement.querySelector('[data-testid="caret"]');
      if (!menuButton) {
        console.warn('Menu button not found');
        return false;
      }

      // Click to open menu
      menuButton.click();

      // Wait for menu to appear
      await sleep(300);

      // Find "Mute @username" option
      const muteButton = Array.from(document.querySelectorAll('[role="menuitem"]'))
        .find(item => item.textContent.includes('Mute'));

      if (!muteButton) {
        console.warn('Mute button not found in menu');
        // Close menu by clicking elsewhere
        document.body.click();
        return false;
      }

      // Click to mute
      muteButton.click();

      // Wait for action to complete
      await sleep(200);

      console.log(`✅ Successfully muted @${username} via X's UI`);
      return true;

    } catch (error) {
      console.error('Error muting username:', error);
      return false;
    }
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function markAsMuted(username, reason) {
    mutedAccounts.push({
      username: username,
      mutedAt: Date.now(),
      reason: reason
    });
    await chrome.storage.local.set({ mutedAccounts });
  }

  // ============================================
  // KEYWORD CHECKING
  // ============================================

  async function checkTweetForKeywords(tweetElement) {
    if (!settings.keywordMutingEnabled) {
      return null;
    }

    const tweetText = tweetElement.textContent.toLowerCase();
    const username = extractUsername(tweetElement);

    // Check MUTE keywords
    if (username) {
      for (const keyword of muteKeywords) {
        if (tweetText.includes(keyword)) {
          console.log(`🔇 MUTE keyword match: "${keyword}" in @${username}'s tweet`);
          await addToMuteQueue(tweetElement, username, keyword);
          return { action: 'mute', keyword, username };
        }
      }
    }

    return null;
  }

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  function extractUsername(tweetElement) {
    try {
      // Try to find username from profile link
      const profileLink = tweetElement.querySelector('a[href^="/"][href*="/status/"]');
      if (profileLink) {
        const href = profileLink.getAttribute('href');
        const match = href.match(/^\/([^\/]+)\//);
        if (match) {
          return match[1];
        }
      }

      // Alternative: look for data-screen-name
      const userLink = tweetElement.querySelector('[data-testid="User-Name"] a');
      if (userLink) {
        const href = userLink.getAttribute('href');
        if (href && href.startsWith('/')) {
          return href.substring(1);
        }
      }
    } catch (error) {
      console.error('Error extracting username:', error);
    }
    return null;
  }

  function showNotification(title, message, type) {
    const notification = document.createElement('div');
    notification.className = `xcp-notification xcp-${type}`;
    notification.innerHTML = `
      <strong>${title}</strong><br>
      <small>${message}</small>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, type === 'mute' ? 3000 : 2000);
  }

  // ============================================
  // EXISTING FEATURES
  // ============================================

  // Hide verified tweets (except those you follow)
  function hideVerifiedTweets() {
    if (!settings.hideCheckmarks) return;

    // Check if we're on the Following timeline
    const isFollowingTimeline = window.location.pathname === '/home' && 
      (window.location.search.includes('f=following') || 
       document.querySelector('[role="tab"][aria-selected="true"][href*="following"]'));

    if (isFollowingTimeline) {
      return; // Don't hide anything on Following timeline
    }

    // Find all articles (tweets)
    const articles = document.querySelectorAll('article');
    articles.forEach(article => {
      if (article.hasAttribute('data-xcp-processed')) return;

      // Check if tweet has verified badge
      const hasVerifiedBadge = article.querySelector('[data-testid="icon-verified"]');

      if (hasVerifiedBadge) {
        const cell = article.closest('[data-testid="cellInnerDiv"]') || article;
        cell.style.display = 'none';
        article.setAttribute('data-xcp-processed', 'true');
      } else {
        article.setAttribute('data-xcp-processed', 'true');
      }
    });
  }

  // Hide promoted/ad content
  function hidePromotedContent() {
    if (!settings.hideAds) return;

    // Method 1: Find by "Promoted" text
    const allCells = document.querySelectorAll('[data-testid="cellInnerDiv"]');
    allCells.forEach(cell => {
      const cellText = cell.textContent || '';
      
      if (cellText.includes('Promoted') || cellText.includes('Ad by')) {
        const article = cell.querySelector('article');
        if (article && !cell.hasAttribute('data-xcp-ad-processed')) {
          cell.style.display = 'none';
          cell.setAttribute('data-xcp-ad-processed', 'true');
        }
      }
    });

    // Method 2: Find by placement tracking
    const trackedContent = document.querySelectorAll('[data-testid="placementTracking"]');
    trackedContent.forEach(element => {
      const cell = element.closest('[data-testid="cellInnerDiv"]');
      if (cell && !cell.hasAttribute('data-xcp-ad-processed')) {
        cell.style.display = 'none';
        cell.setAttribute('data-xcp-ad-processed', 'true');
      }
    });

    // Method 3: Find promoted tweets by looking for specific patterns
    const articles = document.querySelectorAll('article');
    articles.forEach(article => {
      const spans = article.querySelectorAll('span');
      let isPromoted = false;
      
      spans.forEach(span => {
        const text = span.textContent?.trim();
        if (text === 'Promoted' || text === 'Ad') {
          isPromoted = true;
        }
      });
      
      if (isPromoted && !article.hasAttribute('data-xcp-ad-processed')) {
        const cell = article.closest('[data-testid="cellInnerDiv"]') || article;
        cell.style.display = 'none';
        article.setAttribute('data-xcp-ad-processed', 'true');
      }
    });
  }

  // Hide parody accounts
  function hideParodyAccounts() {
    if (!settings.hideParody) return;

    const articles = document.querySelectorAll('article');
    articles.forEach(article => {
      if (article.hasAttribute('data-xcp-parody-processed')) return;

      const allText = article.textContent || '';
      const displayNameElement = article.querySelector('[dir="ltr"] span');
      const displayName = displayNameElement?.textContent || '';
      
      const parodyIndicators = [
        'parody', 'fan account', 'fanaccount', 'not affiliated',
        'unofficial', 'satire', 'fake', 'impersonat', 'tribute', 'stan account'
      ];

      let isParody = false;
      const lowerDisplayName = displayName.toLowerCase();
      
      for (const indicator of parodyIndicators) {
        if (lowerDisplayName.includes(indicator) || allText.toLowerCase().includes(indicator)) {
          isParody = true;
          break;
        }
      }

      if (isParody) {
        const cell = article.closest('[data-testid="cellInnerDiv"]') || article;
        cell.style.display = 'none';
        article.setAttribute('data-xcp-parody-processed', 'true');
      } else {
        article.setAttribute('data-xcp-parody-processed', 'true');
      }
    });
  }

  // ============================================
  // MAIN PROCESSING
  // ============================================

  async function processTweets() {
    const articles = document.querySelectorAll('article');
    
    for (const article of articles) {
      // Skip if already processed for keywords
      if (article.hasAttribute('data-xcp-keyword-checked')) continue;

      // Check keywords first
      await checkTweetForKeywords(article);
      
      article.setAttribute('data-xcp-keyword-checked', 'true');
    }

    // Run other filters
    hideVerifiedTweets();
    hidePromotedContent();
    hideParodyAccounts();
  }

  // Observer to handle dynamic content
  const observer = new MutationObserver(() => {
    applySettings();
    processTweets();
  });

  // Start observing
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Initial run
    applySettings();
    processTweets();
    
    // Also run periodically for content loaded after initial scan
    setInterval(() => {
      processTweets();
    }, 1000);
  } else {
    // Wait for body to be available
    const bodyObserver = new MutationObserver(() => {
      if (document.body) {
        bodyObserver.disconnect();
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        applySettings();
        processTweets();
        
        setInterval(() => {
          processTweets();
        }, 1000);
      }
    });
    
    bodyObserver.observe(document.documentElement, {
      childList: true
    });
  }

  // ============================================
  // CONSOLE INTERFACE (Global API)
  // ============================================

  // Assign methods directly (we're in MAIN world now)
  window.XControlPanel = {
    // ========== MUTE KEYWORDS ==========
    
    addMuteKeyword: async function(keyword) {
      const normalized = keyword.toLowerCase().trim();
      
      if (muteKeywords.length >= 1000) {
        console.error('❌ Maximum 1000 mute keywords reached');
        return;
      }
      
      if (muteKeywords.includes(normalized)) {
        console.warn('⚠️ Mute keyword already exists');
        return;
      }
      
      muteKeywords.push(normalized);
      await chrome.storage.local.set({ muteKeywords });
      
      const wordCount = normalized.split(' ').length;
      console.log(`✅ Added MUTE keyword: "${normalized}" (${muteKeywords.length}/1000)`);
      console.log(`   → ${wordCount} word${wordCount > 1 ? 's' : ''} - Will mute accounts tweeting this`);
    },
    
    removeMuteKeyword: async function(keyword) {
      const normalized = keyword.toLowerCase().trim();
      const originalLength = muteKeywords.length;
      
      muteKeywords = muteKeywords.filter(k => k !== normalized);
      
      if (muteKeywords.length === originalLength) {
        console.warn(`⚠️ Keyword "${normalized}" not found`);
        console.log('💡 Use listMuteKeywords() to see all keywords');
        return;
      }
      
      await chrome.storage.local.set({ muteKeywords });
      console.log(`✅ Removed MUTE keyword: "${normalized}"`);
      console.log(`   Remaining: ${muteKeywords.length}/1000`);
    },
    
    removeMuteKeywordByIndex: async function(index) {
      if (index < 0 || index >= muteKeywords.length) {
        console.error(`❌ Invalid index. Must be 0-${muteKeywords.length - 1}`);
        return;
      }
      
      const removed = muteKeywords[index];
      muteKeywords.splice(index, 1);
      
      await chrome.storage.local.set({ muteKeywords });
      console.log(`✅ Removed MUTE keyword #${index}: "${removed}"`);
      console.log(`   Remaining: ${muteKeywords.length}/1000`);
    },
    
    listMuteKeywords: function() {
      console.log(`📋 MUTE Keywords (${muteKeywords.length}/1000):`);
      console.log('');
      
      if (muteKeywords.length === 0) {
        console.log('  (none)');
        console.log('');
        console.log('💡 Add keywords with: addMuteKeyword("crypto")');
        return [];
      }
      
      muteKeywords.forEach((kw, index) => {
        const wordCount = kw.split(' ').length;
        const type = wordCount > 1 ? `[${wordCount} words]` : '[1 word]';
        console.log(`  ${index}. "${kw}" ${type}`);
      });
      
      console.log('');
      console.log('💡 Remove: removeMuteKeyword("keyword") or removeMuteKeywordByIndex(0)');
      
      return muteKeywords;
    },
    
    clearMuteKeywords: async function() {
      if (muteKeywords.length === 0) {
        console.log('⚠️ No keywords to clear');
        return;
      }
      
      const count = muteKeywords.length;
      if (!confirm(`Clear all ${count} MUTE keywords?`)) return;
      
      muteKeywords = [];
      await chrome.storage.local.set({ muteKeywords: [] });
      console.log(`✅ Cleared ${count} MUTE keywords`);
    },
    
    findKeyword: function(searchTerm) {
      const search = searchTerm.toLowerCase();
      
      console.log(`🔍 Searching for: "${searchTerm}"\n`);
      
      const matches = muteKeywords.filter(k => k.includes(search));
      if (matches.length > 0) {
        console.log(`Found ${matches.length} keyword${matches.length > 1 ? 's' : ''}:`);
        matches.forEach(k => console.log(`  - "${k}"`));
      } else {
        console.log('❌ No keywords found');
      }
      
      return matches;
    },
    
    // ========== TRACKING ==========
    
    listMuted: function() {
      console.log(`📋 Muted accounts: ${mutedAccounts.length}\n`);
      if (mutedAccounts.length === 0) {
        console.log('  (none)');
      } else {
        console.table(mutedAccounts);
      }
      return mutedAccounts;
    },
    
    clearMutedTracking: async function() {
      if (mutedAccounts.length === 0) {
        console.log('⚠️ No muted accounts to clear');
        return;
      }
      
      if (!confirm(`Clear tracking for ${mutedAccounts.length} muted accounts? (Accounts stay muted in X)`)) return;
      
      mutedAccounts = [];
      mutedThisSession.clear();
      await chrome.storage.local.set({ mutedAccounts: [] });
      console.log('✅ Cleared tracking (accounts still muted in X)');
    },
    
    // ========== STATS ==========
    
    stats: function() {
      console.log('📊 X Control Panel Stats:');
      console.log(`   Keywords: ${muteKeywords.length}/1000`);
      console.log(`   Muted accounts: ${mutedAccounts.length}`);
      console.log(`   Muting enabled: ${settings.keywordMutingEnabled}`);
      console.log('');
      console.log('   Other settings:');
      console.log(`   - Hide verified: ${settings.hideCheckmarks}`);
      console.log(`   - Hide ads: ${settings.hideAds}`);
      console.log(`   - Hide parody: ${settings.hideParody}`);
      
      return {
        keywords: muteKeywords.length,
        mutedAccounts: mutedAccounts.length,
        keywordMutingEnabled: settings.keywordMutingEnabled,
        settings: settings
      };
    },
    
    // ========== HELP ==========
    
    help: function() {
      console.log(`
🎮 X Control Panel - Console Commands

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADD KEYWORDS (Single or Multi-Word):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  XControlPanel.addMuteKeyword('crypto')
  XControlPanel.addMuteKeyword('crypto giveaway')
  XControlPanel.addMuteKeyword('link in bio')

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REMOVE KEYWORDS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  XControlPanel.dropMuteKeyword('crypto giveaway')
  XControlPanel.dropMuteKeywordByIndex(0)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LIST & SEARCH:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  XControlPanel.listMuteKeywords()
  XControlPanel.findKeyword('crypto')

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLEAR ALL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  XControlPanel.clearMuteKeywords()

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATS & TRACKING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  XControlPanel.stats()
  XControlPanel.listMuted()
  XControlPanel.clearMutedTracking()

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BULK ADD:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ['crypto', 'nft'].forEach(k => XControlPanel.addMuteKeyword(k))

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 TIPS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Keywords permanently mute accounts via X
• Multi-word phrases supported: "link in bio"
• Use dropMuteKeyword() to remove from list
• Enable "keyword muting" in extension popup first!
      `);
    }
  };

  // Show help on load
  console.log(`
🎮 X Control Panel Loaded!

Type: XControlPanel.help()
  `);

  // Listen for events from MAIN world script
  window.addEventListener('XCP_ADD_KEYWORD', async (e) => {
    await window.XControlPanel.addMuteKeyword(e.detail.keyword);
  });
  
  window.addEventListener('XCP_REMOVE_KEYWORD', async (e) => {
    await window.XControlPanel.removeMuteKeyword(e.detail.keyword);
  });
  
  window.addEventListener('XCP_REMOVE_INDEX', async (e) => {
    await window.XControlPanel.removeMuteKeywordByIndex(e.detail.index);
  });
  
  window.addEventListener('XCP_LIST_KEYWORDS', () => {
    window.XControlPanel.listMuteKeywords();
  });
  
  window.addEventListener('XCP_FIND_KEYWORD', (e) => {
    window.XControlPanel.findKeyword(e.detail.term);
  });
  
  window.addEventListener('XCP_CLEAR_KEYWORDS', async () => {
    await window.XControlPanel.clearMuteKeywords();
  });
  
  window.addEventListener('XCP_STATS', () => {
    window.XControlPanel.stats();
  });
  
  window.addEventListener('XCP_LIST_MUTED', () => {
    window.XControlPanel.listMuted();
  });
  
  window.addEventListener('XCP_CLEAR_TRACKING', async () => {
    await window.XControlPanel.clearMutedTracking();
  });

})().catch(error => {
  console.error('Control Panel for X: Fatal error during initialization', error);
  console.error('Stack trace:', error.stack);
  
  // Even if there's an error, XControlPanel object exists for debugging
  if (!window.XControlPanel.error) {
    window.XControlPanel.error = error;
    window.XControlPanel.errorMessage = 'Extension failed to load. Check console for details.';
  }
});
