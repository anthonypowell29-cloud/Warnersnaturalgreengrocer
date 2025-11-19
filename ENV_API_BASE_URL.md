# Using API_BASE_URL from .env

## Environment Variable Setup

Add `API_BASE_URL` to your `.env` file. For Vite (frontend/admin panel), it must be prefixed with `VITE_`.

### In your `.env` file:

```env
# API Base URL for Admin Panel (Vite requires VITE_ prefix)
VITE_API_BASE_URL=http://38.54.84.119:3000/api/v1

# Or use domain if Nginx is proxying
# VITE_API_BASE_URL=http://warnersgrocer.store/api/v1

# Or with HTTPS (if SSL is set up)
# VITE_API_BASE_URL=https://warnersgrocer.store/api/v1

# Backend API Base URL (for backend use, if needed)
API_BASE_URL=http://38.54.84.119:3000/api/v1
```

## How It Works

### Frontend/Admin Panel (Vite)
- Uses: `VITE_API_BASE_URL`
- Read from: `import.meta.env.VITE_API_BASE_URL`
- Location: `src/services/adminApi.ts`

### Backend (Node.js)
- Uses: `API_BASE_URL` or `process.env.API_BASE_URL`
- Can be used for redirects, webhooks, etc.

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

# API Base URL
# For Admin Panel (Vite - must start with VITE_)
VITE_API_BASE_URL=http://38.54.84.119:3000/api/v1

# For Backend (if needed for redirects, webhooks, etc.)
API_BASE_URL=http://38.54.84.119:3000/api/v1

# Frontend URL (for payment redirects)
FRONTEND_URL=http://warnersgrocer.store

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# WIpay (optional)
WIPAY_MERCHANT_ID=your-merchant-id
WIPAY_MERCHANT_KEY=your-merchant-key
WIPAY_SECRET_KEY=your-secret-key
WIPAY_PUBLIC_KEY=your-public-key
WIPAY_ENVIRONMENT=production
```

## Setup Steps

### 1. Add to .env file

```bash
nano .env
```

Add:
```env
VITE_API_BASE_URL=http://38.54.84.119:3000/api/v1
API_BASE_URL=http://38.54.84.119:3000/api/v1
```

### 2. Verify

```bash
cat .env | grep API_BASE_URL
```

### 3. Rebuild Admin Panel

```bash
npm run build:admin
```

### 4. Restart Services

```bash
pm2 restart warnerapp
sudo systemctl restart nginx
```

## Code Usage

### Admin Panel (Frontend)
The code in `src/services/adminApi.ts` automatically reads from `VITE_API_BASE_URL`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
```

### Backend
If you need to use `API_BASE_URL` in backend code:

```typescript
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
```

## Using Domain Instead of IP

If you're using Nginx to proxy `/api/` requests:

```env
VITE_API_BASE_URL=http://warnersgrocer.store/api/v1
API_BASE_URL=http://warnersgrocer.store/api/v1
```

Then rebuild:
```bash
npm run build:admin
```

## Troubleshooting

### Variable not being read?

1. **Check variable name:**
   - Frontend: Must be `VITE_API_BASE_URL` (starts with `VITE_`)
   - Backend: Can be `API_BASE_URL`

2. **Check .env file location:**
   ```bash
   pwd
   ls -la .env
   ```
   Must be in project root.

3. **Rebuild after changes:**
   ```bash
   npm run build:admin
   ```

4. **Clear browser cache** after rebuilding

### Still seeing localhost:3000?

1. Verify variable is set:
   ```bash
   cat .env | grep API_BASE_URL
   ```

2. Rebuild:
   ```bash
   npm run build:admin
   ```

3. Check built file:
   ```bash
   grep "localhost:3000" dist/assets/*.js
   ```

## Migration from VITE_API_URL

If you were using `VITE_API_URL`, the code supports both for backward compatibility:
- `VITE_API_BASE_URL` (preferred)
- `VITE_API_URL` (fallback)

You can update your `.env` to use `VITE_API_BASE_URL` and it will work immediately.

