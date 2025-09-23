# GitHub Repository Secrets

Required secrets for CI/CD workflows and automated testing.

## Production Environment

### BACKEND_URL
- **Value:** `https://brewchrome-backend-736130833520.us-central1.run.app`
- **Usage:** Production smoke tests, health checks
- **Workflows:** `prod-smoke.yml`

## Setup Instructions

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add the following secrets:

```
Name: BACKEND_URL
Value: https://brewchrome-backend-736130833520.us-central1.run.app
```

## Security Notes

- Secrets are encrypted and only available to workflows
- Never log secret values in workflow outputs
- Use secrets only for non-sensitive configuration (URLs, not API keys)
- For sensitive data, use GitHub's encrypted secrets properly

## Validation

Verify secrets are working by running the smoke test workflow:
1. Go to **Actions** tab
2. Select **prod-smoke** workflow  
3. Click **Run workflow** → **Run workflow**
4. Check that all steps pass with green checkmarks
