# Environment Variables Setup Guide

## Quick Fix for Current Error

Your application is failing because the `.env` file is missing or empty. Follow these steps:

## Step 1: Create `.env` File

On your VPS, navigate to your project directory and create a `.env` file:

```bash
cd /home/Warnersnaturalgreengrocer  # or wherever your project is
nano .env
```

## Step 2: Add Required Environment Variables

Copy and paste this template into your `.env` file, then replace the placeholder values:

```env
# Server Configuration
NODE_ENV=production
PORT=3000

# Database (REQUIRED - This is causing your current error!)
# Option 1: Local MongoDB
MONGODB_URI=mongodb://localhost:27017/jamaican-marketplace

# Option 2: MongoDB Atlas (cloud)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname

# JWT Configuration (REQUIRED)
JWT_SECRET=your-super-secret-jwt-key-change-this-to-a-random-string
JWT_EXPIRE=7d

# Cloudinary (OPTIONAL but recommended for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# WIpay Payment Gateway (OPTIONAL)
WIPAY_MERCHANT_ID=your-merchant-id
WIPAY_MERCHANT_KEY=your-merchant-key
WIPAY_SECRET_KEY=your-secret-key
WIPAY_PUBLIC_KEY=your-public-key
WIPAY_ENVIRONMENT=production

# Frontend URL (for payment redirects)
FRONTEND_URL=https://yourdomain.com
```

## Step 3: Minimum Required Variables

At minimum, you MUST set these two variables:

```env
MONGODB_URI=mongodb://localhost:27017/jamaican-marketplace
JWT_SECRET=change-this-to-a-random-secret-key-at-least-32-characters-long
```

## Step 4: Save and Exit

- In `nano`: Press `Ctrl+X`, then `Y`, then `Enter`
- In `vi`: Press `Esc`, type `:wq`, then `Enter`

## Step 5: Verify .env File

Check that your `.env` file exists and has content:

```bash
cat .env
```

You should see your environment variables listed.

## Step 6: Restart PM2

After creating/updating the `.env` file, restart your PM2 process:

```bash
pm2 restart warnerapp
```

Or if you're using the ecosystem config:

```bash
pm2 restart ecosystem.config.js
```

## Step 7: Check Logs

Verify the application is starting correctly:

```bash
pm2 logs warnerapp --lines 50
```

You should see:
- ✅ MongoDB Connected: ...
- ✅ No more "MONGODB_URI is not defined" errors

## Common Issues

### Issue 1: .env file not being loaded by PM2

**Solution:** Use the `ecosystem.config.js` file I created, which explicitly loads the `.env` file:

```bash
pm2 delete warnerapp
pm2 start ecosystem.config.js
```

### Issue 2: MongoDB Connection String Format

**Local MongoDB:**
```env
MONGODB_URI=mongodb://localhost:27017/jamaican-marketplace
```

**MongoDB Atlas:**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
```

Make sure to:
- Replace `username` and `password` with your MongoDB credentials
- Replace `cluster.mongodb.net` with your actual cluster URL
- Replace `dbname` with your database name

### Issue 3: File Permissions

Make sure the `.env` file is readable:

```bash
chmod 600 .env
```

## Generating a Secure JWT_SECRET

You can generate a random secret key using:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Or use an online generator, then copy the output to your `.env` file.

## Testing Your Setup

After setting up the `.env` file and restarting PM2, test your API:

```bash
curl http://localhost:3000/health
```

You should get:
```json
{"status":"ok","message":"API is running"}
```

## Security Note

**NEVER commit your `.env` file to git!** Make sure `.env` is in your `.gitignore` file.

