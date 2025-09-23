## 🔖 Titolo PR
`feat|fix(scope): breve descrizione`

## ✅ Checklist Tecnica
- [ ] CHANGELOG.md aggiornato (se feature/fix visibile)
- [ ] API_REFERENCE.md aggiornato (endpoint, request/response, headers, error_code)
- [ ] SECURITY.md aggiornato (se cambia sicurezza o policy)
- [ ] MONITORING.md aggiornato (se cambiano metriche/alert/SLO)
- [ ] TESTS.md aggiornato (nuovi test di accettazione/sicurezza)
- [ ] DEPLOY.md aggiornato (se cambiano URL/env/feature flag)
- [ ] Tutti i test passano (unit, integrazione, e2e)
- [ ] ETag/Retry-After confermati sugli endpoint di status (se applicabile)
- [ ] Idempotency verificata (chiave uguale → stesso job_id; chiave uguale + body diverso → 409 con IDEMPOTENCY_VIOLATION)
- [ ] Webhook firmati con X-Signature/X-Timestamp testati (happy path + firma invalida)

## 📂 Scope Cambiato
- [ ] Backend (routes, schema, error envelope)
- [ ] Frontend (client API, UI/UX messaggi)
- [ ] Solo docs (no code)

## 📝 Note Addizionali
(aggiungi qui dettagli, link a ticket o screenshot)
