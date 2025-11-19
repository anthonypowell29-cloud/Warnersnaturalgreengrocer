# Deployment Guide for Ubuntu VPS

This guide will help you deploy your Jamaican Marketplace API to an Ubuntu VPS server.

## Prerequisites

- Ubuntu VPS with SSH access
- Node.js installed (v18 or higher)
- MongoDB installed and running (or MongoDB Atlas connection string)
- PM2 installed globally (for process management)
- Nginx installed (optional, for reverse proxy)

## Step 1: Build the Project

On your local machine or VPS, build the TypeScript code:

```bash
npm run build
```

This creates the compiled JavaScript files in the `dist/` directory.

## Step 2: Set Up Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Server Configuration
NODE_ENV=production
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/jamaican-marketplace
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# WIpay Payment Gateway (optional)
WIPAY_MERCHANT_ID=your-merchant-id
WIPAY_MERCHANT_KEY=your-merchant-key
WIPAY_SECRET_KEY=your-secret-key
WIPAY_PUBLIC_KEY=your-public-key
WIPAY_ENVIRONMENT=production

# Frontend URL (for payment redirects)
FRONTEND_URL=https://yourdomain.com
```

**Important:** Never commit the `.env` file to version control. Make sure it's in your `.gitignore`.

## Step 3: Install Production Dependencies

On your VPS, install only production dependencies:

```bash
npm install --production
```

This installs only the packages listed in `dependencies`, not `devDependencies`.

## Step 4: Deploy Using PM2 (Recommended)

PM2 keeps your Node.js application running in the background and automatically restarts it if it crashes.

### Install PM2 globally:

```bash
npm install -g pm2
```

### Start your application with PM2:

```bash
pm2 start dist/index.js --name jamaican-marketplace-api
```

### Useful PM2 commands:

```bash
# View running processes
pm2 list

# View logs
pm2 logs jamaican-marketplace-api

# Restart the application
pm2 restart jamaican-marketplace-api

# Stop the application
pm2 stop jamaican-marketplace-api

# Delete the application from PM2
pm2 delete jamaican-marketplace-api

# Save PM2 configuration to start on system reboot
pm2 save
pm2 startup
```

### Create PM2 Ecosystem File (Optional but Recommended)

Create a `ecosystem.config.js` file in your project root:

```javascript
module.exports = {
  apps: [{
    name: 'jamaican-marketplace-api',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

Then start with:
```bash
pm2 start ecosystem.config.js
```

## Step 5: Set Up Nginx Reverse Proxy (Optional but Recommended)

If you want to serve your API on port 80/443 with SSL, set up Nginx as a reverse proxy.

### Install Nginx:

```bash
sudo apt update
sudo apt install nginx
```

### Create Nginx Configuration:

Create a file `/etc/nginx/sites-available/jamaican-marketplace-api`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;  # Replace with your domain

    location / {
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
}
```

### Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/jamaican-marketplace-api /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

## Step 6: Set Up SSL with Let's Encrypt (Optional but Recommended)

For HTTPS, install Certbot:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

Follow the prompts to complete SSL setup.

## Step 7: Configure Firewall

Allow necessary ports:

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # Direct API access (optional)
sudo ufw enable
```

## Step 8: Update CORS Configuration

Update `src/index.ts` to include your production frontend URL:

```typescript
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:3000',
    'http://127.0.0.1:8080',
    'https://yourdomain.com',  // Add your production frontend URL
    'https://www.yourdomain.com'
  ],
  credentials: true,
}));
```

Rebuild after making this change:
```bash
npm run build
pm2 restart jamaican-marketplace-api
```

## Step 9: Verify Deployment

Test your API:

```bash
# Health check
curl http://localhost:3000/health

# Or if using Nginx
curl http://api.yourdomain.com/health
```

You should receive:
```json
{"status":"ok","message":"API is running"}
```

## Deployment Checklist

- [ ] Build completed successfully (`npm run build`)
- [ ] `.env` file created with all required variables
- [ ] Production dependencies installed (`npm install --production`)
- [ ] MongoDB is accessible and connected
- [ ] Application started with PM2
- [ ] PM2 configured to start on reboot (`pm2 save` and `pm2 startup`)
- [ ] Nginx configured (if using reverse proxy)
- [ ] SSL certificate installed (if using HTTPS)
- [ ] Firewall configured
- [ ] CORS updated with production URLs
- [ ] Health check endpoint responds correctly
- [ ] Logs are being written correctly

## Troubleshooting

### Application won't start
- Check PM2 logs: `pm2 logs jamaican-marketplace-api`
- Verify `.env` file exists and has correct values
- Check MongoDB connection: `mongosh` or verify MongoDB Atlas connection string

### Port already in use
- Change PORT in `.env` file
- Or kill the process using the port: `sudo lsof -i :3000` then `kill -9 <PID>`

### MongoDB connection fails
- Verify MongoDB is running: `sudo systemctl status mongod`
- Check connection string in `.env`
- Verify network access if using MongoDB Atlas

### Nginx 502 Bad Gateway
- Check if Node.js app is running: `pm2 list`
- Verify proxy_pass URL matches your app port
- Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`

## Quick Start Commands

```bash
# Build and deploy
npm run build
npm install --production
pm2 start dist/index.js --name jamaican-marketplace-api
pm2 save

# View logs
pm2 logs jamaican-marketplace-api

# Restart after changes
npm run build
pm2 restart jamaican-marketplace-api
```

## Updating the Application

When you need to update your application:

```bash
# Pull latest changes (if using git)
git pull

# Install any new dependencies
npm install --production

# Rebuild
npm run build

# Restart PM2
pm2 restart jamaican-marketplace-api
```

