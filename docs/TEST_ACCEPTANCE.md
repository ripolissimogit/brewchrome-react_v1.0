# Test di Accettazione

> Lista test obbligatori che DEVONO passare prima del deploy

## A1: JSON con 1 URL → 200 image/png
**Status**: ⏳ Da implementare

## A2: Multipart 2 file → 200 con palette  
**Status**: ⏳ Da implementare
**Atteso**: ZIP con palette = 10 colori e social_image non vuoti

## A3: ZIP con 3 immagini → 200 con risultati
**Status**: ⏳ Da implementare
**Atteso**: results[] con 3 elementi, ognuno con palette = 10 colori e social_image presente

## A4: Nessun input → 400
**Status**: ⏳ Da implementare
**Formato**: JSON con success:false

## A5: URL timeout → 408
**Status**: ⏳ Da implementare
**Formato**: JSON con success:false

## A6: ZIP path traversal → 400
**Status**: ⏳ Da implementare
**Formato**: JSON con success:false

## A7: Immagine troppo grande → 413
**Status**: ⏳ Da implementare
**Formato**: JSON con success:false

## Test Runner
```bash
# Esegui tutti i test di accettazione
npm run test:acceptance

# Test singolo
npm run test:acceptance -- --test A1
```

---
*Definition of Done: tutti i test A1-A7 devono essere ✅*
