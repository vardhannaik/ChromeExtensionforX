// Control Panel for X - Isolated World Script
// Runs with Chrome API access

console.log('🎮 X Control Panel: Starting backend...');

(async function() {
  'use strict';

  // Get settings from storage
  let settings;
  let isAutoMuting = false; // Track if auto-mute is currently running
  
  try {
    const result = await chrome.storage.sync.get('settings');
    settings = result.settings || { 
      hideCheckmarks: false,  // OFF by default
      hideAds: false, 
      hideParody: false,
      keywordMutingEnabled: false,
      hideMediaOnlyTweets: false,
      muteEmojis: false,
      autoMuteEnabled: false,
      autoMuteThreshold: 10,
      autoMuteDelay: 2000,
      pageLoadTimeout: 10000,
      spaRenderDelay: 1500,
      debugLogging: false
    };
    console.log('Control Panel for X: Settings loaded', settings);
  } catch (error) {
    console.error('Control Panel for X: Error loading settings', error);
    settings = { 
      hideCheckmarks: false,  // OFF by default
      hideAds: false, 
      hideParody: false,
      keywordMutingEnabled: false,
      hideMediaOnlyTweets: false,
      muteEmojis: false,
      autoMuteEnabled: false,
      autoMuteThreshold: 10,
      autoMuteDelay: 2000,
      pageLoadTimeout: 10000,
      spaRenderDelay: 1500,
      debugLogging: false
    };
  }
  
  // Listen for settings changes (reset auto-mute if disabled)
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes.settings) {
      const oldSettings = settings;
      settings = changes.settings.newValue;
      
      // If auto-mute was disabled, cancel any ongoing auto-mute
      if (oldSettings.autoMuteEnabled && !settings.autoMuteEnabled) {
        console.log('🛑 Auto-mute disabled - cancelling any ongoing process');
        isAutoMuting = false;
      }
      
      // If threshold or delay changed while auto-mute active, log it
      if (settings.autoMuteEnabled && isAutoMuting) {
        if (oldSettings.autoMuteThreshold !== settings.autoMuteThreshold) {
          console.log(`ℹ️  Auto-mute threshold changed: ${oldSettings.autoMuteThreshold} → ${settings.autoMuteThreshold}`);
        }
        if (oldSettings.autoMuteDelay !== settings.autoMuteDelay) {
          console.log(`ℹ️  Auto-mute delay changed: ${oldSettings.autoMuteDelay}ms → ${settings.autoMuteDelay}ms (applies to next batch)`);
        }
      }
    }
  });
  
  // Listen for progress updates from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'autoMuteProgress') {
      console.log(`📊 Progress: ${request.current}/${request.total} processed (✅ ${request.success} | ❌ ${request.failed})`);
    }
  });

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

  // Batch mute queue - Array maintains insertion order (FIFO)
  let batchMuteQueue = []; // Array of {username, reason, addedAt}

  // Load keywords from storage
  async function loadKeywords() {
    const data = await chrome.storage.local.get(['muteKeywords', 'mutedAccounts', 'batchMuteQueue']);
    muteKeywords = data.muteKeywords || [];
    mutedAccounts = data.mutedAccounts || [];
    
    // Load batch queue from storage
    batchMuteQueue = data.batchMuteQueue || [];
    
    // Add existing muted accounts to session cache
    mutedAccounts.forEach(m => mutedThisSession.add(m.username));
    
    console.log(`Loaded ${muteKeywords.length} mute keywords, ${mutedAccounts.length} muted accounts`);
  }

  await loadKeywords();

  // ============================================
  // BATCH MUTE QUEUE (MANUAL ONLY)
  // ============================================

  async function addToBatchQueue(username, reason) {
    // Check if already in queue
    const exists = batchMuteQueue.some(item => 
      item.username.toLowerCase() === username.toLowerCase()
    );
    
    if (exists || mutedThisSession.has(username)) {
      return;
    }

    // Add to end of queue (FIFO order)
    batchMuteQueue.push({
      username: username,
      reason: reason,
      addedAt: Date.now()
    });
    
    mutedThisSession.add(username);
    
    // Save to storage
    await saveBatchQueue();
    
    // Check if auto-mute should trigger
    await checkAutoMuteTrigger();
  }
  
  async function saveBatchQueue() {
    await chrome.storage.local.set({ batchMuteQueue });
  }
  
  // Check if auto-mute should be triggered
  // Auto-mute trigger check with proper locking
  let autoMutePromise = null;
  
  async function checkAutoMuteTrigger() {
    if (batchMuteQueue.length === 0) return;
    
    // Check if auto-mute is enabled
    if (!settings.autoMuteEnabled) return;
    
    // Check if already running
    if (isAutoMuting || autoMutePromise) {
      // Wait for current auto-mute to complete before checking again
      if (autoMutePromise) {
        await autoMutePromise;
      }
      return;
    }
    
    const threshold = settings.autoMuteThreshold || 10;
    
    // Trigger when threshold reached
    if (batchMuteQueue.length >= threshold) {
      // Set flag IMMEDIATELY to prevent race conditions
      isAutoMuting = true;
      
      const totalAccounts = batchMuteQueue.length;
      console.log(`\n🔔 Auto-mute threshold reached (${totalAccounts} accounts queued)`);
      console.log(`🚀 Starting automatic mute process for ALL ${totalAccounts} accounts...\n`);
      
      // Create promise and store it
      autoMutePromise = (async () => {
        let success = false;
        try {
          // Mute ALL accounts in queue (not just threshold amount)
          await window.XControlPanel.autoMute('all');
          
          // Small delay to ensure cleanup fully completed
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          console.log('✅ Auto-mute cycle complete, ready for next trigger\n');
          success = true;
        } catch (error) {
          console.error('❌ Auto-mute error:', error);
          // Don't set success = true, so we won't retry
        } finally {
          const threshold = settings.autoMuteThreshold || 10;
          
          // Reset flags BEFORE checking - this allows next trigger
          isAutoMuting = false;
          autoMutePromise = null;
          
          // Only continue processing if the previous cycle succeeded
          if (!success) {
            console.log('⚠️  Previous cycle failed or rejected, stopping auto-trigger chain');
            return;
          }
          
          // Check if queue is now empty OR below threshold
          if (batchMuteQueue.length === 0) {
            console.log('🎉 Queue is empty, closing mute tab...');
            chrome.runtime.sendMessage({ action: 'closeMuteTab' });
          } else if (batchMuteQueue.length < threshold) {
            // Queue below threshold - close tab and wait for more accounts
            console.log(`📋 ${batchMuteQueue.length} accounts in queue (below threshold of ${threshold}), closing tab...`);
            chrome.runtime.sendMessage({ action: 'closeMuteTab' });
          } else {
            // Queue still above threshold - but DON'T trigger here
            // Let the next tweet detection naturally trigger it
            console.log(`📋 ${batchMuteQueue.length} accounts still in queue (threshold: ${threshold}), ready for next trigger`);
          }
        }
      })();
      
      // CRITICAL: Await the promise so addToBatchQueue doesn't continue
      // This prevents multiple concurrent auto-mute triggers
      await autoMutePromise;
    }
  }

  async function addToMuteQueue(tweetElement, username, keyword) {
    // SAFETY CHECK: Don't add accounts you follow
    if (isFollowedAccount(tweetElement)) {
      return;
    }

    // Silently add to batch queue with keyword as reason
    await addToBatchQueue(username, keyword);
  }


  // ============================================
  // BATCH MUTING FOR FAILED ATTEMPTS
  // ============================================


  // Old functions removed - using simple batchMuteQueue Map now


  // Idle detection and popups removed - purely manual now

  async function batchMuteViaProfiles() {
    if (batchMuteQueue.length === 0) {
      console.log('✅ No accounts in batch queue');
      return;
    }
    
    console.log(`\n📋 Accounts to Mute Manually (${batchMuteQueue.length}):`);
    console.log('═'.repeat(70));
    
    const now = Date.now();
    batchMuteQueue.forEach((item, index) => {
      const minutesAgo = Math.floor((now - item.addedAt) / 60000);
      const timeStr = minutesAgo < 1 ? 'just now' : `${minutesAgo}m ago`;
      
      console.log(`  ${index + 1}. @${item.username} → https://x.com/${item.username}`);
      console.log(`     Reason: ${item.reason} | Added: ${timeStr}`);
    });
    
    console.log('═'.repeat(70));
    console.log(`\n💡 How to mute these accounts:`);
    console.log(`   Option 1: Run XCP.autoMute() for automatic batch muting`);
    console.log(`   Option 2: Visit each profile link above and click More → Mute`);
    console.log(`   Option 3: Go to X Settings → Privacy → Muted accounts`);
    console.log(`\n💡 After muting, clear them from queue:`);
    console.log(`   XCP.clearQueue('1-10')  // Clear first 10`);
    console.log(`   XCP.clearQueue('all')    // Clear all\n`);
    
    // Show notification
    showNotification(
      `${batchMuteQueue.length} accounts to mute`,
      'Run XCP.autoMute() or check console',
      'info'
    );
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

    // Check MUTE keywords (silent addition to batch queue)
    if (username) {
      for (const keyword of muteKeywords) {
        if (tweetText.includes(keyword)) {
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

  function isFollowedAccount(tweetElement) {
    try {
      // Method 1: Check for "Following" badge/button
      // X shows a "Following" button for accounts you follow
      const followingButton = tweetElement.querySelector('[data-testid*="following"]');
      if (followingButton) {
        return true;
      }

      // Method 2: Check if we're on the Following timeline
      // If viewing "Following" feed, all tweets are from followed accounts
      const isFollowingTimeline = window.location.pathname === '/home' && 
        (window.location.search.includes('f=following') || 
         document.querySelector('[role="tab"][aria-selected="true"][href*="following"]'));
      
      if (isFollowingTimeline) {
        return true;
      }

      // Method 3: Look for profile unfollow indicator in user cell
      // When you follow someone, their profile area has different structure
      const userCell = tweetElement.querySelector('[data-testid="User-Name"]');
      if (userCell) {
        // Check if parent contains following indicator
        const followButton = userCell.closest('article')?.querySelector('button[aria-label*="Following"]');
        if (followButton) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking follow status:', error);
      // If error checking, be safe and assume following
      return false;
    }
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

  // Hide media-only tweets (image/video with no text) and mute the account
  async function hideMediaOnlyTweets() {
    if (!settings.hideMediaOnlyTweets) return;

    const articles = document.querySelectorAll('article');
    
    for (const article of articles) {
      if (article.hasAttribute('data-xcp-mediaonly-processed')) continue;

      // Check if tweet has media
      const hasPhoto = article.querySelector('[data-testid="tweetPhoto"]');
      const hasVideo = article.querySelector('video');
      const hasGif = article.querySelector('[data-testid="tweetGif"]');
      const hasMedia = hasPhoto || hasVideo || hasGif;

      if (!hasMedia) {
        article.setAttribute('data-xcp-mediaonly-processed', 'true');
        continue;
      }

      // Extract real text (not username, dates, UI elements, or quoted tweets)
      // Only check the MAIN tweet's text, not quoted tweets
      const tweetTextElement = article.querySelector('[data-testid="tweetText"]');
      
      let text = '';
      if (tweetTextElement) {
        // Check if this tweetText is part of a quoted tweet
        const isInQuotedTweet = tweetTextElement.closest('[role="link"]')?.querySelector('[data-testid="tweetText"]') === tweetTextElement;
        
        // Only process if it's the main tweet's text (not from quoted tweet)
        if (!isInQuotedTweet) {
          text = tweetTextElement.textContent || '';
          
          // Remove UI noise (but keep hashtags, URLs, emojis)
          text = text.replace(/@\w+/g, ''); // Remove mentions
          text = text.replace(/Show more/gi, '');
          text = text.replace(/Show less/gi, '');
          text = text.replace(/Translate post/gi, '');
          text = text.replace(/Show this thread/gi, '');
          text = text.replace(/\d{1,2}:\d{2}\s*(AM|PM)?/gi, '');
          text = text.replace(/\d{1,2}h/g, '');
          text = text.replace(/\d{1,2}m/g, '');
          text = text.replace(/\d{1,2}s/g, '');
          text = text.trim();
        }
      }
      
      // If has media and text length is 0, it's media-only spam
      if (text.length === 0) {
        const username = extractUsername(article);
        
        if (username) {
          // SAFETY CHECK: Don't add accounts you follow
          if (!isFollowedAccount(article)) {
            // Silently add to batch queue
            await addToBatchQueue(username, 'media-only');
          }
          
          // Mark as processed
          article.setAttribute('data-xcp-mediaonly-processed', 'true');
        } else {
          article.setAttribute('data-xcp-mediaonly-processed', 'true');
        }
      } else {
        article.setAttribute('data-xcp-mediaonly-processed', 'true');
      }
    }
  }

  // Mute tweets containing emojis
  async function muteEmojiTweets() {
    if (!settings.muteEmojis) return;

    const articles = document.querySelectorAll('article');
    
    for (const article of articles) {
      if (article.hasAttribute('data-xcp-emoji-processed')) continue;

      // Get the main tweet text (not quoted tweets, not UI elements)
      const tweetTextElement = article.querySelector('[data-testid="tweetText"]');
      
      if (!tweetTextElement) {
        article.setAttribute('data-xcp-emoji-processed', 'true');
        continue;
      }

      const text = tweetTextElement.textContent || '';
      
      // Emoji regex - detects all Unicode emoji characters
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F910}-\u{1F96B}\u{1F980}-\u{1F9E0}]/u;
      
      if (emojiRegex.test(text)) {
        const username = extractUsername(article);
        
        if (username) {
          // SAFETY CHECK: Don't add accounts you follow
          if (!isFollowedAccount(article)) {
            // Silently add to batch queue
            await addToBatchQueue(username, 'emoji-tweet');
          }
        }
      }
      
      article.setAttribute('data-xcp-emoji-processed', 'true');
    }
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
    hideMediaOnlyTweets();
    muteEmojiTweets();
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
    
    analyzeAccount: function(username) {
      console.log(`\n🔍 Analyzing @${username}'s vocabulary patterns...\n`);
      
      // Find all tweets from this account on the current page
      const allArticles = document.querySelectorAll('article');
      const userTweets = [];
      
      allArticles.forEach(article => {
        const accountUsername = extractUsername(article);
        if (accountUsername && accountUsername.toLowerCase() === username.toLowerCase()) {
          const tweetText = article.textContent || '';
          userTweets.push(tweetText);
        }
      });
      
      if (userTweets.length === 0) {
        console.log(`❌ No tweets found from @${username} on current page`);
        console.log(`💡 Try scrolling to load more tweets, or visit their profile`);
        return;
      }
      
      console.log(`✅ Found ${userTweets.length} tweet${userTweets.length > 1 ? 's' : ''} from @${username}\n`);
      
      // Stop words to filter out (common words with little meaning)
      const stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
        'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her',
        'its', 'our', 'their', 'me', 'him', 'them', 'us', 'am', 'so', 'just',
        'now', 'out', 'up', 'if', 'about', 'who', 'get', 'which', 'go', 'when',
        'make', 'like', 'time', 'no', 'than', 'see', 'way', 'then', 'more', 'all'
      ]);
      
      // Usernames to filter - start with username itself
      const usernameVariants = new Set([
        username.toLowerCase(),
        username.toLowerCase().replace(/[^a-z0-9]/g, ''), // Remove special chars
        username.toLowerCase().replace(/[^a-z]/g, '') // Remove numbers too
      ]);
      
      // Extract display name from profile (the name shown at top of profile)
      // Look for the display name in the page
      const displayNameElement = document.querySelector('[data-testid="UserName"]') || 
                                  document.querySelector('[data-testid="UserDescription"]')?.previousElementSibling;
      
      if (displayNameElement) {
        const displayName = displayNameElement.textContent || '';
        console.log(`🔍 Display name found: "${displayName}"`);
        
        // Extract words from display name (e.g., "Justin Skycak" → ["justin", "skycak"])
        const displayNameWords = displayName.toLowerCase().match(/[a-z]{3,}/g) || [];
        displayNameWords.forEach(word => {
          usernameVariants.add(word);
        });
      }
      
      // Debug: Show what we're filtering
      console.log(`🔍 Username: @${username}`);
      console.log(`🔍 Filtering words:`, Array.from(usernameVariants).sort());
      
      // Data structures
      const wordFrequency = {};
      const coOccurrence = {};
      const bigrams = {};
      const trigrams = {};
      const tweetsContainingWord = {};
      
      // Helper: Check if word looks like a username or ID
      function isUsernameOrId(word) {
        // Skip if it's the actual username or any part of it
        if (usernameVariants.has(word)) return true;
        
        // Skip pure numbers (likely IDs or dates)
        if (/^\d+$/.test(word)) return true;
        
        // Skip common date/time abbreviations (jan, feb, mon, tue, etc.)
        const dateWords = new Set(['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
                                   'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
                                   'am', 'pm', 'est', 'pst', 'utc', 'gmt']);
        if (dateWords.has(word)) return true;
        
        // Skip if mostly numbers (like "user123", "bot2024")
        const digitCount = (word.match(/\d/g) || []).length;
        if (digitCount / word.length > 0.5) return true;
        
        // Skip if looks like hex ID (8+ chars with mix of letters and numbers)
        if (word.length >= 8 && /^[a-f0-9]+$/.test(word)) return true;
        
        return false;
      }
      
      // Process each tweet
      userTweets.forEach(tweet => {
        const lowerTweet = tweet.toLowerCase();
        
        // Tokenize: extract words (alphanumeric only, 2+ chars)
        const words = lowerTweet.match(/\b[a-z0-9]{2,}\b/g) || [];
        
        // Filter out stop words, usernames, and IDs
        const meaningfulWords = words.filter(word => 
          !stopWords.has(word) && 
          !isUsernameOrId(word)
        );
        
        // 1. WORD FREQUENCY
        meaningfulWords.forEach(word => {
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
          
          // Track which tweets contain this word
          if (!tweetsContainingWord[word]) {
            tweetsContainingWord[word] = new Set();
          }
          tweetsContainingWord[word].add(tweet);
        });
        
        // 2. CO-OCCURRENCE (word pairs appearing in same tweet)
        const uniqueWords = [...new Set(meaningfulWords)];
        for (let i = 0; i < uniqueWords.length; i++) {
          for (let j = i + 1; j < uniqueWords.length; j++) {
            const pair = [uniqueWords[i], uniqueWords[j]].sort().join(' + ');
            coOccurrence[pair] = (coOccurrence[pair] || 0) + 1;
          }
        }
        
        // 3. BIGRAMS (consecutive 2-word phrases)
        for (let i = 0; i < meaningfulWords.length - 1; i++) {
          const bigram = meaningfulWords[i] + ' ' + meaningfulWords[i + 1];
          bigrams[bigram] = (bigrams[bigram] || 0) + 1;
        }
        
        // 4. TRIGRAMS (consecutive 3-word phrases)
        for (let i = 0; i < meaningfulWords.length - 2; i++) {
          const trigram = meaningfulWords[i] + ' ' + meaningfulWords[i + 1] + ' ' + meaningfulWords[i + 2];
          trigrams[trigram] = (trigrams[trigram] || 0) + 1;
        }
      });
      
      // Sort and get top results
      const topWords = Object.entries(wordFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);
      
      const topCoOccurrences = Object.entries(coOccurrence)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      const topBigrams = Object.entries(bigrams)
        .filter(([phrase, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      const topTrigrams = Object.entries(trigrams)
        .filter(([phrase, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
      
      // Calculate spam indicators
      const totalWords = Object.values(wordFrequency).reduce((a, b) => a + b, 0);
      const uniqueWords = Object.keys(wordFrequency).length;
      const vocabularyDiversity = uniqueWords / totalWords;
      
      // Low diversity = repetitive = likely spam
      const spamScore = Math.min(100, 
        (1 - vocabularyDiversity) * 100 + // Low diversity adds to spam
        (topWords[0] ? (topWords[0][1] / userTweets.length) * 50 : 0) // Heavy single-word use
      );
      
      // Display results
      console.log(`═══════════════════════════════════════════════════════`);
      console.log(`📊 COMPREHENSIVE VOCABULARY ANALYSIS`);
      console.log(`═══════════════════════════════════════════════════════\n`);
      
      // Overall stats
      console.log(`📈 Overall Statistics:`);
      console.log(`   Total words analyzed: ${totalWords}`);
      console.log(`   Unique words: ${uniqueWords}`);
      console.log(`   Vocabulary diversity: ${(vocabularyDiversity * 100).toFixed(1)}%`);
      console.log(`   Spam score: ${spamScore.toFixed(1)}% ${spamScore > 70 ? '🔴 HIGH' : spamScore > 40 ? '🟡 MEDIUM' : '🟢 LOW'}`);
      console.log(``);
      
      // 1. WORD FREQUENCY
      if (topWords.length > 0) {
        console.log(`═══════════════════════════════════════════════════════`);
        console.log(`1️⃣  INDIVIDUAL WORD FREQUENCY`);
        console.log(`═══════════════════════════════════════════════════════\n`);
        
        topWords.forEach(([word, count], index) => {
          const percentage = ((tweetsContainingWord[word].size / userTweets.length) * 100).toFixed(0);
          const intensity = percentage > 70 ? '🔴' : percentage > 50 ? '🟡' : '🟢';
          console.log(`   ${index + 1}. "${word}" - ${count} times (${percentage}% of tweets) ${intensity}`);
        });
        console.log(``);
      }
      
      // 2. CO-OCCURRENCE
      if (topCoOccurrences.length > 0) {
        console.log(`═══════════════════════════════════════════════════════`);
        console.log(`2️⃣  CO-OCCURRING WORD PAIRS`);
        console.log(`═══════════════════════════════════════════════════════`);
        console.log(`   (Words that appear together in same tweet)\n`);
        
        const veryStrong = topCoOccurrences.filter(([_, count]) => (count / userTweets.length) > 0.7);
        const strong = topCoOccurrences.filter(([_, count]) => {
          const ratio = count / userTweets.length;
          return ratio > 0.5 && ratio <= 0.7;
        });
        const moderate = topCoOccurrences.filter(([_, count]) => {
          const ratio = count / userTweets.length;
          return ratio > 0.3 && ratio <= 0.5;
        });
        
        if (veryStrong.length > 0) {
          console.log(`   🔴 VERY STRONG (>70% co-occurrence):`);
          veryStrong.forEach(([pair, count]) => {
            const percentage = ((count / userTweets.length) * 100).toFixed(0);
            console.log(`      • ${pair} - together in ${count} tweets (${percentage}%)`);
          });
          console.log(``);
        }
        
        if (strong.length > 0) {
          console.log(`   🟡 STRONG (50-70% co-occurrence):`);
          strong.forEach(([pair, count]) => {
            const percentage = ((count / userTweets.length) * 100).toFixed(0);
            console.log(`      • ${pair} - together in ${count} tweets (${percentage}%)`);
          });
          console.log(``);
        }
        
        if (moderate.length > 0) {
          console.log(`   🟢 MODERATE (30-50% co-occurrence):`);
          moderate.forEach(([pair, count]) => {
            const percentage = ((count / userTweets.length) * 100).toFixed(0);
            console.log(`      • ${pair} - together in ${count} tweets (${percentage}%)`);
          });
          console.log(``);
        }
      }
      
      // 3. BIGRAMS (2-word phrases)
      if (topBigrams.length > 0) {
        console.log(`═══════════════════════════════════════════════════════`);
        console.log(`3️⃣  COMMON 2-WORD PHRASES (Bigrams)`);
        console.log(`═══════════════════════════════════════════════════════`);
        console.log(`   (Exact consecutive phrases)\n`);
        
        topBigrams.forEach(([phrase, count], index) => {
          const percentage = ((count / userTweets.length) * 100).toFixed(0);
          const intensity = count >= 5 ? '🔴' : count >= 3 ? '🟡' : '🟢';
          console.log(`   ${index + 1}. "${phrase}" - ${count} times (${percentage}% of tweets) ${intensity}`);
        });
        console.log(``);
      }
      
      // 4. TRIGRAMS (3-word phrases)
      if (topTrigrams.length > 0) {
        console.log(`═══════════════════════════════════════════════════════`);
        console.log(`4️⃣  COMMON 3-WORD PHRASES (Trigrams)`);
        console.log(`═══════════════════════════════════════════════════════`);
        console.log(`   (Exact consecutive phrases - template detection)\n`);
        
        topTrigrams.forEach(([phrase, count], index) => {
          const percentage = ((count / userTweets.length) * 100).toFixed(0);
          const intensity = count >= 4 ? '🔴' : count >= 2 ? '🟡' : '🟢';
          console.log(`   ${index + 1}. "${phrase}" - ${count} times (${percentage}% of tweets) ${intensity}`);
        });
        console.log(``);
      }
      
      // 5. SPAM SIGNATURE DETECTION
      console.log(`═══════════════════════════════════════════════════════`);
      console.log(`🎯 SPAM SIGNATURE ANALYSIS`);
      console.log(`═══════════════════════════════════════════════════════\n`);
      
      // Detect patterns
      const hasHighRepetition = topWords[0] && (topWords[0][1] / userTweets.length) > 0.7;
      const hasStrongCoOccurrence = topCoOccurrences[0] && (topCoOccurrences[0][1] / userTweets.length) > 0.6;
      const hasTemplatePattern = topTrigrams[0] && topTrigrams[0][1] >= 3;
      const hasLowDiversity = vocabularyDiversity < 0.3;
      
      if (hasHighRepetition || hasStrongCoOccurrence || hasTemplatePattern || hasLowDiversity) {
        console.log(`   ⚠️  SPAM INDICATORS DETECTED:\n`);
        
        if (hasHighRepetition) {
          const topWord = topWords[0][0];
          const percentage = ((tweetsContainingWord[topWord].size / userTweets.length) * 100).toFixed(0);
          console.log(`   ✓ High repetition: "${topWord}" appears in ${percentage}% of tweets`);
        }
        
        if (hasStrongCoOccurrence) {
          const topPair = topCoOccurrences[0][0];
          const percentage = ((topCoOccurrences[0][1] / userTweets.length) * 100).toFixed(0);
          console.log(`   ✓ Strong word pairing: "${topPair}" appear together in ${percentage}% of tweets`);
        }
        
        if (hasTemplatePattern) {
          const topPhrase = topTrigrams[0][0];
          const count = topTrigrams[0][1];
          console.log(`   ✓ Template detected: "${topPhrase}" repeated ${count} times exactly`);
        }
        
        if (hasLowDiversity) {
          console.log(`   ✓ Low vocabulary diversity: ${(vocabularyDiversity * 100).toFixed(1)}% (repetitive language)`);
        }
        
        console.log(`\n   Spam confidence: ${spamScore.toFixed(0)}% ${spamScore > 70 ? '🔴' : spamScore > 40 ? '🟡' : '🟢'}\n`);
      } else {
        console.log(`   ✅ No strong spam indicators detected`);
        console.log(`   Account shows varied vocabulary and natural language patterns\n`);
      }
      
      // 6. KEYWORD SUGGESTIONS
      console.log(`═══════════════════════════════════════════════════════`);
      console.log(`💡 SUGGESTED KEYWORDS TO MUTE`);
      console.log(`═══════════════════════════════════════════════════════\n`);
      
      // Suggest based on frequency
      const suggestedWords = topWords
        .filter(([word, count]) => (tweetsContainingWord[word].size / userTweets.length) >= 0.5)
        .slice(0, 5);
      
      // Suggest based on phrases
      const suggestedPhrases = topBigrams
        .filter(([phrase, count]) => count >= 3)
        .slice(0, 5);
      
      if (suggestedWords.length > 0) {
        console.log(`   Based on high-frequency words:`);
        suggestedWords.forEach(([word, count]) => {
          const tweetCount = tweetsContainingWord[word].size;
          const percentage = ((tweetCount / userTweets.length) * 100).toFixed(0);
          console.log(`   XControlPanel.addMuteKeyword('${word}')  // ${percentage}% of tweets`);
        });
        console.log(``);
      }
      
      if (suggestedPhrases.length > 0) {
        console.log(`   Based on repeated phrases (STRONGEST signals):`);
        suggestedPhrases.forEach(([phrase, count]) => {
          console.log(`   XControlPanel.addMuteKeyword('${phrase}')  // appears ${count}x`);
        });
        console.log(``);
      }
      
      if (suggestedWords.length > 0 || suggestedPhrases.length > 0) {
        // Bulk add command
        const allSuggestions = [
          ...suggestedWords.map(([word]) => word),
          ...suggestedPhrases.map(([phrase]) => phrase)
        ].slice(0, 5);
        
        console.log(`   📋 Or add top suggestions at once:`);
        console.log(`   [${allSuggestions.map(k => `'${k}'`).join(', ')}].forEach(k => XControlPanel.addMuteKeyword(k))`);
        console.log(``);
      } else {
        console.log(`   No strong keyword suggestions (vocabulary is diverse)`);
        console.log(``);
      }
      
      console.log(`═══════════════════════════════════════════════════════\n`);
    },
    
    // ========== AUTO MUTE ==========
    
    autoMute: async function(range) {
      if (batchMuteQueue.length === 0) {
        console.log('✅ No accounts in queue to mute');
        return;
      }
      
      let accountsToMute = [];
      
      // Parse range
      if (!range || range === 'all') {
        accountsToMute = [...batchMuteQueue];
      } else if (typeof range === 'string' && range.includes('-')) {
        // Range: "1-10"
        const [start, end] = range.split('-').map(n => parseInt(n.trim()));
        if (isNaN(start) || isNaN(end)) {
          console.error('❌ Invalid range. Use: XCP.autoMute("1-10")');
          return;
        }
        accountsToMute = batchMuteQueue.slice(start - 1, end);
      } else if (typeof range === 'number') {
        // Single number
        if (range > 0 && range <= batchMuteQueue.length) {
          accountsToMute = [batchMuteQueue[range - 1]];
        }
      }
      
      if (accountsToMute.length === 0) {
        console.error('❌ No accounts selected');
        return;
      }
      
      // Get delay from settings
      const delay = settings.autoMuteDelay || 2000;
      
      console.log(`🚀 Starting auto-mute for ${accountsToMute.length} accounts (minimized window)...`);
      
      // Calculate estimated time including all delays
      const spaDelay = (settings.spaRenderDelay || 1500) / 1000;
      const accountDelay = delay / 1000;
      const estimatedTime = Math.ceil(accountsToMute.length * (accountDelay + spaDelay + 2.5));
      console.log(`⏳ This will take approximately ${estimatedTime} seconds\n`);
      
      // Send to background script with all timing options
      const response = await chrome.runtime.sendMessage({
        action: 'autoMute',
        accounts: accountsToMute,
        options: { 
          delay,
          pageLoadTimeout: settings.pageLoadTimeout || 10000,
          spaRenderDelay: settings.spaRenderDelay || 1500,
          debugLogging: settings.debugLogging || false
        }
      });
      
      if (response.success) {
        // Remove successfully muted accounts from queue
        const successfulUsernames = response.results
          .filter(r => r.success)
          .map(r => r.username.toLowerCase());
        
        batchMuteQueue = batchMuteQueue.filter(item => 
          !successfulUsernames.includes(item.username.toLowerCase())
        );
        
        await saveBatchQueue();
        
        console.log(`\n📊 Results:`);
        console.log(`   ✅ Successfully muted: ${response.successCount}`);
        console.log(`   ❌ Failed: ${accountsToMute.length - response.successCount}`);
        console.log(`   📋 Remaining in queue: ${batchMuteQueue.length}`);
        
        if (batchMuteQueue.length === 0) {
          console.log(`\n🎉 Queue is now empty!`);
        }
      } else {
        console.error('❌ Auto-mute failed:', response.error);
      }
    },
    
    // Remove any followed accounts from queue
    removeFollowedFromQueue: async function() {
      if (batchMuteQueue.length === 0) {
        console.log('✅ Queue is empty');
        return;
      }
      
      console.log(`🔍 Checking ${batchMuteQueue.length} accounts for followed accounts...`);
      
      const before = batchMuteQueue.length;
      const removed = [];
      
      // Check each account on timeline
      const allTweets = document.querySelectorAll('article');
      const followedUsernames = new Set();
      
      allTweets.forEach(tweet => {
        if (isFollowedAccount(tweet)) {
          const username = extractUsername(tweet);
          if (username) {
            followedUsernames.add(username.toLowerCase());
          }
        }
      });
      
      // Remove followed accounts from queue
      batchMuteQueue = batchMuteQueue.filter(item => {
        const isFollowed = followedUsernames.has(item.username.toLowerCase());
        if (isFollowed) {
          removed.push(item.username);
        }
        return !isFollowed;
      });
      
      await saveBatchQueue();
      
      if (removed.length > 0) {
        console.log(`✅ Removed ${removed.length} followed account(s):`);
        removed.forEach(u => console.log(`   - @${u}`));
        console.log(`\n📊 Remaining: ${batchMuteQueue.length} accounts`);
      } else {
        console.log('✅ No followed accounts found in queue');
      }
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
  
  window.addEventListener('XCP_ANALYZE_ACCOUNT', (e) => {
    window.XControlPanel.analyzeAccount(e.detail.username);
  });
  
  
  window.addEventListener('XCP_LIST_FAILED', async () => {
    if (batchMuteQueue.length === 0) {
      console.log('✅ No accounts in batch queue');
      return;
    }
    
    console.log(`\n📋 Batch Mute Queue (${batchMuteQueue.length} accounts):\n`);
    console.log('═'.repeat(70));
    
    const now = Date.now();
    batchMuteQueue.forEach((item, index) => {
      const minutesAgo = Math.floor((now - item.addedAt) / 60000);
      const timeStr = minutesAgo < 1 ? 'just now' : `${minutesAgo}m ago`;
      
      console.log(`${index + 1}. @${item.username}`);
      console.log(`   Reason: ${item.reason} | Added: ${timeStr}`);
    });
    
    console.log('═'.repeat(70));
    console.log(`\nRun: XCP.exportQueue() for full list with links`);
    console.log(`Run: XCP.autoMute() to mute automatically`);
  });
  
  window.addEventListener('XCP_BATCH_MUTE_NOW', async () => {
    await batchMuteViaProfiles();
  });
  
  window.addEventListener('XCP_AUTO_MUTE', async (event) => {
    const range = event.detail?.range;
    await window.XControlPanel.autoMute(range);
  });
  
  window.addEventListener('XCP_CLEAR_MUTED', async (event) => {
    const range = event.detail?.range;
    
    if (!range) {
      console.error('❌ No range specified');
      return;
    }
    
    if (batchMuteQueue.length === 0) {
      console.log('✅ No accounts in queue');
      return;
    }
    
    const originalCount = batchMuteQueue.length;
    
    // Parse range
    if (range.toLowerCase() === 'all') {
      // Clear all
      batchMuteQueue = [];
      await saveBatchQueue();
      console.log(`✅ Cleared all ${originalCount} account(s)`);
      console.log('🎉 Queue empty!');
      return;
    }
    
    let indicesToRemove = [];
    
    if (range.includes('-')) {
      // Range: "1-15"
      const [start, end] = range.split('-').map(n => parseInt(n.trim()));
      if (isNaN(start) || isNaN(end)) {
        console.error('❌ Invalid range format. Use: "1-15"');
        return;
      }
      for (let i = start - 1; i < end && i < originalCount; i++) {
        if (i >= 0) indicesToRemove.push(i);
      }
    } else if (range.includes(',')) {
      // Multiple: "1,3,5"
      const numbers = range.split(',').map(n => parseInt(n.trim()));
      for (const num of numbers) {
        if (!isNaN(num) && num > 0 && num <= originalCount) {
          indicesToRemove.push(num - 1);
        }
      }
    } else if (!isNaN(parseInt(range))) {
      // Single number: "5"
      const num = parseInt(range);
      if (num > 0 && num <= originalCount) {
        indicesToRemove.push(num - 1);
      }
    } else {
      // Username: "BitcoinMagazine"
      const username = range.replace('@', '').toLowerCase();
      const index = batchMuteQueue.findIndex(item => 
        item.username.toLowerCase() === username
      );
      if (index >= 0) {
        const removed = batchMuteQueue[index];
        batchMuteQueue.splice(index, 1);
        await saveBatchQueue();
        console.log(`✅ Removed @${removed.username}`);
        console.log(`📊 Remaining: ${batchMuteQueue.length} accounts`);
        return;
      } else {
        console.error(`❌ Username not found: ${range}`);
        return;
      }
    }
    
    if (indicesToRemove.length === 0) {
      console.error('❌ No valid accounts to remove');
      return;
    }
    
    // Remove accounts (reverse order to preserve indices)
    const removed = [];
    indicesToRemove.sort((a, b) => b - a);
    for (const index of indicesToRemove) {
      removed.push(batchMuteQueue[index].username);
      batchMuteQueue.splice(index, 1);
    }
    
    await saveBatchQueue();
    
    console.log(`✅ Removed ${removed.length} account(s):`);
    removed.forEach(username => console.log(`   - @${username}`));
    console.log(`\n📊 Remaining: ${batchMuteQueue.length} accounts`);
    
    if (batchMuteQueue.length === 0) {
      console.log('🎉 All accounts cleared!');
    }
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
