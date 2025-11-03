# Quick Start: Admin Dashboard

## Step 1: Start the Backend API Server

**In Terminal 1:**
```bash
cd jamaican-marketplace-api
npm run dev
```

You should see:
```
Server running in development mode on port 3000
```

✅ **Keep this terminal running!**

## Step 2: Start the Admin Dashboard

**In Terminal 2 (NEW terminal window):**
```bash
cd jamaican-marketplace-api
npm run dev:admin
```

You should see:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:8080/
```

✅ **Keep this terminal running too!**

## Step 3: Create an Admin User

Before you can login, you need to create an admin user in MongoDB.

### Option A: Update Existing User (Easiest)

If you already have a user account:

1. Open MongoDB Compass or MongoDB Shell
2. Connect to your database
3. Navigate to the `users` collection
4. Find a user and update it:

```javascript
db.users.updateOne(
  { email: "your-email@example.com" },
  { 
    $set: { 
      userType: "admin",
      isVerified: true 
    } 
  }
)
```

### Option B: Create New Admin User via MongoDB

```javascript
// First, hash a password (use online bcrypt tool or Node.js)
// Password "admin123" hashed = "$2b$10$hashed_value_here"

db.users.insertOne({
  email: "admin@jamaicafresh.com",
  password: "$2b$10$REPLACE_WITH_HASHED_PASSWORD",
  displayName: "Admin User",
  userType: "admin",
  isVerified: true,
  addresses: [],
  createdAt: new Date(),
  updatedAt: new Date()
})
```

**Note:** For Option B, you need to hash the password first. You can use:
- Online tool: https://bcrypt-generator.com/
- Or run this in Node.js:
```javascript
const bcrypt = require('bcryptjs');
bcrypt.hash('your-password', 10).then(hash => console.log(hash));
```

## Step 4: Access the Admin Dashboard

1. Open your web browser
2. Go to: **http://localhost:8080**
3. You'll be redirected to the login page
4. Enter your admin credentials:
   - **Email:** The email you set as admin
   - **Password:** The password for that user
5. Click "Sign In"

## Troubleshooting

### ❌ "ERR_CONNECTION_REFUSED" Error

**Problem:** The backend API is not running.

**Solution:**
1. Make sure Terminal 1 is running `npm run dev`
2. Check that you see "Server running in development mode on port 3000"
3. Verify the API is accessible: Open `http://localhost:3000/health` in browser (should show `{"status":"ok",...}`)
4. If port 3000 is in use, check your `.env` file for `PORT` setting

### ❌ "Access denied. Admin privileges required."

**Problem:** The user is not set as admin.

**Solution:**
1. Check MongoDB - user must have `userType: "admin"`
2. Verify user is not banned: `isBanned` should be `false` or missing
3. Update user in MongoDB:
```javascript
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { userType: "admin", isBanned: false } }
)
```

### ❌ "Cannot find module" or Build Errors

**Problem:** Dependencies are missing.

**Solution:**
```bash
cd jamaican-marketplace-api
npm install
```

### ❌ Port 8080 Already in Use

**Problem:** Another application is using port 8080.

**Solution:**
1. Change port in `vite.config.ts`:
```typescript
server: {
  port: 8081, // or any available port
}
```
2. Or stop the application using port 8080

## Summary Checklist

- [ ] Backend API running (`npm run dev` in Terminal 1)
- [ ] Admin Dashboard running (`npm run dev:admin` in Terminal 2)
- [ ] Admin user created in MongoDB (`userType: "admin"`)
- [ ] Browser opened to `http://localhost:8080`
- [ ] Login successful

## URLs

- **Backend API:** http://localhost:3000
- **Admin Dashboard:** http://localhost:8080
- **Health Check:** http://localhost:3000/health

