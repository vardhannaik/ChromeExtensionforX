# Keyword Controls Guide - Control Panel for X

## 🎯 Overview

Control your X timeline with powerful keyword filtering. Two types of keywords let you choose how aggressively to filter content:

1. **MUTE Keywords** - Permanently mutes accounts via X's native system
2. **DROP Keywords** - Temporarily hides tweets containing these words

---

## 🔧 Setup

### Step 1: Enable Keyword Features

1. Click the extension icon
2. Toggle **ON**:
   - ✅ Enable keyword muting (for MUTE keywords)
   - ✅ Enable keyword dropping (for DROP keywords)
3. Click "Save Settings"
4. Page will reload

### Step 2: Add Keywords via Console

1. Go to X.com (Twitter)
2. Press **F12** (or right-click → Inspect)
3. Click **Console** tab
4. Type commands to add keywords

---

## 📝 Console Commands

### Basic Commands

```javascript
// Add mute keyword (permanently mutes accounts)
XControlPanel.addMuteKeyword('crypto')

// Add drop keyword (hides tweets only)
XControlPanel.addDropKeyword('spoiler')

// View help
XControlPanel.help()

// View statistics
XControlPanel.stats()
```

---

## 🔇 MUTE Keywords

**What they do:** Permanently mute accounts via X's native system when their tweets contain these keywords.

### Add Mute Keywords

```javascript
// Single word
XControlPanel.addMuteKeyword('crypto')

// Two words
XControlPanel.addMuteKeyword('crypto giveaway')

// Three words
XControlPanel.addMuteKeyword('link in bio')

// Four+ words
XControlPanel.addMuteKeyword('follow me for more')
```

### Remove Mute Keywords

```javascript
// Remove by exact text
XControlPanel.removeMuteKeyword('crypto giveaway')

// Remove by index
XControlPanel.listMuteKeywords()  // See list with numbers
XControlPanel.removeMuteKeywordByIndex(5)  // Remove #5
```

### List Mute Keywords

```javascript
XControlPanel.listMuteKeywords()
```

**Output:**
```
📋 MUTE Keywords (5/1000):

  0. "crypto" [1 word]
  1. "nft" [1 word]
  2. "crypto giveaway" [2 words]
  3. "link in bio" [3 words]
  4. "follow me for more" [4 words]
```

### Clear All Mute Keywords

```javascript
XControlPanel.clearMuteKeywords()
```

---

## 🗑️ DROP Keywords

**What they do:** Hide tweets containing these keywords (account remains visible).

### Add Drop Keywords

```javascript
// Single word
XControlPanel.addDropKeyword('spoiler')

// Multiple words
XControlPanel.addDropKeyword('spoiler alert')
XControlPanel.addDropKeyword('major spoilers ahead')
```

### Remove Drop Keywords

```javascript
// Remove by exact text
XControlPanel.removeDropKeyword('spoiler alert')

// Remove by index
XControlPanel.removeDropKeywordByIndex(0)
```

### List Drop Keywords

```javascript
XControlPanel.listDropKeywords()
```

### Clear All Drop Keywords

```javascript
XControlPanel.clearDropKeywords()
```

---

## 🔍 Search & Management

### View All Keywords

```javascript
XControlPanel.listAllKeywords()
```

### Find Specific Keywords

```javascript
XControlPanel.findKeyword('crypto')
```

**Output:**
```
🔍 Searching for: "crypto"

MUTE Keywords containing "crypto":
  - "crypto"
  - "crypto giveaway"
  - "cryptocurrency"
```

---

## 📊 Statistics & Tracking

### View Stats

```javascript
XControlPanel.stats()
```

**Output:**
```
📊 X Control Panel Stats:
   MUTE Keywords: 10/1000 (permanent account mute)
   DROP Keywords: 5/1000 (hide tweet only)
   Muted accounts: 47
   Settings: {keywordMutingEnabled: true, ...}
```

### List Muted Accounts

```javascript
XControlPanel.listMuted()
```

**Output:**
```
📋 Muted accounts: 47

┌─────┬──────────────┬───────────────┬─────────────────┐
│ (i) │   username   │    mutedAt    │     reason      │
├─────┼──────────────┼───────────────┼─────────────────┤
│  0  │  'user1'     │ 1234567890123 │ 'keyword:crypto'│
│  1  │  'user2'     │ 1234567891234 │ 'keyword:nft'   │
└─────┴──────────────┴───────────────┴─────────────────┘
```

### Clear Tracking

```javascript
XControlPanel.clearMutedTracking()
```

