# Fix: API URL Still Showing localhost:3000

## Problem
The admin panel was built without `VITE_API_URL` set, so it defaulted to `localhost:3000`.

## Solution: Set Environment Variable and Rebuild

### Step 1: Check if .env file exists and has VITE_API_URL

```bash
cat .env | grep VITE_API_URL
```

If nothing shows up, the variable isn't set.

### Step 2: Set VITE_API_URL

**Option A: Add to existing .env file**
```bash
nano .env
```

Add this line (if not present):
```env
VITE_API_URL=http://38.54.84.119:3000/api/v1
```

**Option B: Set it directly**
```bash
echo "VITE_API_URL=http://38.54.84.119:3000/api/v1" >> .env
```

**Option C: Use domain (if Nginx is set up to proxy /api/)**
```bash
echo "VITE_API_URL=http://warnersgrocer.store/api/v1" >> .env
```

### Step 3: Verify the variable is set

```bash
cat .env | grep VITE_API_URL
```

You should see:
```
VITE_API_URL=http://38.54.84.119:3000/api/v1
```

### Step 4: Rebuild the admin panel

**IMPORTANT:** The environment variable MUST be set BEFORE building!

```bash
npm run build:admin
```

### Step 5: Verify the build has correct URL

Check the built JavaScript file:

```bash
grep -o "http://[^\"]*" dist/assets/*.js | grep -i "api\|3000\|38.54" | head -5
```

You should see your API URL, NOT `localhost:3000`.

### Step 6: Restart Nginx (if serving through Nginx)

```bash
sudo systemctl restart nginx
```

### Step 7: Clear browser cache

- Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Or clear browser cache completely

## Quick One-Liner Fix

If you want to do it all at once:

```bash
# Set the environment variable
echo "VITE_API_URL=http://38.54.84.119:3000/api/v1" >> .env

# Verify it's set
cat .env | grep VITE_API_URL

# Rebuild
npm run build:admin

# Restart Nginx
sudo systemctl restart nginx
```

## Alternative: Build with Explicit Environment Variable

If the `.env` file isn't being read, you can set it inline:

```bash
VITE_API_URL=http://38.54.84.119:3000/api/v1 npm run build:admin
```

## Using Domain Instead of IP

If you've set up Nginx to proxy `/api/` requests, you can use your domain:

```bash
VITE_API_URL=http://warnersgrocer.store/api/v1 npm run build:admin
```

Or add to `.env`:
```env
VITE_API_URL=http://warnersgrocer.store/api/v1
```

Then rebuild:
```bash
npm run build:admin
```

## Troubleshooting

### Still seeing localhost:3000 after rebuild?

1. **Check .env file location:**
   ```bash
   pwd
   ls -la .env
   ```
   The `.env` file must be in the project root (same directory as `package.json`).

2. **Check for multiple .env files:**
   ```bash
   find . -name ".env*" -type f
   ```

3. **Verify Vite is reading the variable:**
   ```bash
   # Check what Vite sees
   node -e "require('dotenv').config(); console.log(process.env.VITE_API_URL)"
   ```

4. **Build with explicit variable:**
   ```bash
   VITE_API_URL=http://38.54.84.119:3000/api/v1 npm run build:admin
   ```

### Environment variable not being read

Make sure:
- The variable name starts with `VITE_` (required by Vite)
- The `.env` file is in the project root
- You're running `npm run build:admin` from the project root
- No typos in the variable name

### Check built file directly

```bash
# Search for the API URL in built files
grep -r "localhost:3000" dist/assets/*.js
grep -r "38.54.84.119" dist/assets/*.js
```

If you see `localhost:3000` but not your IP, the rebuild didn't work. Try the explicit variable method above.

## Important Notes

1. **Environment variables are baked into the build** - You MUST rebuild after changing them
2. **Vite only reads variables starting with `VITE_`** - Other variables won't work
3. **The `.env` file must be in the project root** - Same directory as `package.json`
4. **Clear browser cache** after rebuilding - Old JavaScript might be cached

