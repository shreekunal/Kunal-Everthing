# KunalOS — Production Deployment Guide for Render

This guide walks you through deploying **KunalOS** to [Render](https://render.com) for production.

---

## 🚀 Option A: Deploy with Render Blueprint (`render.yaml`) (Recommended)

1. **Push your code to GitHub / GitLab**:
   ```bash
   git add .
   git commit -m "Prepare KunalOS for production deployment on Render"
   git push origin main
   ```

2. **Connect to Render**:
   - Log in to your [Render Dashboard](https://dashboard.render.com).
   - Click **New +** → **Blueprint**.
   - Select your repository (`KunalOS`).
   - Render will automatically detect [`render.yaml`](./render.yaml).
   - Click **Apply**.

3. **Render Builds & Deploys Automatically**:
   - **Build Command**: `npm install && npm run build` (runs Prisma client generation + schema synchronization + Next.js build).
   - **Start Command**: `npm run start`.
   - **Environment Variables**:
     - `NODE_ENV`: `production`
     - `DATABASE_URL`: `file:./dev.db`
     - `JWT_SECRET`: *(auto-generated secure token)*

---

## 🛠️ Option B: Deploy Manually on Render Web Service

If you prefer configuring via the Render UI:

1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your Git repository.
3. Configure the following fields:
   - **Name**: `kunal-os`
   - **Region**: Select closest to your users (e.g. *Singapore / Oregon / Frankfurt*)
   - **Branch**: `main` (or your active branch)
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Instance Type**: `Free` (or `Starter` for persistent disk)
4. Under **Advanced** → **Environment Variables**, add:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = `file:./dev.db`
   - `JWT_SECRET` = *(enter a long random 32+ character string)*
5. Click **Create Web Service**.

---

## 💾 Optional: Persistent Storage on Render (Disks)

Render Free Tier has an ephemeral file system. If you want your local SQLite database file to persist across instance sleep cycles:

1. Upgrade the instance to **Starter** ($7/mo).
2. Go to **Disks** → **Add Disk**:
   - **Name**: `kunal-os-data`
   - **Mount Path**: `/var/data`
   - **Size**: `1 GB`
3. Update Environment Variable:
   - `DATABASE_URL` = `file:/var/data/dev.db`

*(Alternatively, you can connect an external cloud database like Neon Postgres or Turso SQLite by setting `DATABASE_URL`)*.

---

## 🐳 Option C: Deploy with Docker Container

KunalOS includes a production multi-stage [`Dockerfile`](./Dockerfile):

1. In Render Dashboard, click **New +** → **Web Service**.
2. Choose **Docker** as the environment.
3. Render will build and run the container on port `3000`.

---

## 🔐 First Time Login

Once deployed:
- Visit your Render URL: `https://kunal-os-xxxx.onrender.com`
- Default Master PIN: **`1234`**
- Go to **Settings** to enroll your device's **Fingerprint / Biometric Passkey** or change the Master PIN.
