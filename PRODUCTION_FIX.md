# Production Deployment Fix Guide

## Problem
The admin panel is trying to connect to `http://localhost:3000/api/v1/auth/login` which doesn't work in production.

## Solution
You need to:
1. Update CORS in the backend (✅ Already done)
2. Rebuild the admin panel with the correct API URL
3. Restart the backend API

## Step 1: Update Backend CORS (Already Fixed)

The CORS configuration has been updated to allow your production domain. Now rebuild and restart:

```bash
npm run build
pm2 restart warnerapp
```

## Step 2: Set Environment Variable for Admin Panel Build

Create or update a `.env` file in the project root with the API URL:

```bash
nano .env
```

Add this line (if not already present):
```env
VITE_API_URL=http://38.54.84.119:3000/api/v1
```

**OR if you're using Nginx and want to use the domain:**
```env
VITE_API_URL=https://warnersgrocer.store/api/v1
```

**OR if your API is accessible via the domain without port:**
```env
VITE_API_URL=http://warnersgrocer.store/api/v1
```

## Step 3: Rebuild the Admin Panel

Rebuild the admin panel with the correct API URL:

```bash
npm run build:admin
```

This will create a `dist/` folder (or update it) with the built admin panel files that have the correct API URL baked in.

## Step 4: Serve the Admin Panel

You have several options:

### Option A: Serve with Nginx (Recommended)

Create an Nginx configuration for the admin panel:

```bash
sudo nano /etc/nginx/sites-available/warnersgrocer-admin
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name warnersgrocer.store www.warnersgrocer.store;

    root /home/Warnersnaturalgreengrocer/dist;  # Path to your built admin panel
    index index.html;

    # Serve the admin panel
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy (if API is on same domain)
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/warnersgrocer-admin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Option B: Serve Admin Panel on Different Port/Subdomain

If you want the admin panel on a subdomain like `admin.warnersgrocer.store`:

1. Update `.env`:
```env
VITE_API_URL=http://38.54.84.119:3000/api/v1
```

2. Rebuild:
```bash
npm run build:admin
```

3. Create Nginx config for subdomain:
```nginx
server {
    listen 80;
    server_name admin.warnersgrocer.store;

    root /home/Warnersnaturalgreengrocer/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Option C: Use Vite Preview (Development Only)

For testing:
```bash
npm run build:admin
npx vite preview --host 0.0.0.0 --port 8080
```

## Step 5: Verify Everything Works

1. **Check API is accessible:**
   ```bash
   curl http://38.54.84.119:3000/health
   # OR
   curl http://warnersgrocer.store/health
   ```

2. **Check admin panel loads:**
   - Open `http://warnersgrocer.store` (or your admin URL)
   - Open browser console (F12)
   - Check that API calls are going to the correct URL

3. **Test login:**
   - Try logging in to the admin panel
   - Check browser network tab to see if requests are successful

## Troubleshooting

### Still getting 404 errors

1. **Check the built admin panel has correct URL:**
   ```bash
   grep -r "localhost:3000" dist/
   ```
   If you see localhost, the build didn't pick up the environment variable.

2. **Verify .env file exists and has VITE_API_URL:**
   ```bash
   cat .env | grep VITE_API_URL
   ```

3. **Rebuild with explicit environment variable:**
   ```bash
   VITE_API_URL=http://38.54.84.119:3000/api/v1 npm run build:admin
   ```

### CORS errors

1. **Verify CORS includes your domain:**
   - Check `src/index.ts` has your domain in the origin array
   - Rebuild backend: `npm run build && pm2 restart warnerapp`

2. **Check browser console for exact CORS error**

### API not accessible

1. **Check PM2 is running:**
   ```bash
   pm2 list
   pm2 logs warnerapp
   ```

2. **Check firewall:**
   ```bash
   sudo ufw status
   sudo ufw allow 3000/tcp  # If needed
   ```

3. **Test API directly:**
   ```bash
   curl http://localhost:3000/health
   ```

## Quick Reference

**Your Setup:**
- Domain: `warnersgrocer.store`
- VPS IP: `38.54.84.119`
- API Port: `3000` (default)

**Environment Variable:**
```env
VITE_API_URL=http://38.54.84.119:3000/api/v1
```

**Rebuild Commands:**
```bash
# Backend
npm run build
pm2 restart warnerapp

# Admin Panel
npm run build:admin
```

**Nginx Reload:**
```bash
sudo nginx -t
sudo nginx -s reload
```

