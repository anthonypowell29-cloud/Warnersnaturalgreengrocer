# API URL Fix Summary

## Problem Identified

The frontend was generating malformed URLs like:
```
https://warnersgrocer.store/VITE_API_URL=https://warnersgrocer.store/api/auth/login
```

This occurred because:
1. The `.env` file likely contained the variable name itself in the value (e.g., `VITE_API_URL=VITE_API_URL=https://...`)
2. No validation was performed on the environment variable value
3. URL concatenation didn't handle edge cases

## Changes Made

### 1. Updated `src/services/adminApi.ts`

**Before:**
```typescript
const API_BASE_URL = env.VITE_API_BASE_URL || env.VITE_API_URL || 'http://localhost:3000/api/v1';
const url = `${API_BASE_URL}${endpoint}`;
```

**After:**
```typescript
// Get API base URL from environment variable
let apiBaseUrl = env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Remove any trailing slashes
apiBaseUrl = apiBaseUrl.trim().replace(/\/+$/, '');

// Validate: ensure it doesn't contain the variable name itself
if (apiBaseUrl.includes('VITE_API_URL=') || apiBaseUrl.includes('VITE_API_BASE_URL=')) {
  console.error('Invalid API URL detected in environment variable:', apiBaseUrl);
  apiBaseUrl = 'http://localhost:3000/api/v1';
}

// Ensure the URL is properly formatted
if (!apiBaseUrl.startsWith('http://') && !apiBaseUrl.startsWith('https://')) {
  console.error('API URL must start with http:// or https://:', apiBaseUrl);
  apiBaseUrl = 'http://localhost:3000/api/v1';
}

const API_BASE_URL = apiBaseUrl;

// In request function:
const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
const url = `${API_BASE_URL}${normalizedEndpoint}`;
```

**Key Improvements:**
- ✅ Removed support for `VITE_API_BASE_URL` (standardized on `VITE_API_URL`)
- ✅ Added validation to detect malformed environment variable values
- ✅ Added URL normalization (trim, remove trailing slashes)
- ✅ Added protocol validation
- ✅ Normalized endpoint paths

### 2. Created `.env.example`

Created a template showing the correct format:
```env
VITE_API_URL=https://warnersgrocer.store/api/v1
```

## Correct .env Configuration

Your `.env` file should contain **ONLY**:

```env
VITE_API_URL=https://warnersgrocer.store/api/v1
```

**NOT:**
- ❌ `VITE_API_URL=VITE_API_URL=https://warnersgrocer.store/api/v1`
- ❌ `VITE_API_URL="https://warnersgrocer.store/api/v1"`
- ❌ `VITE_API_URL=https://warnersgrocer.store/api/v1/`
- ❌ `VITE_API_BASE_URL=https://warnersgrocer.store/api/v1`

## Expected URL Structure

With the correct `.env` value:
```env
VITE_API_URL=https://warnersgrocer.store/api/v1
```

The login request will generate:
```
POST https://warnersgrocer.store/api/v1/auth/login
```

**Breakdown:**
- Base URL: `https://warnersgrocer.store/api/v1`
- Endpoint: `/auth/login`
- Final URL: `https://warnersgrocer.store/api/v1/auth/login` ✅

## Next Steps

1. **Fix your `.env` file on the VPS:**
   ```bash
   nano .env
   ```
   
   Set it to:
   ```env
   VITE_API_URL=https://warnersgrocer.store/api/v1
   ```

2. **Rebuild the admin panel:**
   ```bash
   npm run build:admin
   ```

3. **Verify the build:**
   ```bash
   grep -o "https://[^\"]*" dist/assets/*.js | grep "warnersgrocer" | head -3
   ```
   
   Should show: `https://warnersgrocer.store/api/v1`

4. **Restart Nginx:**
   ```bash
   sudo systemctl restart nginx
   ```

5. **Clear browser cache** and test login

## Verification

After rebuilding, check the browser console. You should see:
```
Admin API Base URL: https://warnersgrocer.store/api/v1
```

And the network request should be:
```
POST https://warnersgrocer.store/api/v1/auth/login
```

**NOT:**
```
POST https://warnersgrocer.store/VITE_API_URL=https://warnersgrocer.store/api/auth/login
```

## Files Changed

1. ✅ `src/services/adminApi.ts` - Added validation and URL normalization
2. ✅ `.env.example` - Created template file (blocked by gitignore, but documented)

## Testing Checklist

- [ ] `.env` file contains only `VITE_API_URL=https://warnersgrocer.store/api/v1`
- [ ] Rebuilt admin panel with `npm run build:admin`
- [ ] Browser console shows correct base URL
- [ ] Login request goes to `https://warnersgrocer.store/api/v1/auth/login`
- [ ] No "VITE_API_URL=" appears in any request URL
- [ ] All API endpoints work correctly

