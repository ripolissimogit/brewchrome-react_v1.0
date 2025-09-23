# Backend API Specification

> API reali e contratti consolidati - Versione corrente implementata

## Endpoints

### GET /health
### POST /process  
### POST /process_zip
### POST /fetch_url

## Request/Response Contracts

### POST /process_zip
**Nota importante:** `/api/process_zip` restituisce ora `results[]` con `{filename, palette, social_image}` per ogni immagine, oltre ai campi riassuntivi (`processed_count`, `total_files`).

## Error Handling

## Security & Validation

## Performance Limits

### Limiti attuali
- Palette = 10 colori fissi (array di 10 [r,g,b], non configurabile)

---
*Documento da completare con specifiche tecniche dettagliate*
