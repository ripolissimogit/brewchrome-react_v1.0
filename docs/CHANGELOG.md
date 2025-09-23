# Changelog

> Aggiornamenti documentazione e decisioni architetturali

## [1.0.0] - 2025-09-23

### Added
- ✅ Struttura documentazione iniziale
- ✅ Specifica funzionale completa
- ✅ Schema cartelle docs/
- ✅ Template per tutti i documenti

### Technical Decisions
- **Stack**: React + Flask + ColorThief
- **Deploy**: Vercel (frontend) + Google Cloud Run (backend)  
- **Quality**: ESLint + Prettier + Vitest + Husky
- **UI**: Shadcn/ui + Tailwind CSS

### Architecture
- Monolite backend sincrono (v1.x)
- Stateless processing
- No persistent storage
- Auto-scaling ready

---

## Template Entry
```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
### Changed  
### Fixed
### Removed
### Security
### Technical Decisions
```
