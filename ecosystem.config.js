require('dotenv').config(); // Load .env file before PM2 reads config

module.exports = {
  apps: [{
    name: 'warnerapp',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    cwd: process.cwd(), // Ensure we're in the project root
    env: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 3000,
      MONGODB_URI: process.env.MONGODB_URI,
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
      WIPAY_MERCHANT_ID: process.env.WIPAY_MERCHANT_ID,
      WIPAY_MERCHANT_KEY: process.env.WIPAY_MERCHANT_KEY,
      WIPAY_SECRET_KEY: process.env.WIPAY_SECRET_KEY,
      WIPAY_PUBLIC_KEY: process.env.WIPAY_PUBLIC_KEY,
      WIPAY_ENVIRONMENT: process.env.WIPAY_ENVIRONMENT || 'sandbox',
      FRONTEND_URL: process.env.FRONTEND_URL
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

