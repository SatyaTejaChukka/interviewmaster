# Multi-Provider API Setup Guide

## Overview
InterviewMaster now supports multiple LLM providers with **automatic fallback** and **rate limiting** to prevent hitting API limits.

## Problem Solved
❌ **Before**: Single Gemini API key → Hits rate limits mid-interview
✅ **After**: Multiple API keys with auto-fallback → Uninterrupted interviews

## Supported Providers

| Provider | Free Tier Limit | Registration | Model Used |
|----------|-----------------|--------------|-----------|
| **Gemini** | 15 req/min (~1M tokens/month) | [ai.studio](https://ai.studio) | gemini-flash-latest |
| **Groq** | 14,400 req/day (~10 req/min sustained) | [console.groq.com](https://console.groq.com) | mixtral-8x7b-32768 |
| **Claude** | 100K tokens/month | [console.anthropic.com](https://console.anthropic.com) | claude-3-5-sonnet |
| **Mistral** | 600K tokens/month | [console.mistral.ai](https://console.mistral.ai) | mistral-small-latest |
| **OpenRouter** | $5 free credits | [openrouter.ai](https://openrouter.ai) | auto (picks best available) |

## How to Set Up

### Step 1: Get API Keys
1. Go to your **Profile** page
2. Scroll to **"API Keys & LLM Providers"** section
3. Select a provider from the dropdown
4. Visit the registration link shown below the dropdown
5. Create an account and generate an API key
6. Copy the key (usually displayed once - save it!)

### Step 2: Add API Keys to Profile
1. Paste your API key in the input field
2. Click **"Add API Key"** (or press Enter)
3. Repeat for other providers (Groq + Claude recommended)
4. Your keys are stored locally - never sent to external servers

### Step 3: Set Primary Provider
- Use the **radio button** next to each provider to select your primary
- Primary provider is tried first
- If it hits rate limits, system automatically uses fallback providers

## Recommended Setup (Best Free Tier Coverage)

For unlimited interview practice without rate limiting:

1. **Gemini** (Primary) - 1M tokens/month
2. **Groq** (Fallback) - 14,400 requests/day
3. **Claude** (Fallback) - 100K tokens/month

This gives you **~200K tokens/day** total capacity!

## How the System Works

### Rate Limiting
Each provider has built-in rate limiting to spread requests:
- **Gemini**: 10 requests/minute (avoids burst limits)
- **Groq**: 30 requests/minute (more generous)
- **Claude**: 10 requests/minute
- **Mistral**: 20 requests/minute
- **OpenRouter**: 10 requests/minute

Requests are automatically queued and spaced out.

### Automatic Fallback
```
1. Request starts → Uses PRIMARY provider
2. If fails (rate limit/error) → Tries 2nd provider
3. If still fails → Tries 3rd provider
4. If all fail → Shows error with helpful message
```

### Example Flow
```
User submits answer → 
  Try Gemini (PRIMARY) → Hit rate limit? 
    ✗ Yes → Try Groq (2nd) → Success!
    ✓ No → Use response
```

## Environment Variable (Legacy)
The system still respects your `VITE_GEMINI_API_KEY` environment variable as a fallback if no keys are configured in profile.

```env
# .env file
VITE_GEMINI_API_KEY=your-gemini-key-here
```

## Tips for Long Interview Sessions

### 1. **Avoid Rapid-Fire Questions**
- Space out questions by 2-3 seconds
- System implements rate limiting automatically
- Don't spam next question immediately

### 2. **Use Multiple Providers**
- If using Gemini only: ~1 interview with 5 questions
- If using Groq + Gemini: ~2-3 interviews
- If using all 3 (Gemini + Groq + Claude): Unlimited practice

### 3. **Monitor Your Usage**
Future update: Usage dashboard will show:
- Requests made today
- Tokens consumed
- Remaining quota
- Estimated time until reset

## Technical Details for Developers

### LLM Provider Service (`services/llmProvider.ts`)
- Manages multiple providers with fallback
- Implements rate limiting per provider
- Handles auto-retry with exponential backoff
- Graceful error handling

### Usage in Code
```typescript
// Automatically uses user's configured providers
const provider = getLLMProvider();
const response = await provider.generateContent(prompt);

// Or initialize with specific config
initializeLLMProvider(apiKeyConfigs, primaryProvider);
```

### Where LLM is Initialized
- `pages/InterviewSession.tsx` - Uses user's API keys
- `pages/ChatAssistant.tsx` - Uses user's API keys
- Falls back to env var if not configured

## Troubleshooting

### "No LLM providers configured"
**Solution**: Add at least one API key in Profile → API Keys section

### "All LLM providers failed"
**Solutions**:
1. Check internet connection
2. Verify API keys are correct (don't include spaces/quotes)
3. Check provider's dashboard for quota/limit issues
4. Try a different provider

### API key not being saved
**Check**:
1. Not hitting browser's local storage limit (5-10MB per domain)
2. Try clearing browser cache and re-adding
3. Keys are encrypted in localStorage (not plain text)

## Security Notes
- ✅ API keys stored locally in browser localStorage
- ✅ Keys never sent to InterviewMaster servers
- ✅ Keys visible only to you (masked by default)
- ✅ Use "eye" icon to reveal/hide keys
- ✅ Delete unused keys with trash icon

## Cost Breakdown

If you exhaust free tier limits:

| Provider | Cost | Notes |
|----------|------|-------|
| **Gemini** | $0.075/1M input tokens | Cheapest option |
| **Groq** | Free (no paid tier) | No payment required |
| **Claude** | $3/1M input tokens | Higher quality |
| **Mistral** | $0.14/1M tokens | Mid-range |
| **OpenRouter** | Varies by model | Proxy service |

Groq is recommended because it has NO paid tier - truly unlimited free!

## Next Steps

1. ✅ Open **Profile** → **API Keys & LLM Providers**
2. ✅ Get a Groq key (fastest setup)
3. ✅ Add Gemini key (backup)
4. ✅ Optional: Add Claude for better quality
5. ✅ Start interviewing with no rate limit worries!

---

**Questions?** Check the error messages in your browser console for detailed provider-specific errors.
