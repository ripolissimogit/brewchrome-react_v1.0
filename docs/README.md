# BrewChrome React v1.1 - Documentation

**Status:** Production Ready  
**Last Updated:** 2025-09-23  
**Security Level:** Enterprise-Grade  

## Overview

BrewChrome React è un sistema di estrazione palette colori con backend Flask e frontend React, ottimizzato per elaborazione batch asincrona e deployment cloud-native.

## Architecture

- **Backend:** Flask + PaletteEngine core, deployed su Google Cloud Run
- **Frontend:** React + TypeScript, deployed su Vercel  
- **Processing:** Async job system con worker threads
- **Security:** HMAC signatures, replay protection, idempotency
- **Monitoring:** Prometheus metrics, structured logging

## Documentation Structure

### Core Documentation
- [`CHANGELOG.md`](./CHANGELOG.md) - Version history e release notes
- [`SECURITY.md`](./SECURITY.md) - Security posture e hardening measures
- [`ROADMAP.md`](./ROADMAP.md) - Feature roadmap e technical backlog

### Technical Reference  
- [`API_REFERENCE.md`](./API_REFERENCE.md) - Complete API schema con esempi
- [`TESTS.md`](./TESTS.md) - Test coverage e acceptance criteria
- [`DEPLOY.md`](./DEPLOY.md) - Deployment guide e environment config
- [`MONITORING.md`](./MONITORING.md) - Metrics, SLOs, e alerting

### Reports Archive
- [`reports/`](./reports/) - Milestone reports e technical assessments
  - [`security_hardening_v1.1.md`](./reports/security_hardening_v1.1.md) - Latest security improvements
  - [`job_system_v1.0.md`](./reports/job_system_v1.0.md) - Async job system implementation

## Quick Start

### Development
```bash
# Backend
cd backend-react && python -m flask run

# Frontend  
npm run dev
```

### Production URLs
- **Backend:** https://brewchrome-backend-736130833520.us-central1.run.app
- **Frontend:** https://brewchrome-react-v1-0-9reqql992-ripolissimos-projects.vercel.app
- **Metrics:** https://brewchrome-backend-736130833520.us-central1.run.app/metrics

## Support

- **Issues:** GitHub Issues
- **Security:** See [SECURITY.md](./SECURITY.md)
- **Monitoring:** See [MONITORING.md](./MONITORING.md)
