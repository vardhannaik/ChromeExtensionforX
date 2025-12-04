# Auto-Mute Guide - X Control Panel

Complete guide to automated account muting in X Control Panel v9.0.0+

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Setup Instructions](#setup-instructions)
4. [Configuration Options](#configuration-options)
5. [Manual Commands](#manual-commands)
6. [Auto-Trigger System](#auto-trigger-system)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The Auto-Mute system automatically detects and mutes accounts that match your keywords or post media-only spam. It operates in two modes:

- **Manual Mode**: You trigger muting when ready
- **Auto-Trigger Mode**: Automatically mutes when queue threshold is reached

**Key Features:**
- ✅ Silent keyword detection
- ✅ FIFO queue (First In, First Out)
- ✅ Minimized/hidden window processing
- ✅ MutationObserver for reliability (~95% success rate)
- ✅ Triple-layer follow protection
- ✅ Configurable thresholds and delays

---

## How It Works

### 1. Detection Phase (Silent)
```
Tweet appears → Keyword match → Add to queue
                                  ↓
                            No console output
                            No user interruption
```

### 2. Queue Accumulation
```
Account 1 added → Queue: 1
Account 2 added → Queue: 2
...
Account 10 added → Queue: 10
```

### 3. Muting Phase
```
Manual: You run XCP.autoMute()
   OR
Auto: Queue reaches threshold (e.g., 10)

↓
Minimized window opens
Navigates to each profile
Clicks More → Mute
Window closes when done
```

---

## Setup Instructions

### Step 1: Add Keywords
```javascript
XCP.addKeyword('crypto')
XCP.addKeyword('giveaway')
XCP.addKeyword('link in bio')
```

Or use the bulk method:
```javascript
const keywords = ['crypto', 'nft', 'airdrop', 'giveaway'];
keywords.forEach(k => XCP.addKeyword(k));
```

### Step 2: Enable Keyword Muting
1. Click extension icon (puzzle piece)
2. Toggle **"Enable keyword muting"** ON
3. Click **"Save Settings"**

### Step 3: Configure Auto-Mute (Optional)
1. Click extension icon
2. Scroll to **"Auto-Mute"** section
3. Toggle **"Enable automatic muting"** ON
4. Set **"Auto-mute threshold"**: `10 accounts` (default)
5. Set **"Delay between accounts"**: `2 seconds` (default)
6. Click **"Save Settings"**

### Step 4: Browse Normally
Keywords are detected silently. Accounts accumulate in queue with no interruption.

---

## Configuration Options

### Threshold Settings

| Threshold | Best For | Behavior |
|-----------|----------|----------|
| **5 accounts** | Aggressive cleaning | Triggers every ~5 keyword matches |
| **10 accounts** (default) | Balanced | Triggers every ~10 keyword matches |
| **15-20 accounts** | Conservative | Fewer interruptions, larger batches |
| **30-50 accounts** | Bulk processing | Very infrequent, large batches |

### Delay Settings

| Delay | Speed | Reliability | Best For |
|-------|-------|-------------|----------|
| **1 second** | ⚡ Fast | Good | Small batches, stable connection |
| **2 seconds** (default) | ⚡ Balanced | ✅ Excellent | Most users |
| **3 seconds** | 🐢 Slower | ✅ Very reliable | Large batches, slow connection |
| **5 seconds** | 🐢 Slowest | ✅ Maximum | Rate limit concerns |

**Formula:**
```
Total time = (accounts × (delay + 1.5s))

Examples:
- 10 accounts × (2s + 1.5s) = ~35 seconds
- 20 accounts × (3s + 1.5s) = ~90 seconds
```

---

## Manual Commands

### View Queue
```javascript
// Quick view with reasons
XCP.showQueue()
// or
XCP.listFailedMutes()
```

**Output:**
```
📋 Batch Mute Queue (12 accounts):
══════════════════════════════════════════════════════════════════════
1. @username1
   Reason: crypto | Added: 5m ago
2. @username2
   Reason: giveaway | Added: 3m ago
3. @username3
   Reason: media-only | Added: just now
...
```

### Show Full List with Links
```javascript
XCP.exportQueue()
// or
XCP.batchMuteNow()
```

**Output:**
```
📋 Accounts to Mute Manually (12):
══════════════════════════════════════════════════════════════════════
  1. @username1 → https://x.com/username1
     Reason: crypto | Added: 5m ago
  2. @username2 → https://x.com/username2
     Reason: giveaway | Added: 3m ago
...

💡 How to mute these accounts:
   Option 1: Run XCP.autoMute() for automatic batch muting
   Option 2: Visit each profile link above and click More → Mute
   Option 3: Go to X Settings → Privacy → Muted accounts
```

### Auto-Mute Commands
```javascript
// Mute all accounts in queue
XCP.autoMute()

// Mute specific range
XCP.autoMute('1-10')    // First 10 accounts
XCP.autoMute('5-15')    // Accounts 5 through 15

// Mute single account
XCP.autoMute(3)         // Account #3 only
```

### Clear Queue
```javascript
// Clear all
XCP.clearQueue('all')

// Clear range
XCP.clearQueue('1-10')

// Clear specific numbers
XCP.clearQueue('1,5,10')

// Clear by username
XCP.clearQueue('username')
XCP.clearQueue('@username')
```

### Clean Queue
```javascript
// Remove followed accounts from queue
XCP.removeFollowedFromQueue()
```

---

## Auto-Trigger System

### How Auto-Trigger Works

When **"Enable automatic muting"** is ON:

1. **Detection**: Keywords detected → Accounts added to queue
2. **Threshold Check**: After each addition, check if `queue.length >= threshold`
3. **Auto-Trigger**: If threshold reached → `XCP.autoMute()` runs automatically
4. **Processing**: Minimized window opens, mutes all accounts, closes
5. **Reset**: Queue cleared, process repeats when threshold reached again

### Console Output (Auto-Trigger)
```
🔔 Auto-mute threshold reached (10/10 accounts)
🚀 Starting automatic mute process...

🔄 Auto-muting 10 accounts (minimized window)...
⏳ This will take approximately 35 seconds

✅ 1/10 Muted @account1
✅ 2/10 Muted @account2
...
✅ 10/10 Muted @account10

📊 Results:
   ✅ Successfully muted: 10
   ❌ Failed: 0
   📋 Remaining in queue: 0

🎉 Queue is now empty!
```

### Overlap Prevention

The system prevents multiple auto-mutes from running simultaneously:

```javascript
if (isAutoMuting) {
  console.log(`ℹ️  Auto-mute already in progress, skipping trigger`);
  return;
}
```

### Settings Change Handling

**If you disable auto-mute during processing:**
```
🛑 Auto-mute disabled - cancelling any ongoing process
```

**If you change threshold/delay during processing:**
```
ℹ️  Auto-mute threshold changed: 10 → 20
ℹ️  Auto-mute delay changed: 2000ms → 3000ms (applies to next batch)
```

---

## Troubleshooting

### Issue: Auto-trigger not working

**Check:**
1. Is "Enable automatic muting" toggled ON?
2. Is "Enable keyword muting" toggled ON?
3. Has queue reached threshold? (Run `XCP.showQueue()`)
4. Check console for errors

**Solution:**
```javascript
// Check current queue
XCP.showQueue()

// Manually trigger if needed
XCP.autoMute()
```

### Issue: Some accounts fail to mute

**Causes:**
- Page didn't load fully
- Profile doesn't exist
- Account is private/suspended
- Rate limiting

**Solution:**
```javascript
// Check remaining accounts
XCP.showQueue()

// Retry failed accounts
XCP.autoMute()
```

**Expected success rate:** ~95%+

### Issue: Window appears on screen (not hidden)

**Cause:** Your OS doesn't support minimized windows

**Fallback:** Extension automatically uses off-screen window (left: -3000, top: -3000)

**Console message:**
```
Minimized state not supported, using off-screen window
```

### Issue: "Invalid value for state" error

**Fixed in v9.0.0** - Now uses fallback to off-screen window if minimized not supported

### Issue: Queue keeps growing

**Check:**
1. Is auto-mute enabled?
2. Are there failed accounts? (Run `XCP.showQueue()`)
3. Check console for errors during auto-mute

**Solution:**
```javascript
// Check queue
XCP.showQueue()

// Manually clear if needed
XCP.clearQueue('all')

// Or manually trigger mute
XCP.autoMute()
```

### Issue: Accidentally added followed account

**Safety:**
The extension has triple-layer protection:
1. Detection phase: Skips followed accounts
2. Queue addition: Skips followed accounts  
3. Mute execution: Checks follow button before muting

**Cleanup:**
```javascript
XCP.removeFollowedFromQueue()
```

---

## Advanced Usage

### Custom Workflow
```javascript
// 1. Detect for 1 hour, then process
setTimeout(() => {
  XCP.autoMute();
}, 60 * 60 * 1000);

// 2. Process in smaller batches
XCP.autoMute('1-5');
// Wait...
XCP.autoMute('6-10');

// 3. Review before auto-mute
XCP.showQueue();
// Check the list...
XCP.autoMute();
```

### Statistics
```javascript
// Check overall stats
XCP.stats()

// Analyze specific account
XCP.analyzeAccount('username')
```

### Bulk Keyword Management
```javascript
// Export keywords
XCP.listKeywords()

// Add multiple
['crypto', 'nft', 'web3'].forEach(k => XCP.addKeyword(k));

// Clear all
XCP.clearKeywords()
```

---

## Best Practices

### ✅ Do:
- Start with threshold = 10, delay = 2s
- Review queue periodically with `XCP.showQueue()`
- Use `XCP.removeFollowedFromQueue()` if concerned
- Add specific, targeted keywords
- Enable auto-trigger for hands-free operation

### ❌ Don't:
- Set delay too low (< 1 second = rate limits)
- Add overly broad keywords (like "a", "the")
- Disable during active auto-mute (causes cancellation)
- Ignore failed mutes (retry with `XCP.autoMute()`)

---

## Quick Reference

### Essential Commands
```javascript
XCP.help()                     // Show all commands
XCP.showQueue()                // View queue
XCP.autoMute()                 // Mute all
XCP.clearQueue('all')          // Clear queue
XCP.removeFollowedFromQueue()  // Safety check
```

### Settings Location
Extension icon → Settings:
- Enable keyword muting: ON
- Enable automatic muting: ON  
- Auto-mute threshold: 10
- Delay between accounts: 2 seconds

---

## Version History

**v9.0.0** (Current)
- Auto-trigger system
- Configurable threshold and delay
- Minimized/off-screen window
- Settings change handling
- Overlap prevention

**v8.x**
- MutationObserver reliability
- Follow protection
- FIFO queue with timestamps

---

## Support

For issues or questions:
1. Check console for errors (F12)
2. Run `XCP.help()` for command reference
3. Review this guide
4. Check TROUBLESHOOTING.md

---

**Enjoy automated, hands-free timeline cleaning!** 🚀
