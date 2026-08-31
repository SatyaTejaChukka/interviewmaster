# Interview Master - API Key Configuration Guide

## Problem Fixed

The interview session was not starting because the Gemini API key was not being properly passed to the frontend at runtime. This was a configuration issue with how environment variables are handled in GitHub Pages deployment.

## Root Cause

- **Vite environment variables** are embedded at **build time**, not runtime
- The GitHub Actions workflow was correctly passing `VITE_GEMINI_API_KEY` during build
- However, Vite wasn't properly defining the variable in the bundle
- When deployed to GitHub Pages, the API key was `undefined`, causing silent failures

## Solution Implemented

### 1. **Updated vite.config.ts**
   - Added explicit `define` option to ensure `VITE_GEMINI_API_KEY` is properly embedded in the build
   - Added `loadEnv` with `VITE_` prefix to properly load environment variables

### 2. **Added API Key Validation in gemini.ts**
   - Added checks to validate that `VITE_GEMINI_API_KEY` exists before using it
   - Throws meaningful error messages instead of silent failures
   - Both `callGeminiPro()` and `generateSubtopics()` now validate the API key

### 3. **Improved Error Handling in InterviewSession.tsx**
   - Added try-catch blocks around API calls
   - Displays actual error messages to the user instead of generic "Failed" messages
   - Users will now see: "Gemini API Key is not configured" if API key is missing

### 4. **Created .env.local**
   - Template for local development
   - Replace `your_api_key_here` with your actual Gemini API key

## How to Use

### Local Development
1. Create a `.env.local` file in the root directory:
   ```
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```
2. Run `npm run dev` to test locally

### GitHub Pages Deployment
The API key is securely passed via GitHub Secrets during the build process. Ensure:
- Your GitHub repo has `API_KEY` secret configured
- The GitHub Actions workflow uses `VITE_GEMINI_API_KEY: ${{ secrets.API_KEY }}`

## Testing

After making these changes:
1. Test locally with `npm run dev`
2. Build with `npm run build` (uses .env.local)
3. Deploy to GitHub Pages
4. Try selecting topic → subtopic → difficulty level
5. Interview session should now start properly

## If Issues Persist

1. **Check browser console** (F12) for detailed error messages
2. **Verify API key** is valid and has appropriate permissions
3. **Check GitHub Actions logs** to confirm build succeeded with API key
4. **Clear browser cache** before testing deployed version
