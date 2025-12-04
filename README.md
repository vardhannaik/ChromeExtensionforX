# Control Panel for X (Twitter)

**Version 9.0.0** - Chrome Extension for advanced X/Twitter filtering

Clean up your X timeline with **automated account muting**, keyword detection, and advanced filtering. Set it and forget it!

---

## 🎯 Features

### 1. **Auto-Mute System** ⭐ NEW in v9.0
- **Automatic triggering** when queue reaches threshold (e.g., 10 accounts)
- **Silent keyword detection** - no interruptions
- **Minimized/hidden window processing** - runs in background
- **MutationObserver technology** - ~95% success rate
- **FIFO queue** with timestamps
- **Configurable delays** (1-5 seconds between accounts)
- **Triple-layer follow protection** - never mutes accounts you follow

**Set it once, never think about it again!**

### 2. **Keyword-Based Detection**
- Silently detects accounts when tweets contain keywords
- Adds to queue automatically
- Multi-word phrase support (e.g., "crypto giveaway", "link in bio")
- Console-based management (up to 1000 keywords)
- No manual intervention required

### 3. **Spam Analysis Tool**
- Analyze any account's tweets for spam patterns
- Get spam score (0-100%) with category breakdown
- Automatic keyword suggestions based on analysis
- 6 spam categories: Giveaways, Crypto/NFT, Engagement Bait, CTAs, Urgency, Money schemes

### 4. **Hide Verified Checkmarks** (ON by default)
- Hides tweets from verified accounts you don't follow
- Keeps tweets from accounts you follow visible

### 5. **Hide Ads** (Optional)
- Removes promoted tweets from your timeline

### 6. **Parody Account Detection** (Optional)
- Automatically detects and hides parody/satire accounts

### 7. **Media-Only Spam Detection** (Optional)
- Detects accounts posting only images/videos with no text
- Automatically adds to mute queue

---

## 🚀 Quick Start

### Installation

1. Download the extension ZIP file
2. Extract to a folder
3. Open Chrome: `chrome://extensions/`
4. Enable "Developer mode" (top-right)
5. Click "Load unpacked"
6. Select the extracted folder

### Setup Auto-Mute (Recommended)

1. Click the extension icon (puzzle piece in toolbar)
2. Toggle **"Enable keyword muting"** ON
3. Toggle **"Enable automatic muting"** ON
4. Set **threshold**: `10 accounts` (or your preference)
5. Set **delay**: `2 seconds` (recommended)
6. Click **"Save Settings"**
7. Go to x.com and press F12 (console)

### Add Keywords

```javascript
// See available commands
XControlPanel.help()

// Add spam keywords (shorthand: XCP)
XCP.addKeyword('crypto')
XCP.addKeyword('giveaway')
XCP.addKeyword('link in bio')

// View queue
XCP.showQueue()

// That's it! Extension will auto-mute when 10 accounts detected
```

### Manual Trigger (Optional)

```javascript
// Manually trigger mute anytime
XCP.autoMute()

// View detailed list with reasons
XCP.exportQueue()

// Clear queue
XCP.clearQueue('all')
```

---

## 📖 Console Commands Reference

### Auto-Mute Commands (NEW)

```javascript
// View queue
XCP.showQueue()              // Quick view
XCP.exportQueue()            // Detailed with links

// Trigger mute
XCP.autoMute()               // Mute all
XCP.autoMute('1-10')         // Mute first 10
XCP.autoMute(5)              // Mute account #5

// Clear queue
XCP.clearQueue('all')        // Clear all
XCP.clearQueue('1-10')       // Clear range
XCP.clearQueue('username')   // Clear specific

// Safety
XCP.removeFollowedFromQueue() // Remove followed accounts
```

### Keyword Management

```javascript
// Add keywords (single or multi-word)
XControlPanel.addMuteKeyword('crypto')
XControlPanel.addMuteKeyword('link in bio')

// Remove keywords
XControlPanel.removeMuteKeyword('crypto')
XControlPanel.removeMuteKeywordByIndex(0)

// List all keywords
XControlPanel.listMuteKeywords()

// Search keywords
XControlPanel.findKeyword('crypto')

// Clear all keywords
XControlPanel.clearMuteKeywords()
```

