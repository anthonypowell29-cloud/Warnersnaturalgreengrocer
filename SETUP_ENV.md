# Setting Up API URL from .env File

## Step 1: Create/Update .env File

Make sure your `.env` file exists in the project root and contains:

```bash
nano .env
```

Add or update this line:
```env
VITE_API_URL=http://38.54.84.119:3000/api/v1
```

**Important:** 
- The variable name MUST start with `VITE_` for Vite to read it
- The `.env` file must be in the project root (same directory as `package.json`)

## Step 2: Verify .env File

Check that the variable is set:

```bash
cat .env | grep VITE_API_URL
```

You should see:
```
VITE_API_URL=http://38.54.84.119:3000/api/v1
```

## Step 3: Rebuild Admin Panel

**CRITICAL:** The environment variable is read at BUILD TIME, so you MUST rebuild:

```bash
npm run build:admin
```

## Step 4: Verify the Build

Check that the built file has the correct URL:

```bash
grep -o "http://[^\"]*" dist/assets/*.js | grep -E "(38.54|warnersgrocer|api)" | head -3
```

You should see your API URL, NOT `localhost:3000`.

## Step 5: Restart Services

```bash
# Restart backend (if needed)
pm2 restart warnerapp

# Restart Nginx
sudo systemctl restart nginx
```

## Step 6: Clear Browser Cache

- Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Or open in incognito/private window

## Complete .env File Example

Your `.env` file should look something like this:

```env
# Server Configuration
NODE_ENV=production
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/jamaican-marketplace

# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=7d

# Admin Panel API URL (MUST start with VITE_)
VITE_API_URL=http://38.54.84.119:3000/api/v1

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

# Frontend URL
FRONTEND_URL=http://warnersgrocer.store
```

## Using Domain Instead of IP

If you want to use your domain (and Nginx is proxying `/api/`):

```env
VITE_API_URL=http://warnersgrocer.store/api/v1
```

Or with HTTPS (if SSL is set up):
```env
VITE_API_URL=https://warnersgrocer.store/api/v1
```

Then rebuild:
```bash
npm run build:admin
```

## Troubleshooting

### Variable not being read?

1. **Check file location:**
   ```bash
   pwd
   ls -la .env
   ```
   Must be in project root.

2. **Check variable name:**
   - Must start with `VITE_`
   - No spaces around `=`
   - No quotes needed (but quotes are okay)

3. **Check for typos:**
   ```bash
   cat .env | grep VITE
   ```

4. **Verify Vite can read it:**
   ```bash
   # Install dotenv-cli if needed
   npm install -g dotenv-cli
   
   # Test
   dotenv -e .env -- node -e "console.log(process.env.VITE_API_URL)"
   ```

### Still seeing localhost:3000?

1. **Make sure you rebuilt after setting the variable:**
   ```bash
   npm run build:admin
   ```

2. **Check the built file:**
   ```bash
   grep "localhost:3000" dist/assets/*.js
   ```
   If you see this, the rebuild didn't pick up the variable.

3. **Try explicit variable:**
   ```bash
   VITE_API_URL=http://38.54.84.119:3000/api/v1 npm run build:admin
   ```

## Important Notes

- ✅ Environment variables are read at BUILD TIME
- ✅ You MUST rebuild after changing `.env`
- ✅ Variable name MUST start with `VITE_`
- ✅ `.env` file must be in project root
- ✅ Clear browser cache after rebuilding