**Note:** This only clears the extension's tracking. Accounts remain muted in X's system.

---

## ⚡ Bulk Operations

### Add Multiple Keywords at Once

```javascript
// Mute keywords
['crypto', 'nft', 'giveaway', 'airdrop'].forEach(k => 
  XControlPanel.addMuteKeyword(k)
);

// Drop keywords
['spoiler', 'politics', 'sports'].forEach(k => 
  XControlPanel.addDropKeyword(k)
);
```

### Import from Array

```javascript
const myMuteKeywords = [
  'crypto', 'nft', 'giveaway',
  'crypto giveaway', 'link in bio',
  'follow me', 'rt this'
];

myMuteKeywords.forEach(k => XControlPanel.addMuteKeyword(k));
```

---

## 📚 Preset Keyword Lists

### Crypto/NFT Related

```javascript
[
  // Single words
  'crypto', 'nft', 'bitcoin', 'ethereum',
  'airdrop', 'whitelist', 'mint',
  
  // Phrases
  'crypto giveaway', 'nft drop', 'free airdrop'
].forEach(k => XControlPanel.addMuteKeyword(k));
```

### Engagement Bait

```javascript
[
  'giveaway', 'contest', 'prize',
  'follow me', 'rt this', 'like and retweet',
  'link in bio', 'check it out', 'dm me now'
].forEach(k => XControlPanel.addMuteKeyword(k));
```

### Spoilers (Drop)

```javascript
[
  'spoiler', 'spoilers',
  'spoiler alert', 'major spoiler',
  'spoilers ahead'
].forEach(k => XControlPanel.addDropKeyword(k));
```

### Politics (Drop - Optional)

```javascript
[
  'politics', 'election', 'vote',
  'democrat', 'republican'
].forEach(k => XControlPanel.addDropKeyword(k));
```

---

## 🎯 How Keyword Matching Works

### Phrase Matching Rules

**Keywords are matched as substrings:**

```javascript
XControlPanel.addMuteKeyword('crypto giveaway')

// Will match:
"Join our crypto giveaway now!" ✅
"Exclusive crypto giveaway for followers" ✅

// Won't match:
"giveaway crypto" ❌ (different order)
"crypto" ❌ (incomplete phrase)
```

### Case Insensitive

All keywords are converted to lowercase:

```javascript
XControlPanel.addMuteKeyword('CRYPTO')  // Stored as 'crypto'
XControlPanel.addMuteKeyword('Crypto')  // Same as 'crypto'
```

### Multi-Word Support

Keywords can contain 1-10+ words:

```javascript
XControlPanel.addMuteKeyword('crypto')                    // 1 word
XControlPanel.addMuteKeyword('crypto giveaway')           // 2 words
XControlPanel.addMuteKeyword('link in bio')               // 3 words
XControlPanel.addMuteKeyword('follow me for more content') // 5 words
```

---

## ⚠️ Important Notes

### MUTE vs DROP

| Aspect | MUTE Keywords | DROP Keywords |
|--------|---------------|---------------|
| Action | Mutes account via X | Hides tweet only |
| Permanence | Permanent | Temporary |
| Scope | All devices | Browser only |
| Reversibility | Hard to undo | Easy (toggle off) |
| Use case | Spam/scams | Spoilers/topics |

### Mute Keywords Are Aggressive

When you add a mute keyword:
- Extension monitors all tweets
- When keyword detected → Calls X's native mute
- Account is **permanently muted** in X's system
- Stays muted even if you:
  - Disable extension
  - Uninstall extension
  - Switch devices

**To unmute:** You must manually go to X Settings → Muted accounts → Unmute each one

### Rate Limits

- Extension processes 1 mute per second
- Avoids triggering X's rate limits
- Queue system handles multiple matches
- Notifications show progress

---

## 🐛 Troubleshooting

### Keywords Not Working?

**Check settings:**
```javascript
XControlPanel.stats()
// Look for: keywordMutingEnabled: true or keywordDroppingEnabled: true
```

**Reload page:**
```
Ctrl+R or Cmd+R
```

**Check keywords were saved:**
```javascript
XControlPanel.listMuteKeywords()
XControlPanel.listDropKeywords()
```

### Accounts Not Being Muted?

**Common causes:**
1. Keyword muting not enabled in settings
2. Username extraction failed (try different tweet)
3. Account already muted (check listMuted())
4. X's UI changed (extension may need update)

**Debug:**
```javascript
// Open console, look for messages like:
// "🔇 MUTE keyword match: "crypto" in @username's tweet"
// "✅ Successfully muted @username via X's UI"
```

