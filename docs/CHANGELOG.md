# Changelog

> Aggiornamenti documentazione e decisioni architetturali

## [1.1.0] - 2025-09-23

### Added
- ✅ ZIP processing con social images complete
- ✅ Backend endpoint `/process_zip` restituisce `results[]` dettagliato
- ✅ Ogni immagine ZIP ha `{filename, palette, social_image}`
- ✅ Fallback robusti per preview sempre visibili
- ✅ Download validation con error handling

### Changed
- 🔄 **Breaking:** `/process_zip` response format aggiornato
- 🔄 Limiti ZIP: 500MB (era 100MB), path traversal protection
- 🔄 Frontend usa backend deployato su Cloud Run

### Fixed
- 🐛 Division by zero per immagini 1x1 pixel
- 🐛 RGBA → JPEG conversion con background bianco
- 🐛 Smart crop fallback per immagini piccole
- 🐛 ColorThief triple fallback con colori default

### Technical Decisions
- **Backend URL:** `https://brewchrome-backend-736130833520.us-central1.run.app`
- **ZIP Response:** Array `results[]` con social images individuali
- **Palette:** Sempre 10 colori fissi [r,g,b] non configurabile
- **Fallbacks:** Original image → placeholder → error handling

---

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
