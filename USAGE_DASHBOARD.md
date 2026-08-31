# ✨ New Feature: Usage Dashboard & Monitoring

## What's New

### 1. **Real-Time Usage Dashboard** 📊
A comprehensive dashboard that tracks your LLM API usage across all providers.

**Features:**
- ✅ Total requests today
- ✅ Tokens consumed
- ✅ Estimated cost tracking
- ✅ Per-provider statistics
- ✅ Success/failure rates
- ✅ Average response times
- ✅ Health status monitoring
- ✅ Auto-refresh every 30 seconds

### 2. **Rate Limit Warnings** ⚠️
Proactive alerts when you're approaching provider limits:
- **75% usage**: "Approaching limit" warning
- **90% usage**: Critical warning with exact numbers
- Prevents unexpected service interruptions

### 3. **Provider Health Monitoring** 🏥
- Automatic health status tracking
- Marks providers unhealthy if failure rate > 50%
- Shows last used timestamp
- Displays average response time

### 4. **Cost Tracking** 💰
Real-time cost estimation based on:
- Tokens consumed per provider
- Provider-specific pricing
- Daily total cost projection

## Where to Find It

**Profile Page → Usage Dashboard Section**
(Appears above API Keys section when you have providers configured)

## Dashboard Layout

```
┌─────────────────────────────────────────────────┐
│  Usage Dashboard         Resets in: 15h 23m     │
├─────────────────────────────────────────────────┤
│  ⚠️ Rate Limit Warnings (if any)                │
├─────────────────────────────────────────────────┤
│  [Total Requests]  [Tokens Used]  [Est. Cost]  │
│      142               56.7K         $0.004     │
├─────────────────────────────────────────────────┤
│  Provider Statistics                            │
│  ┌─────────────────────────────────────────┐   │
│  │ Groq ✓                      2m ago       │   │
│  │ Requests: 98  Tokens: 38.2K             │   │
│  │ Success: 100%  Avg Response: 342ms      │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │ Gemini ✓                    5m ago       │   │
│  │ Requests: 44  Tokens: 18.5K             │   │
│  │ Success: 98%   Avg Response: 521ms      │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## How It Works

### Automatic Tracking
Every API request is automatically tracked:
```typescript
Request → Provider responds → Track:
  - Request count ↑
  - Tokens used (estimated)
  - Response time
  - Success/failure
  - Update health status
```

### Daily Reset
- Stats reset every 24 hours automatically
- Countdown timer shows time until reset
- Manual reset option available

### Storage
- Stats saved to browser localStorage
- Persists across sessions
- Auto-loads on page refresh

## Rate Limit Thresholds

| Provider | Daily Limit | 75% Warning | 90% Critical |
|----------|-------------|-------------|--------------|
| **Gemini** | ~1,500 req | 1,125 req | 1,350 req |
| **Groq** | 14,400 req | 10,800 req | 12,960 req |
| **Claude** | ~1,000 req | 750 req | 900 req |
| **Mistral** | ~6,000 req | 4,500 req | 5,400 req |
| **OpenRouter** | ~500 req | 375 req | 450 req |

## Cost Calculation

Estimated cost per 1M tokens:

| Provider | Cost/1M Tokens | Your Tokens | Est. Cost |
|----------|----------------|-------------|-----------|
| Gemini | $0.075 | 50K | $0.00375 |
| Groq | **$0.00** (FREE) | 30K | **$0.00** |
| Claude | $3.00 | 10K | $0.03 |
| Mistral | $0.14 | 5K | $0.0007 |
| OpenRouter | ~$0.50 | 2K | $0.001 |

**Total estimated cost shown in dashboard**

## Health Status Indicators

**✓ Green Checkmark**: Healthy
- Success rate > 50%
- Provider responding normally

**✗ Red X**: Unhealthy
- Failure rate > 50%
- Suggests trying different provider

## Auto-Refresh

Toggle in top-right corner:
- **ON**: Updates every 30 seconds
- **OFF**: Manual refresh only

## Token Estimation

Tokens estimated using:
```
Tokens ≈ Response length / 4 characters
```

*Note: This is approximate. Actual token usage may vary by ~10-20%*

## Actions Available

1. **Toggle Auto-Refresh**: Top-right button
2. **Reset Statistics**: Bottom-right link (clears all stats)
3. **View Real-Time**: Auto-updates during interviews

## Example Scenarios

### Scenario 1: Normal Usage
```
Total Requests: 45
Tokens Used: 18.2K
Est. Cost: $0.00 (using Groq)
Status: All healthy ✓
```

### Scenario 2: Approaching Limit
```
⚠️ Warning: Gemini 85% of daily limit used
Suggestion: Switch to Groq for remaining interviews
```

### Scenario 3: Provider Down
```
Claude: ✗ Unhealthy (20% success rate)
Auto-fallback to Groq working ✓
```

## Benefits

### 1. **Visibility**
- Know exactly how much you're using
- Track which provider is doing the work
- Monitor costs in real-time

### 2. **Proactive Alerts**
- Get warned before hitting limits
- Time to add backup providers
- Avoid mid-interview failures

### 3. **Performance Insights**
- See which provider is fastest
- Identify reliability issues
- Optimize your provider selection

### 4. **Cost Control**
- Track estimated spend
- Compare free vs paid usage
- Make informed decisions about upgrading

## Privacy & Security

✅ **All data stored locally in browser**
- Not sent to any server
- Only you can see your stats
- Clears when you clear browser data

✅ **No tracking or analytics**
- No external data collection
- Stats stay on your device

## Troubleshooting

### Dashboard shows 0 requests
**Solution**: Start an interview - stats populate after first API call

### Auto-refresh not working
**Check**: Toggle is ON, browser tab is active

### Stats reset unexpectedly
**Reason**: 24 hours passed, or browser storage cleared

### Cost estimates seem high
**Note**: Estimates are conservative. Groq usage = $0.00

## Technical Details

### New Types Added
```typescript
interface ProviderUsageStats {
  provider: LLMProvider;
  requestsToday: number;
  tokensConsumed: number;
  successCount: number;
  failureCount: number;
  lastUsed: number | null;
  avgResponseTime: number;
  isHealthy: boolean;
}

interface UsageDashboard {
  totalRequests: number;
  totalTokens: number;
  estimatedCost: number;
  providerStats: ProviderUsageStats[];
  lastReset: number;
}
```

### New Methods
```typescript
// Get complete dashboard data
getLLMProvider().getUsageDashboard()

// Get specific provider stats
getLLMProvider().getProviderStats(LLMProvider.Groq)

// Get rate limit warnings
getLLMProvider().getRateLimitWarnings()

// Manually reset stats
getLLMProvider().resetStats()
```

## Files Modified

1. **`types.ts`** - Added ProviderUsageStats, UsageDashboard
2. **`services/llmProvider.ts`** - Added tracking, stats methods
3. **`components/UsageDashboard.tsx`** - New dashboard component
4. **`pages/Profile.tsx`** - Integrated dashboard display

## Future Enhancements

**Potential additions:**
- Export stats to CSV
- Historical trends (weekly/monthly)
- Budget alerts ($X per day limit)
- Provider recommendations based on usage
- A/B testing different providers

---

**Status**: ✅ Live and tracking your usage now!

Start an interview and watch your dashboard come to life! 🚀
