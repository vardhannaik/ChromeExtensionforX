// Control Panel for X - Content Script
// Main script that runs on twitter.com and x.com

(async function() {
  'use strict';

  // Get settings from storage
  const result = await chrome.storage.sync.get('settings');
  const settings = result.settings || { 
    hideCheckmarks: true, 
    hideAds: false, 
    hideParody: false,
    keywordMutingEnabled: false,
    keywordDroppingEnabled: false
  };

  console.log('Control Panel for X: Settings loaded', settings);

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
  let dropKeywords = [];
  let mutedAccounts = [];
  const mutedThisSession = new Set();
  const muteQueue = [];
  let isProcessingQueue = false;

  // Load keywords from storage
  async function loadKeywords() {
    const data = await chrome.storage.local.get(['muteKeywords', 'dropKeywords', 'mutedAccounts']);
    muteKeywords = data.muteKeywords || [];
    dropKeywords = data.dropKeywords || [];
    mutedAccounts = data.mutedAccounts || [];
    
    // Add existing muted accounts to session cache
    mutedAccounts.forEach(m => mutedThisSession.add(m.username));
    
    console.log(`Loaded ${muteKeywords.length} mute keywords, ${dropKeywords.length} drop keywords, ${mutedAccounts.length} muted accounts`);
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
    if (!settings.keywordMutingEnabled && !settings.keywordDroppingEnabled) {
      return null;
    }

    const tweetText = tweetElement.textContent.toLowerCase();
    const username = extractUsername(tweetElement);

    // Check DROP keywords first (less aggressive)
    if (settings.keywordDroppingEnabled) {
      for (const keyword of dropKeywords) {
        if (tweetText.includes(keyword)) {
          console.log(`🗑️ DROP keyword match: "${keyword}" in @${username}'s tweet`);
          tweetElement.style.display = 'none';
          tweetElement.setAttribute('data-xcp-dropped', 'true');
          showNotification(`Dropped tweet`, `Keyword: "${keyword}"`, 'drop');
          return { action: 'drop', keyword };
        }
      }
    }

    // Check MUTE keywords (more aggressive)
    if (settings.keywordMutingEnabled && username) {
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
      
      muteKeywords.forEach((kw, index) => {
        const wordCount = kw.split(' ').length;
        const type = wordCount > 1 ? `[${wordCount} words]` : '[1 word]';
        console.log(`  ${index}. "${kw}" ${type}`);
      });
      
      console.log('');
      console.log('💡 To remove: removeMuteKeyword("keyword") or removeMuteKeywordByIndex(0)');
      
      return muteKeywords;
    },
    
    clearMuteKeywords: async function() {
      if (!confirm(`Clear all ${muteKeywords.length} MUTE keywords?`)) return;
      
      muteKeywords = [];
      await chrome.storage.local.set({ muteKeywords: [] });
      console.log('✅ All MUTE keywords cleared');
    },
    
    // ========== DROP KEYWORDS ==========
    
    addDropKeyword: async function(keyword) {
      const normalized = keyword.toLowerCase().trim();
      
      if (dropKeywords.length >= 1000) {
        console.error('❌ Maximum 1000 drop keywords reached');
        return;
      }
      
      if (dropKeywords.includes(normalized)) {
        console.warn('⚠️ Drop keyword already exists');
        return;
      }
      
      dropKeywords.push(normalized);
      await chrome.storage.local.set({ dropKeywords });
      
      const wordCount = normalized.split(' ').length;
      console.log(`✅ Added DROP keyword: "${normalized}" (${dropKeywords.length}/1000)`);
      console.log(`   → ${wordCount} word${wordCount > 1 ? 's' : ''} - Will hide tweets containing this`);
    },
    
    removeDropKeyword: async function(keyword) {
      const normalized = keyword.toLowerCase().trim();
      const originalLength = dropKeywords.length;
      
      dropKeywords = dropKeywords.filter(k => k !== normalized);
      
      if (dropKeywords.length === originalLength) {
        console.warn(`⚠️ Keyword "${normalized}" not found`);
        console.log('💡 Use listDropKeywords() to see all keywords');
        return;
      }
      
      await chrome.storage.local.set({ dropKeywords });
      console.log(`✅ Removed DROP keyword: "${normalized}"`);
      console.log(`   Remaining: ${dropKeywords.length}/1000`);
    },
    
    removeDropKeywordByIndex: async function(index) {
      if (index < 0 || index >= dropKeywords.length) {
        console.error(`❌ Invalid index. Must be 0-${dropKeywords.length - 1}`);
        return;
      }
      
      const removed = dropKeywords[index];
      dropKeywords.splice(index, 1);
      
      await chrome.storage.local.set({ dropKeywords });
      console.log(`✅ Removed DROP keyword #${index}: "${removed}"`);
      console.log(`   Remaining: ${dropKeywords.length}/1000`);
    },
    
    listDropKeywords: function() {
      console.log(`📋 DROP Keywords (${dropKeywords.length}/1000):`);
      console.log('');
      
      dropKeywords.forEach((kw, index) => {
        const wordCount = kw.split(' ').length;
        const type = wordCount > 1 ? `[${wordCount} words]` : '[1 word]';
        console.log(`  ${index}. "${kw}" ${type}`);
      });
      
      console.log('');
      console.log('💡 To remove: removeDropKeyword("keyword") or removeDropKeywordByIndex(0)');
      
      return dropKeywords;
    },
    
    clearDropKeywords: async function() {
      if (!confirm(`Clear all ${dropKeywords.length} DROP keywords?`)) return;
      
      dropKeywords = [];
      await chrome.storage.local.set({ dropKeywords: [] });
      console.log('✅ All DROP keywords cleared');
    },
    
    // ========== COMBINED ==========
    
    listAllKeywords: function() {
      console.log(`\n📋 MUTE Keywords (${muteKeywords.length}/1000) - Permanently mutes accounts:\n`);
      muteKeywords.forEach((kw, i) => {
        const wc = kw.split(' ').length;
        console.log(`  ${i}. "${kw}" [${wc} word${wc > 1 ? 's' : ''}]`);
      });
      
      console.log(`\n📋 DROP Keywords (${dropKeywords.length}/1000) - Hides tweets only:\n`);
      dropKeywords.forEach((kw, i) => {
        const wc = kw.split(' ').length;
        console.log(`  ${i}. "${kw}" [${wc} word${wc > 1 ? 's' : ''}]`);
      });
      
      return { muteKeywords, dropKeywords };
    },
    
    findKeyword: function(searchTerm) {
      const search = searchTerm.toLowerCase();
      
      console.log(`🔍 Searching for: "${searchTerm}"\n`);
      
      const muteMatches = muteKeywords.filter(k => k.includes(search));
      if (muteMatches.length > 0) {
        console.log(`MUTE Keywords containing "${searchTerm}":`);
        muteMatches.forEach(k => console.log(`  - "${k}"`));
        console.log('');
      }
      
      const dropMatches = dropKeywords.filter(k => k.includes(search));
      if (dropMatches.length > 0) {
        console.log(`DROP Keywords containing "${searchTerm}":`);
        dropMatches.forEach(k => console.log(`  - "${k}"`));
      }
      
      if (muteMatches.length === 0 && dropMatches.length === 0) {
        console.log('❌ No keywords found');
      }
      
      return { muteMatches, dropMatches };
    },
    
    // ========== TRACKING ==========
    
    listMuted: function() {
      console.log(`📋 Muted accounts: ${mutedAccounts.length}\n`);
      console.table(mutedAccounts);
      return mutedAccounts;
    },
    
    clearMutedTracking: async function() {
      if (!confirm('Clear muted accounts tracking? (Accounts stay muted in X)')) return;
      
      mutedAccounts = [];
      mutedThisSession.clear();
      await chrome.storage.local.set({ mutedAccounts: [] });
      console.log('✅ Cleared tracking (accounts still muted in X)');
    },
    
    // ========== STATS ==========
    
    stats: function() {
      console.log('📊 X Control Panel Stats:');
      console.log(`   MUTE Keywords: ${muteKeywords.length}/1000 (permanent account mute)`);
      console.log(`   DROP Keywords: ${dropKeywords.length}/1000 (hide tweet only)`);
      console.log(`   Muted accounts: ${mutedAccounts.length}`);
      console.log(`   Settings:`, settings);
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
  
  XControlPanel.addDropKeyword('spoiler')
  XControlPanel.addDropKeyword('spoiler alert')

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REMOVE KEYWORDS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  XControlPanel.removeMuteKeyword('crypto giveaway')
  XControlPanel.removeMuteKeywordByIndex(0)
  
  XControlPanel.removeDropKeyword('spoiler alert')
  XControlPanel.removeDropKeywordByIndex(0)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LIST & SEARCH:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  XControlPanel.listMuteKeywords()
  XControlPanel.listDropKeywords()
  XControlPanel.listAllKeywords()
  XControlPanel.findKeyword('crypto')

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLEAR ALL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  XControlPanel.clearMuteKeywords()
  XControlPanel.clearDropKeywords()

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
  ['spoiler', 'politics'].forEach(k => XControlPanel.addDropKeyword(k))

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 TIPS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• MUTE keywords = Permanently mutes accounts via X
• DROP keywords = Hides tweets only (reversible)
• Multi-word phrases supported: "link in bio"
• Enable features in extension popup first!
      `);
    }
  };

  // Expose to global window object for console access
  window.XControlPanel = XControlPanel;

  // Show help on load
  console.log(`
🎮 X Control Panel Loaded!

Type: XControlPanel.help()
  `);

})();
