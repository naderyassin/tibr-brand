# Hostinger Deployment Guide for TIBR (`tibr.shop`)

This document outlines how to deploy the TIBR Express + React application on Hostinger Node.js Web Hosting or Hostinger VPS.

---

## 1. Prerequisites & Preparation

Before deploying, ensure you have:
1. Built the React client frontend:
   ```bash
   npm run build
   ```
   This generates the production bundle in `dist/client/`.

2. Environment variables set up on Hostinger (or in a `.env` file on the server):
   ```env
   NODE_ENV=production
   PORT=3000
   HOST=0.0.0.0
   SUPABASE_URL=https://your-supabase-project.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   SMTP_HOST=smtp.hostinger.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=no-reply@tibr.shop
   SMTP_PASS=your-smtp-password
   SMTP_FROM="TIBR <no-reply@tibr.shop>"
   ```

---

## 2. Deploying via Hostinger Web Hosting (Node.js Application Manager)

1. Log into **Hostinger hPanel**.
2. Navigate to **Websites** -> Select `tibr.shop` -> **Node.js**.
3. Set up the Node.js Application settings:
   - **Node.js version**: 18.x or 20.x+
   - **Application Root**: `/` or `/public_html` (where project files reside)
   - **Application URL**: `https://tibr.shop`
   - **Application Startup File**: `server/index.js`
4. Copy/Upload project files (via Git integration, SSH, or File Manager), excluding `node_modules`.
5. Run installation and build commands on Hostinger Terminal / SSH:
   ```bash
   npm install
   npm run build
   ```
6. Click **Restart Application** in hPanel.

---

## 3. Deploying via Hostinger VPS (PM2 + NGINX)

If you are using Hostinger VPS:

1. Clone or upload your repository to `/var/www/tibr-brand`.
2. Install dependencies & build client:
   ```bash
   npm install
   npm run build
   ```
3. Start application using PM2:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   ```
4. Point NGINX reverse proxy to `http://127.0.0.1:3000`.

---

## 4. Verification

Visit `https://tibr.shop`:
- `GET /` serves the React SPA from `dist/client/index.html`.
- `GET /api/catalog/products` returns products from Express + Supabase backend.
- Mail OTPs route through Hostinger SMTP (`smtp.hostinger.com`).
