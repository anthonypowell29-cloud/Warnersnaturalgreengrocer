# Fix: Base API URL Using localhost:3000

## Problem
The admin panel is using `http://localhost:3000/api/v1` instead of the production URL `https://warnersgrocer.store/api/v1`.

## Solution

The code now automatically detects production mode and uses the correct default URL. However, you should still set `VITE_API_URL` in your `.env` file for explicit control.

### Step 1: Set VITE_API_URL in .env File

On your VPS, edit the `.env` file:

```bash
nano .env
```

Add or update this line:
```env
VITE_API_URL=https://warnersgrocer.store/api/v1
```

**Important:**
- No quotes around the value
- No spaces around `=`
- Must include `/api/v1` at the end
- Must start with `https://` (or `http://` if SSL not set up)

### Step 2: Verify .env File

```bash
cat .env | grep VITE_API_URL
```

Should show:
```
VITE_API_URL=https://warnersgrocer.store/api/v1
```

### Step 3: Rebuild Admin Panel

**CRITICAL:** Environment variables are read at BUILD TIME. You MUST rebuild:

```bash
npm run build:admin
```

### Step 4: Verify the Build

Check what URL was baked into the build:

```bash
grep -o "https://[^\"]*\|http://[^\"]*" dist/assets/*.js | grep -E "(warnersgrocer|localhost|api)" | head -5
```

You should see `https://warnersgrocer.store/api/v1`, NOT `localhost:3000`.

### Step 5: Restart Nginx

```bash
sudo systemctl restart nginx
```

### Step 6: Test in Browser

1. Open browser console (F12)
2. Look for these log messages:
   ```
   Admin API Base URL: https://warnersgrocer.store/api/v1
   Environment variable VITE_API_URL: https://warnersgrocer.store/api/v1
   Mode: production
   Hostname: warnersgrocer.store
   ```

3. Try logging in - the request should go to:
   ```
   POST https://warnersgrocer.store/api/v1/auth/login
   ```

## Automatic Production Detection

The code now automatically detects if you're in production:
- If hostname is NOT `localhost` → uses production URL
- If `MODE=production` → uses production URL
- Default production URL: `https://warnersgrocer.store/api/v1`

However, **you should still set `VITE_API_URL`** in `.env` for explicit control.

## Complete .env Example

```env
# Server Configuration
NODE_ENV=production
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/jamaican-marketplace

# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=7d

# API Base URL for Admin Panel (MUST start with VITE_)
VITE_API_URL=https://warnersgrocer.store/api/v1

# Frontend URL
FRONTEND_URL=https://warnersgrocer.store

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Troubleshooting

### Still seeing localhost:3000?

1. **Check if .env file exists:**
   ```bash
   ls -la .env
   ```

2. **Check if variable is set:**
   ```bash
   cat .env | grep VITE_API_URL
   ```

3. **Rebuild with explicit variable:**
   ```bash
   VITE_API_URL=https://warnersgrocer.store/api/v1 npm run build:admin
   ```

4. **Check browser console logs** - they will show what was detected

### Environment Variable Not Being Read?

Vite only reads variables that:
- Start with `VITE_`
- Are in `.env` file in project root
- Are set BEFORE building

**Solution:** Set it and rebuild:
```bash
echo "VITE_API_URL=https://warnersgrocer.store/api/v1" >> .env
npm run build:admin
```

## Quick Fix Command

```bash
# Set the variable
sed -i '/VITE_API_URL/d' .env  # Remove old entry if exists
echo "VITE_API_URL=https://warnersgrocer.store/api/v1" >> .env

# Verify
cat .env | grep VITE_API_URL

# Rebuild
npm run build:admin

# Restart
sudo systemctl restart nginx
```

## After Fixing

The browser console should show:
```
Admin API Base URL: https://warnersgrocer.store/api/v1
Environment variable VITE_API_URL: https://warnersgrocer.store/api/v1
Mode: production
Hostname: warnersgrocer.store
```

And login requests should go to:
```
POST https://warnersgrocer.store/api/v1/auth/login
```

