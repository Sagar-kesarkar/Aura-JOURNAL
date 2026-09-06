# Google Cloud Run Deployment Guide — Aura Journal

This guide provides step-by-step instructions for configuring, securing, deploying, and verifying **Aura Journal** on **Google Cloud Run** for the **Google Cloud Run Build & Deploy Social Challenge**.

---

## 1. Prerequisites

Before deployment, ensure you have:
1. A Google Cloud Platform (GCP) project with billing enabled.
2. The Google Cloud CLI (`gcloud`) installed and initialized:
   ```bash
   gcloud init
   gcloud auth login
   ```
3. Your active GCP project set:
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

---

## 2. Enable Google Cloud APIs

Enable the required GCP APIs:

```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  identitytoolkit.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

---

## 3. Provision Cloud Firestore & Security Rules

1. In the Google Cloud Console or Firebase Console, create a Cloud Firestore database in Native Mode:
   ```bash
   gcloud firestore databases create --location=nam5 --type=firestore-native
   ```

2. Deploy the owner-isolated security rules and indexes:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

---

## 4. Configure Google Cloud Secret Manager

Store your Gemini API key in Secret Manager and grant the Cloud Run runtime service account read access:

```bash
# 1. Create the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# 2. Add your secret version
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 3. Retrieve the GCP Project Number
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')

# 4. Grant the default compute service account access
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 5. Build and Deploy to Cloud Run

### Environment Variable Specification

| Variable Name | Classification | Environment | Required? | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | **Secret** | Production & Dev | **Required** for AI | Secret credential for Gemini API; injected via Secret Manager. |
| `GOOGLE_CLOUD_PROJECT` | **Configuration** | Production & Dev | **Required** in Prod | Google Cloud Project ID for Firebase Admin token verification. In dev/preview, discovered from `firebase-applet-config.json` if unset. |
| `ALLOWED_ORIGINS` | **Configuration** | Production | **Required** in Prod | Comma-separated list of exact permitted origins for CORS allowlist. |
| `GEMINI_MODEL` | **Configuration** | Production & Dev | **Required / Supplied** | Configured primary Gemini model identifier. Note: Live availability not yet verified until real API calls succeed. |
| `NODE_ENV` | **Configuration** | All | **Required** | Runtime environment mode (`production`, `development`, or `test`). |
| `GEMINI_FALLBACK_MODELS` | **Configuration** | Production & Dev | Optional | Optional comma-separated fallback models. If unset, uses only primary model. |
| `APP_URL` | **Configuration** | Production | Optional | Canonical application URL for metadata. Not used for CORS allowlists. |

Deploy the application from source with mandatory challenge labeling, environment configuration, and secret binding:

```bash
gcloud run deploy aura-journal \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID,ALLOWED_ORIGINS=https://your-cloud-run-domain,GEMINI_MODEL=gemini-3.8-flash,NODE_ENV=production" \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --labels="dev-tutorial=cloud-run-ai-challenge"
```

---

## 6. Mandatory Challenge Label Verification

To ensure your submission qualifies for the challenge automated verification, verify the resource label:

```bash
# Verify the label is present
gcloud run services describe aura-journal \
  --region=us-central1 \
  --format="value(metadata.labels['dev-tutorial'])"
```

**Expected output:**
```
cloud-run-ai-challenge
```

If the label is missing, update it immediately:
```bash
gcloud run services update aura-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 7. Post-Deployment Health Check & Verification

Once deployed, verify the public health endpoint:

```bash
SERVICE_URL=$(gcloud run services describe aura-journal --region=us-central1 --format='value(status.url)')

curl -s "${SERVICE_URL}/api/health" | jq .
```

**Expected response:**
```json
{
  "status": "ok",
  "service": "Aura Journal API",
  "authRequired": true,
  "timestamp": 1741165842000
}
```

Verify that protected endpoints reject unauthenticated requests:
```bash
curl -i -X POST "${SERVICE_URL}/api/gemini/reflect" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "test"}]}'
```

**Expected response:**
```http
HTTP/2 401
content-type: application/json; charset=utf-8

{"error":"Unauthorized: Missing or malformed authorization token"}
```
