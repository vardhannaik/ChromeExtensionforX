// Content script that runs on X/Twitter pages
(async function() {
  'use strict';

  // Get settings from storage
  const result = await chrome.storage.sync.get('settings');
  const settings = result.settings || { hideCheckmarks: true, hideAds: false };

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
  }

  // Hide tweets from verified accounts (except those you follow)
  function hideVerifiedTweets() {
    if (!settings.hideCheckmarks) return;
    
    // Check if we're on the "Following" timeline
    const isFollowingTimeline = window.location.pathname === '/home' && 
                                (window.location.search.includes('f=following') || 
                                 document.querySelector('[role="tab"][aria-selected="true"][href*="following"]'));
    
    // If on Following timeline, don't hide any tweets (they're all from people you follow)
    if (isFollowingTimeline) {
      return;
    }
    
    // Find all tweets/articles
    const articles = document.querySelectorAll('article');
    articles.forEach(article => {
      // Check if article contains a verified badge
      const hasVerifiedBadge = article.querySelector('[data-testid="icon-verified"]');
      if (hasVerifiedBadge && !article.hasAttribute('data-xcp-processed')) {
        article.style.display = 'none';
        article.setAttribute('data-xcp-processed', 'true');
      }
    });

    // Also check cellInnerDiv containers
    const cells = document.querySelectorAll('[data-testid="cellInnerDiv"]');
    cells.forEach(cell => {
      const hasVerifiedBadge = cell.querySelector('[data-testid="icon-verified"]');
      if (hasVerifiedBadge && !cell.hasAttribute('data-xcp-processed')) {
        cell.style.display = 'none';
        cell.setAttribute('data-xcp-processed', 'true');
      }
    });
  }

  // Hide promoted/ad content with improved detection
  function hidePromotedContent() {
    if (!settings.hideAds) return;

    // Method 1: Find by "Promoted" text
    const allCells = document.querySelectorAll('[data-testid="cellInnerDiv"]');
    allCells.forEach(cell => {
      const cellText = cell.textContent || '';
      
      // Check for "Promoted" or "Ad" markers
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
      // Look for the promoted label which typically appears near the top
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

    // Method 4: Look for promoted timeline items
    const timelineItems = document.querySelectorAll('[data-testid="tweet"]');
    timelineItems.forEach(item => {
      if (item.textContent?.includes('Promoted') && !item.hasAttribute('data-xcp-ad-processed')) {
        const cell = item.closest('[data-testid="cellInnerDiv"]') || item;
        cell.style.display = 'none';
        item.setAttribute('data-xcp-ad-processed', 'true');
      }
    });
  }

  // Observer to handle dynamic content
  const observer = new MutationObserver((mutations) => {
    applySettings();
    hideVerifiedTweets();
    hidePromotedContent();
  });

  // Initialize
  function init() {
    applySettings();
    
    // Start observing the document
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Run initial cleanup
    hideVerifiedTweets();
    hidePromotedContent();
    
    // Also run periodically for content loaded after initial scan
    setInterval(() => {
      hideVerifiedTweets();
      hidePromotedContent();
    }, 1000);
  }

  // Wait for body to be available
  if (document.body) {
    init();
  } else {
    const bodyObserver = new MutationObserver(() => {
      if (document.body) {
        bodyObserver.disconnect();
        init();
      }
    });
    bodyObserver.observe(document.documentElement, { childList: true });
  }

  // Listen for setting changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.settings) {
      window.location.reload();
    }
  });

})();
