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
     - `DATABASE_URL`: `postgresql://neondb_owner:npg_1qwGudWJAz7y@ep-patient-rain-b48j6u4k-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
     - `JWT_SECRET`: *(auto-generated secure token)*

---

## 🛠️ Option B: Deploy Manually on Render Web Service

If you prefer configuring via the Render UI:

1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your Git repository.
3. Configure the following fields:
   - **Name**: `kunal-os`
   - **Region**: Select closest to your users (e.g. *Oregon / Frankfurt / Singapore*)
   - **Branch**: `main` (or your active branch)
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Instance Type**: `Free`
4. Under **Advanced** → **Environment Variables**, add:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = `postgresql://neondb_owner:npg_1qwGudWJAz7y@ep-patient-rain-b48j6u4k-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
   - `JWT_SECRET` = *(enter a long random 32+ character string)*
5. Click **Create Web Service**.

---

## 🛡️ Permanent Cloud Storage (Neon PostgreSQL)

KunalOS is connected to **Neon Serverless PostgreSQL**.
- **Permanent & Free Forever**: Your data will never expire or be deleted after 30 days.
- **Auto-Sync**: Any schema changes automatically sync on deployment.


---

## 🐳 Option C: Deploy with Docker Container

KunalOS includes a production multi-stage [`Dockerfile`](./Dockerfile):

1. In Render Dashboard, click **New +** → **Web Service**.
2. Choose **Docker** as the environment.
3. Render will build and run the container on port `3000`.

---

## 📱 Option D: Build Android APK (GitHub Actions)

KunalOS includes an automated **GitHub Actions CI/CD workflow** ([`.github/workflows/build-android-apk.yml`](./.github/workflows/build-android-apk.yml)):

1. **Automatic Build on Push**: Every time you push to `main` or `master`, GitHub Actions will build the web bundle, sync Capacitor Android assets, and compile the **Release/Debug APK** using Gradle.
2. **Manual Dispatch**: Go to your GitHub repository → **Actions** tab → **Build Android APK** → **Run workflow**.
3. **Download Artifact**: Once the action completes, download the **`KunalOS-Debug-APK`** zip containing `app-debug.apk` directly from the workflow run summary.

---

## 🔐 First Time Login

Once deployed:
- Visit your Render URL: `https://kunal-os-xxxx.onrender.com`
- Default Master PIN: **`1234`**
- Go to **Settings** to enroll your device's **Fingerprint / Biometric Passkey** or change the Master PIN.