### Spam Analysis 🆕

```javascript
// Analyze an account's tweets for spam
XControlPanel.analyzeAccount('username')
```

**Example Output:**
```
📊 Spam Analysis Results:
   Spam Score: 85.0% 🔴 HIGH
   Total spam indicators: 17
   Tweets analyzed: 8

🏷️ Spam Categories Detected:
   Crypto/NFT (10 matches):
      • "airdrop" - 4x (50% of tweets)
      • "nft" - 3x (38% of tweets)

💡 Suggested keywords to mute:
   XControlPanel.addMuteKeyword('airdrop')
   XControlPanel.addMuteKeyword('nft')
```

### Statistics & Tracking

```javascript
// View stats
XControlPanel.stats()

// List muted accounts
XControlPanel.listMuted()

// Clear tracking (accounts stay muted in X)
XControlPanel.clearMutedTracking()
```

---

## 🎮 Usage Examples

### Block Crypto Spam

```javascript
['crypto', 'nft', 'airdrop', 'mint', 'whitelist'].forEach(k => 
  XControlPanel.addMuteKeyword(k)
);
```

### Analyze Before Blocking

```javascript
// Step 1: Analyze account
XControlPanel.analyzeAccount('SpammyUser123')

// Step 2: Copy suggested commands from output
XControlPanel.addMuteKeyword('giveaway')
```

---

## ⚠️ Important Warnings

### Keyword Muting is Permanent

- ✅ Mute persists across all devices
- ✅ Account stays muted even if extension disabled
- ❌ Must manually unmute via X Settings → "Muted accounts"

### Analysis Limitations

- Only sees tweets visible on current page
- Works best with 5-20 tweets loaded
- Scroll down on profile to load more before analyzing

---

## 🔍 Spam Categories

1. **Giveaways**: giveaway, free, win, prize, contest
2. **Crypto/NFT**: crypto, nft, airdrop, mint, whitelist, token, coin
3. **Engagement Bait**: follow me, rt this, like and retweet
4. **Call-to-Action**: link in bio, click here, dm me
5. **Urgency**: urgent, hurry, limited time, act now
6. **Money**: make money, earn cash, passive income

---

## 📊 Spam Score

- 🟢 **0-40%**: LOW - Few spam indicators
- 🟡 **40-70%**: MEDIUM - Multiple spam patterns
- 🔴 **70-100%**: HIGH - Heavy spam activity

---

## 🔧 Troubleshooting

**XControlPanel Not Defined:**
1. Go to `chrome://extensions/`
2. Click refresh icon (↻) on extension
3. Go to X.com, press Ctrl+Shift+R
4. Should see: "🎮 X Control Panel Loaded!"

**Keywords Not Working:**
1. Check setting: `XControlPanel.stats()`
2. Enable in extension popup if needed
3. Reload page

---

## 🆕 Changelog

### v2.2.7 (Latest)
- ✨ NEW: Account spam analysis tool
- ✨ NEW: Spam score calculation
- ✨ NEW: Automatic keyword suggestions
- 📖 Updated documentation

### v2.2.6
- 🔧 Removed duplicate methods
- 🎨 Cleaner API

### v2.2.5
- 🎉 FIXED: Console access via dual-script architecture
- ✅ Chrome APIs working properly

---

## 💡 Pro Tips

1. **Start small**: Add 5-10 keywords, test, expand
2. **Use analysis**: Let the tool suggest keywords
3. **Be specific**: "crypto giveaway" > "crypto"
4. **Check stats**: Monitor muted accounts regularly

---

## 📄 License

MIT License

---

**Happy filtering!** 🎉

For help: `XControlPanel.help()`

---

## 📚 Additional Documentation

- **[AUTO_MUTE_GUIDE.md](AUTO_MUTE_GUIDE.md)** - Complete auto-mute system guide (v9.0+)
- **[KEYWORDS_GUIDE.md](KEYWORDS_GUIDE.md)** - Keyword management guide
- **[PARODY_DETECTION_GUIDE.md](PARODY_DETECTION_GUIDE.md)** - Parody detection guide
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Command reference

