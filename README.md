# Control Panel for X (Twitter)

**Version 2.2.7** - Chrome Extension for advanced X/Twitter filtering

Clean up your X timeline by automatically muting spammy accounts based on keywords, hiding verified checkmarks, ads, and parody accounts.

---

## 🎯 Features

### 1. **Keyword-Based Auto-Muting** ⭐
- Automatically mutes accounts when their tweets contain specific keywords
- Permanent muting via X's native system
- Multi-word phrase support (e.g., "crypto giveaway", "link in bio")
- Console-based management (up to 1000 keywords)
- Queue system prevents rate limiting (1 mute per second)

### 2. **Spam Analysis Tool** 🆕 v2.2.7
- Analyze any account's tweets for spam patterns
- Get spam score (0-100%) with category breakdown
- Automatic keyword suggestions based on analysis
- 6 spam categories: Giveaways, Crypto/NFT, Engagement Bait, CTAs, Urgency, Money schemes

### 3. **Hide Verified Checkmarks** (ON by default)
- Hides tweets from verified accounts you don't follow
- Keeps tweets from accounts you follow visible

### 4. **Hide Ads** (Optional)
- Removes promoted tweets from your timeline

### 5. **Parody Account Detection** (Optional)
- Automatically detects and hides parody/satire accounts

---

## 🚀 Quick Start

### Installation

1. Download the extension ZIP file
2. Extract to a folder
3. Open Chrome: `chrome://extensions/`
4. Enable "Developer mode" (top-right)
5. Click "Load unpacked"
6. Select the extracted folder
7. Go to x.com and press F12 (console)

### First Commands

```javascript
// See available commands
XControlPanel.help()

// Add spam keywords
XControlPanel.addMuteKeyword('crypto')
XControlPanel.addMuteKeyword('crypto giveaway')

// Analyze a spammy account
XControlPanel.analyzeAccount('username')

// View your keywords
XControlPanel.listMuteKeywords()

// Check stats
XControlPanel.stats()
```

---

## 📖 Console Commands Reference

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
