# Quick Reference - Control Panel for X v2.2.7

## 🚀 Essential Commands

```javascript
XControlPanel.help()                          // Show all commands
XControlPanel.stats()                         // View statistics
```

---

## 📝 Keyword Management

```javascript
// Add keywords
XControlPanel.addMuteKeyword('crypto')
XControlPanel.addMuteKeyword('link in bio')  // Multi-word

// Remove keywords
XControlPanel.removeMuteKeyword('crypto')
XControlPanel.removeMuteKeywordByIndex(0)

// List keywords
XControlPanel.listMuteKeywords()

// Search
XControlPanel.findKeyword('crypto')

// Clear all
XControlPanel.clearMuteKeywords()
```

---

## 🔍 Spam Analysis (NEW!)

```javascript
// Analyze any account
XControlPanel.analyzeAccount('username')

// Example
XControlPanel.analyzeAccount('CryptoSpammer')
```

**What you get:**
- Spam score (0-100%)
- Category breakdown
- Keyword suggestions
- Ready-to-run commands

---

## 📊 Tracking

```javascript
XControlPanel.listMuted()              // Show muted accounts
XControlPanel.clearMutedTracking()     // Clear tracking
```

---

## ⚡ Bulk Operations

```javascript
// Add multiple keywords
['crypto', 'nft', 'giveaway'].forEach(k => 
  XControlPanel.addMuteKeyword(k)
);
```

---

## 🎯 Common Spam Presets

**Crypto Spam:**
```javascript
['crypto', 'nft', 'airdrop', 'mint', 'whitelist', 'token'].forEach(k => XControlPanel.addMuteKeyword(k));
```

**Engagement Bait:**
```javascript
['follow me', 'rt this', 'like and retweet', 'link in bio'].forEach(k => XControlPanel.addMuteKeyword(k));
```

**Giveaways:**
```javascript
['giveaway', 'contest', 'prize', 'free', 'win'].forEach(k => XControlPanel.addMuteKeyword(k));
```

---

## 🔧 Workflow Example

```javascript
// 1. Analyze suspicious account
XControlPanel.analyzeAccount('SpamBot123')

// 2. Review spam score and suggestions

// 3. Copy suggested commands:
XControlPanel.addMuteKeyword('airdrop')
XControlPanel.addMuteKeyword('giveaway')

// 4. Check what you added
XControlPanel.listMuteKeywords()

// 5. Monitor results
XControlPanel.stats()
XControlPanel.listMuted()
```

---

## ⚠️ Remember

- **Keywords mute permanently** via X's system
- **Enable in popup** before using (gear icon)
- **Scroll profile** to load tweets before analyzing
- **Start small** with 5-10 keywords

---

## 🆘 Troubleshooting

```javascript
// Check if loaded
XControlPanel

// Check settings
XControlPanel.stats()

// Reload extension
// chrome://extensions/ → Click refresh (↻)
```

---

## 📊 Spam Score Guide

- 🟢 **0-40%** = LOW
- 🟡 **40-70%** = MEDIUM  
- 🔴 **70-100%** = HIGH

---

## 💾 Limits

- **1000** keywords max
- **1 mute/second** (rate limit)
- **Unlimited** tracking

---

**Version:** 2.2.7  
**Updated:** November 26, 2025
