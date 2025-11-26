// Control Panel for X - Main World Script
// Runs in page context for console access

console.log('🎮 X Control Panel: Initializing console interface...');

// Create console API that communicates with isolated world via CustomEvent
window.XControlPanel = {
  addMuteKeyword: function(keyword) {
    window.dispatchEvent(new CustomEvent('XCP_ADD_KEYWORD', { detail: { keyword } }));
    console.log(`⏳ Adding keyword: "${keyword}"...`);
  },
  
  removeMuteKeyword: function(keyword) {
    window.dispatchEvent(new CustomEvent('XCP_REMOVE_KEYWORD', { detail: { keyword } }));
    console.log(`⏳ Removing keyword: "${keyword}"...`);
  },
  
  removeMuteKeywordByIndex: function(index) {
    window.dispatchEvent(new CustomEvent('XCP_REMOVE_INDEX', { detail: { index } }));
    console.log(`⏳ Removing keyword at index ${index}...`);
  },
  
  listMuteKeywords: function() {
    window.dispatchEvent(new CustomEvent('XCP_LIST_KEYWORDS'));
    console.log('⏳ Loading keywords...');
  },
  
  findKeyword: function(term) {
    window.dispatchEvent(new CustomEvent('XCP_FIND_KEYWORD', { detail: { term } }));
    console.log(`⏳ Searching for: "${term}"...`);
  },
  
  clearMuteKeywords: function() {
    if (confirm('Clear all mute keywords?')) {
      window.dispatchEvent(new CustomEvent('XCP_CLEAR_KEYWORDS'));
      console.log('⏳ Clearing keywords...');
    }
  },
  
  stats: function() {
    window.dispatchEvent(new CustomEvent('XCP_STATS'));
    console.log('⏳ Loading stats...');
  },
  
  analyzeAccount: function(username) {
    if (!username) {
      console.error('❌ Usage: XControlPanel.analyzeAccount("username")');
      return;
    }
    window.dispatchEvent(new CustomEvent('XCP_ANALYZE_ACCOUNT', { detail: { username } }));
    console.log(`⏳ Analyzing @${username}'s tweets for spam patterns...`);
  },
  
  listMuted: function() {
    window.dispatchEvent(new CustomEvent('XCP_LIST_MUTED'));
    console.log('⏳ Loading muted accounts...');
  },
  
  clearMutedTracking: function() {
    if (confirm('Clear muted accounts tracking? (Accounts stay muted in X)')) {
      window.dispatchEvent(new CustomEvent('XCP_CLEAR_TRACKING'));
      console.log('⏳ Clearing tracking...');
    }
  },
  
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

  XControlPanel.removeMuteKeyword('crypto giveaway')
  XControlPanel.removeMuteKeywordByIndex(0)

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
  XControlPanel.analyzeAccount('username')
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
• Use removeMuteKeyword() to remove from list
• Enable "keyword muting" in extension popup first!
    `);
  }
};

console.log('✅ XControlPanel ready! Type: XControlPanel.help()');