### Too Many Accounts Muted?

**View what's been muted:**
```javascript
XControlPanel.listMuted()
```

**To prevent:**
- Use DROP keywords instead (less aggressive)
- Be more specific with phrases
- Review keywords regularly

---

## 💡 Best Practices

### Start Small

```javascript
// Begin with obvious spam
XControlPanel.addMuteKeyword('giveaway')
XControlPanel.addMuteKeyword('airdrop')

// Test for a day, then expand
```

### Use DROP for Topics You Sometimes Want

```javascript
// Use DROP for optional content
XControlPanel.addDropKeyword('spoiler')
XControlPanel.addDropKeyword('politics')

// Easy to toggle off when you want to see these
```

### Use MUTE for Spam You Never Want

```javascript
// Use MUTE for definite spam
XControlPanel.addMuteKeyword('free crypto')
XControlPanel.addMuteKeyword('click here now')
```

### Review Regularly

```javascript
// Check what you've added
XControlPanel.listAllKeywords()

// Remove outdated ones
XControlPanel.removeMuteKeyword('old keyword')
```

### Export/Backup Keywords

```javascript
// Export to save
const keywords = XControlPanel.listAllKeywords();
console.log(JSON.stringify(keywords, null, 2));
// Copy this output to a file

// Re-import later
const saved = { /* paste your saved JSON */ };
saved.muteKeywords.forEach(k => XControlPanel.addMuteKeyword(k));
saved.dropKeywords.forEach(k => XControlPanel.addDropKeyword(k));
```

---

## 📖 Quick Reference

```javascript
// ============================================
// QUICK REFERENCE - MOST USED COMMANDS
// ============================================

// ADD
XControlPanel.addMuteKeyword('crypto')
XControlPanel.addDropKeyword('spoiler')

// LIST
XControlPanel.listMuteKeywords()
XControlPanel.listDropKeywords()
XControlPanel.listAllKeywords()

// REMOVE
XControlPanel.removeMuteKeyword('crypto')
XControlPanel.removeDropKeyword('spoiler')

// STATS
XControlPanel.stats()
XControlPanel.listMuted()

// HELP
XControlPanel.help()
```

---

## 🎓 Examples

### Example 1: Clean Timeline from Crypto Spam

```javascript
// Enable keyword muting in extension popup first!

// Add crypto-related keywords
[
  'crypto', 'nft', 'web3', 'blockchain',
  'airdrop', 'whitelist', 'mint', 'presale',
  'crypto giveaway', 'free airdrop', 'nft drop'
].forEach(k => XControlPanel.addMuteKeyword(k));

// Check what was added
XControlPanel.listMuteKeywords();

// View stats
XControlPanel.stats();
```

### Example 2: Hide Spoilers (Reversible)

```javascript
// Enable keyword dropping in extension popup first!

// Add spoiler keywords (DROP = temporary)
[
  'spoiler', 'spoilers',
  'spoiler alert', 'spoiler warning',
  'major spoilers', 'spoilers ahead'
].forEach(k => XControlPanel.addDropKeyword(k));

// Easy to disable later by toggling setting off
```

### Example 3: Mixed Approach

```javascript
// MUTE = Permanent (for spam)
[
  'giveaway', 'airdrop', 'click here',
  'link in bio', 'follow me'
].forEach(k => XControlPanel.addMuteKeyword(k));

// DROP = Temporary (for topics)
[
  'spoiler', 'politics', 'sports'
].forEach(k => XControlPanel.addDropKeyword(k));

// View both
XControlPanel.listAllKeywords();
```

---

## 🆘 Support

### Getting Help

1. Check console for error messages
2. Try `XControlPanel.help()` for commands
3. View stats with `XControlPanel.stats()`
4. Create GitHub issue with details

### Common Issues

**"XControlPanel is not defined"**
- Extension not loaded
- Reload page (Ctrl+R)

**Keywords not matching**
- Check spelling
- Try simpler keywords
- Use single words first

**Too aggressive**
- Switch from MUTE to DROP keywords
- Be more specific with phrases

---

## 📝 Summary

**Key Takeaways:**
- MUTE = Permanent (use for spam)
- DROP = Temporary (use for topics)
- Multi-word phrases supported
- Enable features in extension popup
- Manage via browser console
- Up to 1000 keywords each type

**Remember:** Mute keywords are VERY aggressive and permanent. Start with drop keywords to test!

---

**Version:** 2.2.0  
**Feature:** Keyword Controls  
**Updated:** November 2025
