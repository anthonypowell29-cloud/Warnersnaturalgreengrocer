# Admin Dashboard Setup Guide

## Overview
The admin dashboard is a React web application that runs alongside the backend API. It provides a web interface for managing users, products, reviews, transactions, and payouts.

## Prerequisites

1. **Backend API must be running** - The admin panel needs the backend API to function
2. **MongoDB must be connected** - User data is stored in MongoDB
3. **Admin user must be created** - At least one user with `userType: "admin"` is required

## Step 1: Start the Backend API

First, start the backend API server:

```bash
cd jamaican-marketplace-api
npm run dev
```

The backend will run on `http://localhost:3000` (or whatever PORT you configured).

## Step 2: Start the Admin Dashboard

In a **separate terminal**, start the Vite dev server for the admin panel:

```bash
cd jamaican-marketplace-api
npm run dev:admin
```

Or if the script doesn't exist, you can run Vite directly:

```bash
npx vite
```

The admin dashboard will be available at: **`http://localhost:8080`**

## Step 3: Create an Admin User

You need to create at least one admin user in MongoDB. You have two options:

### Option A: Using MongoDB Compass or MongoDB Shell

1. Connect to your MongoDB database
2. Navigate to the `users` collection
3. Find an existing user (or create a new one)
4. Update the user document:

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

### Option B: Register a new user and update via API

1. First, register a new user using the mobile app or API:
   ```bash
   POST http://localhost:3000/api/v1/auth/register
   {
     "email": "admin@example.com",
     "password": "your-secure-password",
     "displayName": "Admin User",
     "userType": "buyer"  // Start as buyer
   }
   ```

2. Then, update the user to admin using MongoDB:
   ```javascript
   db.users.updateOne(
     { email: "admin@example.com" },
     { $set: { userType: "admin" } }
   )
   ```

### Option C: Create admin user directly in MongoDB

```javascript
db.users.insertOne({
  email: "admin@example.com",
  password: "$2b$10$hashed_password_here", // Use bcrypt to hash your password
  displayName: "Admin User",
  userType: "admin",
  isVerified: true,
  addresses: [],
  createdAt: new Date(),
  updatedAt: new Date()
})
```

**Note:** For Option C, you'll need to hash the password using bcrypt. You can use an online bcrypt tool or create a simple script.

## Step 4: Configure Environment Variables

Make sure your admin panel can connect to the backend API. Create or update `.env` in the admin panel root:

```env
VITE_API_URL=http://localhost:3000/api/v1
```

## Step 5: Access the Admin Dashboard

1. Open your browser
2. Navigate to: **`http://localhost:8080`**
3. You will be redirected to the login page
4. Enter your admin credentials:
   - **Email:** The email of the admin user you created
   - **Password:** The password for that user
5. Click "Sign In"

## Admin Dashboard Features

Once logged in, you'll have access to:

- **Dashboard** - Overview with key metrics and statistics
- **Users** - Manage all marketplace users (view, ban, verify)
- **Products** - Moderate product listings (approve/reject)
- **Reviews** - Moderate user reviews
- **Transactions** - Monitor all payment transactions
- **Payouts** - View and manage farmer payouts

## Troubleshooting

### "Access denied. Admin privileges required."
- Make sure the user has `userType: "admin"` in MongoDB
- Verify the user is not banned (`isBanned: false` or missing)

### "Cannot connect to API"
- Verify the backend API is running on port 3000
- Check `VITE_API_URL` in your `.env` file
- Ensure CORS is properly configured in the backend

### "Failed to login"
- Check if the user exists in MongoDB
- Verify the password is correct
- Make sure the backend API is accessible

### Port already in use (8080)
- Change the port in `vite.config.ts`:
  ```typescript
  server: {
    port: 8081, // or any available port
  }
  ```

## Running Both Services

To run both the backend and admin panel simultaneously, you can:

1. **Use two terminal windows:**
   - Terminal 1: `npm run dev` (backend API)
   - Terminal 2: `npx vite` (admin panel)

2. **Or use a process manager like PM2:**
   ```bash
   npm install -g pm2
   pm2 start npm --name "api" -- run dev
   pm2 start npm --name "admin" -- run vite
   ```

## Production Deployment

For production:
1. Build the admin panel: `npm run build` (if you have a build script)
2. Serve the built files with a web server (nginx, Apache, etc.)
3. Configure the API URL for production
4. Ensure proper CORS settings on the backend

---

**Default URLs:**
- Backend API: `http://localhost:3000`
- Admin Dashboard: `http://localhost:8080`
- Login Page: `http://localhost:8080/login`

