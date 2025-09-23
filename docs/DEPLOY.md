# Deployment Guide

**Current Environment:** Production  
**Backend Platform:** Google Cloud Run  
**Frontend Platform:** Vercel  
**Last Deploy:** 2025-09-23  

## Production URLs

### Backend
- **Service URL:** `https://brewchrome-backend-736130833520.us-central1.run.app`
- **Health Check:** `https://brewchrome-backend-736130833520.us-central1.run.app/health`
- **Metrics:** `https://brewchrome-backend-736130833520.us-central1.run.app/metrics`
- **Current Revision:** `brewchrome-backend-00027-hpv`

### Frontend
- **Application URL:** `https://brewchrome-react-v1-0-9reqql992-ripolissimos-projects.vercel.app`
- **Status:** Active
- **Framework:** React + TypeScript + Vite

## Backend Deployment (Google Cloud Run)

### Prerequisites
```bash
# Install Google Cloud SDK
gcloud auth login
gcloud config set project brewchrome-endurance-002

# Docker (for local testing)
docker --version
```

### Deployment Commands
```bash
# Navigate to backend directory
cd backend-react

# Deploy to Cloud Run
gcloud run deploy brewchrome-backend \
  --source . \
  --region=us-central1 \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --timeout=120 \
  --clear-base-image
```

### Configuration
```yaml
# Cloud Run Service Configuration
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: brewchrome-backend
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/memory: "1Gi"
        run.googleapis.com/cpu: "1"
        run.googleapis.com/timeout: "120s"
    spec:
      containers:
      - image: gcr.io/brewchrome-endurance-002/brewchrome-backend
        ports:
        - containerPort: 8080
        env:
        - name: PORT
          value: "8080"
        - name: WEBHOOK_SECRET
          value: "brewchrome-default-secret"
        - name: REQUIRE_SIGNATURE
          value: "false"
```

## Frontend Deployment (Vercel)

### Prerequisites
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login
```

### Deployment Commands
```bash
# Build and deploy
npm run build
vercel --prod

# Or automatic deployment via Git
git push origin main  # Triggers automatic deployment
```

### Configuration
```json
// vercel.json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "env": {
    "VITE_API_BASE_URL": "https://brewchrome-backend-736130833520.us-central1.run.app"
  }
}
```

## Environment Variables

### Backend (Cloud Run)
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP server port |
| `WEBHOOK_SECRET` | `brewchrome-default-secret` | HMAC signing key |
| `REQUIRE_SIGNATURE` | `false` | Enable signature validation |
| `PYTHONPATH` | `/app` | Python module path |

### Frontend (Vercel)
| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_API_BASE_URL` | Backend URL | API endpoint base |
| `NODE_VERSION` | `18.x` | Node.js runtime version |

## Infrastructure

### Google Cloud Run
- **Region:** us-central1
- **Memory:** 1GB
- **CPU:** 1 vCPU
- **Timeout:** 120 seconds
- **Concurrency:** 80 requests per instance
- **Min Instances:** 0 (scales to zero)
- **Max Instances:** 100

### Vercel
- **Framework:** Vite (React)
- **Node Version:** 18.x
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Edge Network:** Global CDN

## Scaling Configuration

### Backend Auto-scaling
```yaml
# Cloud Run automatically scales based on:
- Request volume
- CPU utilization
- Memory usage
- Custom metrics (future)

# Scaling parameters:
minScale: 0          # Scale to zero when idle
maxScale: 100        # Maximum instances
concurrency: 80      # Requests per instance
```

### Frontend CDN
```yaml
# Vercel Edge Network:
- Global CDN distribution
- Automatic cache invalidation
- Edge functions (if needed)
- DDoS protection
```

## Monitoring & Health Checks

### Backend Health Checks
```bash
# Liveness probe
curl https://brewchrome-backend-736130833520.us-central1.run.app/health

# Readiness probe  
curl https://brewchrome-backend-736130833520.us-central1.run.app/ready

# Metrics endpoint
curl https://brewchrome-backend-736130833520.us-central1.run.app/metrics
```

### Frontend Monitoring
```bash
# Application status
curl -I https://brewchrome-react-v1-0-9reqql992-ripolissimos-projects.vercel.app

# Vercel deployment status
vercel ls
```

## CI/CD Pipeline

### Current Process
1. **Development**: Local testing
2. **Commit**: Git push to main branch
3. **Backend Deploy**: Manual `gcloud run deploy`
4. **Frontend Deploy**: Automatic via Vercel Git integration
5. **Verification**: Health check validation

### Planned Improvements (v1.2)
```yaml
# GitHub Actions workflow
name: Deploy
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Run tests
      run: npm test
  
  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - name: Deploy to Cloud Run
      run: gcloud run deploy ...
  
  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - name: Deploy to Vercel
      run: vercel --prod
```

## Rollback Procedures

### Backend Rollback
```bash
# List recent revisions
gcloud run revisions list --service=brewchrome-backend --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic brewchrome-backend \
  --to-revisions=brewchrome-backend-00026-j54=100 \
  --region=us-central1
```

### Frontend Rollback
```bash
# Via Vercel dashboard or CLI
vercel rollback [deployment-url]

# Or redeploy previous Git commit
git revert HEAD
git push origin main
```

## Security Considerations

### Network Security
- **HTTPS Only**: All traffic encrypted in transit
- **CORS**: Configured for frontend domain
- **Private IPs**: Blocked in URL fetching
- **Firewall**: Cloud Run default protections

### Secrets Management
- **Environment Variables**: Stored in platform configs
- **HMAC Keys**: Configurable via env vars
- **API Keys**: Not currently used
- **Certificates**: Managed by platforms

## Disaster Recovery

### Backup Strategy
- **Code**: Git repository (GitHub)
- **Configuration**: Infrastructure as Code (planned)
- **Data**: Stateless application (no persistent data)
- **Logs**: Platform-managed retention

### Recovery Procedures
1. **Service Outage**: Automatic platform recovery
2. **Region Failure**: Manual redeploy to different region
3. **Data Loss**: No persistent data to recover
4. **Configuration Loss**: Redeploy from Git

## Cost Optimization

### Current Costs
- **Cloud Run**: Pay-per-request, scales to zero
- **Vercel**: Free tier for current usage
- **Bandwidth**: Minimal due to ETag caching
- **Storage**: Temporary files only

### Optimization Strategies
- **ETag Caching**: Reduces bandwidth costs
- **Scale to Zero**: No idle compute costs
- **CDN**: Vercel edge caching
- **Compression**: Gzip responses

## Troubleshooting

### Common Issues

#### Backend Not Responding
```bash
# Check service status
gcloud run services describe brewchrome-backend --region=us-central1

# View logs
gcloud logs read "resource.type=cloud_run_revision" --limit=50

# Check health endpoint
curl https://brewchrome-backend-736130833520.us-central1.run.app/health
```

#### Frontend Build Failures
```bash
# Check Vercel deployment logs
vercel logs [deployment-url]

# Local build test
npm run build

# Check environment variables
vercel env ls
```

#### Performance Issues
```bash
# Check metrics
curl https://brewchrome-backend-736130833520.us-central1.run.app/metrics

# Monitor Cloud Run metrics in GCP Console
# Check Vercel analytics dashboard
```

### Support Contacts
- **Platform Issues**: Google Cloud Support, Vercel Support
- **Application Issues**: Development team
- **Security Issues**: security@brewchrome.com
