# Quick Start: Get Free Unlimited Interviews

## 🚀 30-Second Setup

1. **Open Profile** (top right menu)
2. **Scroll to "API Keys & LLM Providers"** section
3. **Get Groq API Key:**
   - Dropdown shows: "Get free key at: console.groq.com"
   - Click the link → Create account (1 min)
   - Copy your API key
4. **Paste in InterviewMaster:**
   - Paste key in the field
   - Click "Add API Key" ✓
5. **Done!** No more rate limits

## Why This Works

- **Groq**: 14,400 requests/day (completely free, no limits)
- **Fallback**: If Groq somehow full, auto-uses Gemini
- **Result**: Unlimited interview practice

## Optional: Add 1 More for Extra Safety

```
Primary: Groq (14K requests/day)
Backup: Gemini (1M tokens/month)
```

Takes 2 minutes total.

## Where to Get Keys

| Provider | Link | Time | Free Limit |
|----------|------|------|-----------|
| **Groq** ⭐ | [console.groq.com](https://console.groq.com) | 1 min | 14K req/day |
| **Gemini** | [ai.studio](https://ai.studio) | 2 min | 1M tokens/month |
| **Claude** | [console.anthropic.com](https://console.anthropic.com) | 2 min | 100K tokens/month |

## Verification

After adding keys:
- See them in "Your API Keys" section
- Radio button shows primary ✓
- Eye icon to view/hide

## How System Uses Them

```
Your interview request
        ↓
Try Groq first (FAST)
        ├─ Works? → Use it ✓
        └─ Fails? → Try Gemini backup
```

No interruptions, no errors, just smooth interviews.

## Troubleshooting

**Issue**: "No LLM providers configured"
- **Fix**: Make sure you actually saved the key (click "Add API Key")

**Issue**: Key rejected
- **Fix**: Copy entire key (sometimes trailing spaces included)

**Issue**: Still hitting limits
- **Fix**: Add 2nd provider (see optional above)

## Support

For detailed setup: See `MULTI_PROVIDER_SETUP.md`
For technical details: See `IMPLEMENTATION_COMPLETE.md`

---

**TL;DR**: Add Groq API key → Unlimited interviews ✅
