# BrewChrome React v1.0 - Documentazione Completa

## 📋 Indice

- [Panoramica](#panoramica)
- [Architettura](#architettura)
- [Backend](#backend)
- [Frontend](#frontend)
- [Installazione](#installazione)
- [Dipendenze](#dipendenze)
- [Qualità del Codice](#qualità-del-codice)
- [CSS e Styling](#css-e-styling)
- [Deploy](#deploy)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## 🎯 Panoramica

BrewChrome è un'applicazione web per l'estrazione di palette colori da immagini, con funzionalità avanzate di batch processing, generazione di immagini social e download organizzato.

### Caratteristiche Principali

- ✅ Estrazione palette colori con AI
- ✅ Upload singolo e batch (ZIP)
- ✅ Generazione immagini social (1080x720px)
- ✅ Gallery con thumbnails
- ✅ Modal fullscreen con navigazione
- ✅ Download ZIP organizzato
- ✅ Logging completo
- ✅ Sistema di qualità enterprise

### Stack Tecnologico

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Python Flask + Google Cloud Run
- **Deploy**: Vercel (Frontend) + Google Cloud (Backend)
- **Quality**: ESLint + Prettier + Vitest + Husky

## 🏗️ Architettura

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │───▶│   Backend API    │───▶│  PaletteEngine  │
│   (Vercel)      │    │ (Google Cloud)   │    │   (Core Logic)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Upload   │    │   Image Process  │    │  Color Extract  │
│   Gallery/Modal │    │   ZIP Handling   │    │  Social Images  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Flusso Dati

1. **Upload**: File → Base64 → API
2. **Processing**: PaletteEngine → Color extraction
3. **Response**: Palette + Social image
4. **Display**: Gallery → Modal → Download

## 🐍 Backend

### Struttura

```
backend-react/
├── main.py              # Flask app principale
├── core/
│   ├── palette_engine.py        # Core business logic
│   └── enhanced_palette_generator.py  # Social image generation
├── requirements.txt     # Dipendenze Python
├── Dockerfile          # Container config
└── Procfile           # Deploy config
```

### Componenti Principali

#### 1. Flask Application (main.py)

```python
# Endpoints principali
GET  /health           # Health check
POST /process          # Elaborazione immagine singola
POST /fetch_url        # Elaborazione da URL
POST /process_zip      # Elaborazione batch ZIP
```

#### 2. PaletteEngine (core/palette_engine.py)

- **Estrazione colori**: ColorThief algorithm
- **Validazione input**: Formati supportati (PNG, JPG, JPEG, WebP)
- **Error handling**: Gestione errori robusto
- **Logging**: Tracciamento operazioni

#### 3. Enhanced Palette Generator (core/enhanced_palette_generator.py)

- **Social Images**: Generazione 1080x720px (3:2 ratio)
- **Layout**: 75% immagine originale + 25% palette strip
- **Smart Crop**: Ridimensionamento intelligente
- **Borders**: Bordi uniformi 8px bianchi

### Dipendenze Backend

```txt
Flask==3.0.0           # Web framework
Pillow==10.0.1         # Image processing
colorthief==0.2.1      # Color extraction
flask-cors==4.0.0      # CORS handling
gunicorn==21.2.0       # WSGI server
```

### Configurazione

```python
# Environment variables
PORT = os.environ.get('PORT', 8080)
DEBUG = os.environ.get('DEBUG', False)
CORS_ORIGINS = ['https://brewchrome-react-v1-0-*.vercel.app']
```

## ⚛️ Frontend

### Struttura

```
src/
├── components/          # Componenti React
│   ├── ui/             # Shadcn/ui components
│   ├── ImageUploader.tsx
│   ├── Gallery.tsx
│   ├── Modal.tsx
│   ├── PaletteDisplay.tsx
│   ├── LoadingSpinner.tsx
│   └── ErrorMessage.tsx
├── services/           # Business logic
│   ├── api.ts         # API client
│   ├── download.ts    # Download utilities
│   └── logger.ts      # Logging system
├── types.ts           # TypeScript definitions
├── App.tsx           # Main component
└── main.tsx          # Entry point
```

### Componenti Principali

#### 1. ImageUploader

- **Drag & Drop**: Interfaccia intuitiva
- **File Validation**: Controllo formati e dimensioni
- **Compression**: Auto-compress >2MB → max 1920x1080
- **Multi-upload**: Supporto batch processing

#### 2. Gallery

- **Thumbnails**: Preview immagini elaborate
- **Horizontal Scroll**: Navigazione touch/mouse
- **Click Handler**: Apertura modal

#### 3. Modal

- **Fullscreen**: Visualizzazione completa
- **Keyboard Navigation**: Frecce ←→ per navigare
- **Palette Display**: Colori con codici HEX/RGB
- **Download**: Singolo e batch

#### 4. API Service

```typescript
// Endpoints
health(): Promise<HealthResponse>
processImage(file: File): Promise<ProcessResponse>
processZip(file: File): Promise<ProcessResponse>
fetchUrl(url: string): Promise<ProcessResponse>
```

#### 5. Download Service

- **JSZip Integration**: Creazione ZIP dinamici
- **Organization**: Cartelle per tipo (original, social, palette)
- **Naming**: Timestamp + filename conventions
- **Progress**: Feedback utente

### State Management

```typescript
// App State
const [images, setImages] = useState<ProcessedImage[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [modalIndex, setModalIndex] = useState<number | null>(null);
```

## 🚀 Installazione

### Prerequisiti

- Node.js 18+
- npm/yarn
- Python 3.9+ (per backend locale)
- Git

### Setup Completo

#### 1. Clone Repository

```bash
git clone <repository-url>
cd brewchrome-react_v1.0
```

#### 2. Frontend Setup

```bash
# Installa dipendenze
npm install

# Setup quality tools
npm run prepare

# Avvia development server
npm run dev
```

#### 3. Backend Setup (Opzionale - per sviluppo locale)

```bash
cd backend-react

# Virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Installa dipendenze
pip install -r requirements.txt

# Avvia server
python main.py
```

#### 4. Environment Variables

```bash
# Frontend (.env.local)
VITE_API_BASE_URL=https://brewchrome-backend-736130833520.us-central1.run.app

# Backend (.env)
PORT=8080
DEBUG=false
CORS_ORIGINS=https://brewchrome-react-v1-0-*.vercel.app
```

## 📦 Dipendenze

### Frontend Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.468.0",
    "@headlessui/react": "^2.2.0",
    "@heroicons/react": "^2.2.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.4"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@types/node": "^22.10.2",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "~5.6.2",
    "vite": "^7.1.7",
    "tailwindcss": "^3.4.17",
    "eslint": "^9.15.0",
    "prettier": "^3.4.2",
    "vitest": "^3.2.4",
    "husky": "^9.1.7",
    "lint-staged": "^15.2.11"
  }
}
```

### Shadcn/ui Components

```bash
# Installati
npx shadcn@latest add button card

# Disponibili
npx shadcn@latest add input textarea select dialog alert
```

### Backend Dependencies

```txt
Flask==3.0.0
Pillow==10.0.1
colorthief==0.2.1
flask-cors==4.0.0
gunicorn==21.2.0
requests==2.31.0
```

## 🔍 Qualità del Codice

### Tools Installati

#### 1. ESLint + Security

```javascript
// eslint.config.js
export default defineConfig([
  {
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
      security.configs.recommended, // Security rules
    ],
  },
]);
```

#### 2. Prettier

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

#### 3. TypeScript

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

#### 4. Vitest + React Testing Library

```typescript
// vitest.config.ts
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

#### 5. Husky + Lint-Staged

```bash
# .husky/pre-commit
npx lint-staged
```

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

### Scripts di Qualità

#### Basic Quality

```bash
npm run type-check    # TypeScript validation
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm run format       # Prettier format
npm run test:run     # Run tests
```

#### Advanced Quality

```bash
npm run security     # npm audit
npm run spell        # cspell check
npm run unused       # ts-prune unused code
npm run circular     # madge circular deps
npm run bundle-analyze # vite-bundle-visualizer
```

#### Quality Pipelines

```bash
npm run quality      # Basic pipeline
npm run quality:full # Complete pipeline
npm run pre-deploy   # Pre-production checks
```

### Quality Metrics

- **Type Safety**: 100% TypeScript coverage
- **Code Style**: Prettier + ESLint rules
- **Security**: eslint-plugin-security warnings
- **Testing**: Vitest + React Testing Library
- **Bundle**: Analyzed with vite-bundle-visualizer
- **Dependencies**: Checked with depcheck

## 🎨 CSS e Styling

### Sistema di Design

#### 1. Tailwind CSS

```javascript
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#f0f9ff', 500: '#3b82f6', 600: '#2563eb' },
        gray: { 50: '#f9fafb', 900: '#111827' },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
    },
  },
};
```

#### 2. Shadcn/ui System

```css
/* src/index.css - CSS Variables */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96%;
  --muted: 210 40% 96%;
  --border: 214.3 31.8% 91.4%;
  --radius: 0.5rem;
}
```

#### 3. Component Classes

```css
/* Utility Classes */
.btn {
  @apply inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors;
}

.card {
  @apply rounded-lg border bg-white text-gray-950 shadow-sm;
}
```

### Layout System

#### 1. Responsive Design

```typescript
// Max-width constraint
<div className="max-w-4xl mx-auto px-4 py-8">

// Grid system
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Flexbox utilities
<div className="flex items-center justify-center gap-3">
```

#### 2. Color Palette

```css
/* Primary Colors */
text-primary      /* Blue 500 */
bg-primary        /* Blue 500 */
hover:bg-primary  /* Blue 600 */

/* Neutral Colors */
text-muted-foreground  /* Gray 500 */
bg-background         /* White */
border               /* Gray 200 */
```

#### 3. Spacing System

```css
/* Consistent spacing */
space-y-8    /* Vertical spacing */
gap-3        /* Grid/flex gap */
px-4 py-8    /* Padding */
mb-8         /* Margin bottom */
```

### Component Styling

#### 1. Cards

```typescript
<Card className="p-6">           // Padding
<Card className="border-2">      // Border
<Card className="shadow-lg">     // Shadow
```

#### 2. Buttons

```typescript
<Button variant="default">       // Primary style
<Button variant="secondary">     // Secondary style
<Button size="sm">              // Small size
```

#### 3. Typography

```css
text-3xl font-bold              /* Headings */
text-muted-foreground          /* Descriptions */
text-sm                        /* Small text */
```

## 🚀 Deploy

### Frontend (Vercel)

#### 1. Configurazione

```json
// vercel.json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://brewchrome-backend-736130833520.us-central1.run.app/$1"
    }
  ]
}
```

#### 2. Build Settings

```bash
# Build Command
npm run build

# Output Directory
dist

# Install Command
npm install
```

#### 3. Environment Variables

```bash
VITE_API_BASE_URL=https://brewchrome-backend-736130833520.us-central1.run.app
```

### Backend (Google Cloud Run)

#### 1. Dockerfile

```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8080
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "main:app"]
```

#### 2. Deploy Command

```bash
gcloud run deploy brewchrome-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### URLs di Produzione

- **Frontend**: https://brewchrome-react-v1-0-il0bb0iqo-ripolissimos-projects.vercel.app
- **Backend**: https://brewchrome-backend-736130833520.us-central1.run.app

## 📚 API Reference

### Endpoints

#### GET /health

```typescript
Response: {
  status: "healthy",
  service: "brewchrome-backend",
  version: "3.1.1",
  features: ["colorthief", "zip_processing"]
}
```

#### POST /process

```typescript
Request: {
  image: string  // Base64 data URL
}

Response: {
  success: boolean,
  palette: number[][], // [[r,g,b], ...]
  social_image: string, // Base64 data URL
  error?: string
}
```

#### POST /process_zip

```typescript
Request: {
  zip_file: string  // Base64 ZIP data
}

Response: {
  success: boolean,
  results: ProcessResult[],
  error?: string
}
```

#### POST /fetch_url

```typescript
Request: {
  url: string  // Image URL
}

Response: {
  success: boolean,
  palette: number[][],
  social_image: string,
  error?: string
}
```

### Error Handling

```typescript
// Common errors
{
  success: false,
  error: "division by zero"        // Image too small
  error: "Invalid image format"    // Unsupported format
  error: "File too large"         // >10MB limit
  error: "Network timeout"        // Connection issues
}
```

## 🧪 Testing

### Test Structure

```
src/
├── App.test.tsx           # Main app tests
├── test/
│   └── setup.ts          # Test configuration
└── components/
    └── *.test.tsx        # Component tests
```

### Test Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

### Test Examples

```typescript
// App.test.tsx
describe('App', () => {
  it('renders BrewChrome title', () => {
    render(<App />);
    expect(screen.getByText('BrewChrome')).toBeDefined();
  });

  it('renders upload area', () => {
    render(<App />);
    expect(screen.getByText(/drop images/i)).toBeDefined();
  });
});
```

### Running Tests

```bash
npm run test        # Watch mode
npm run test:run    # Single run
npm run test:ui     # UI mode
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Build Errors

```bash
# TypeScript errors
npm run type-check

# ESLint errors
npm run lint:fix

# Import/export issues
# Check default vs named exports
```

#### 2. API Errors

```bash
# Backend connection
curl https://brewchrome-backend-736130833520.us-central1.run.app/health

# CORS issues
# Check vercel.json rewrites

# Format compatibility
# Backend returns [[r,g,b]], frontend expects {r,g,b}
```

#### 3. Deploy Issues

```bash
# Vercel build logs
npx vercel logs <deployment-url>

# Environment variables
# Check VITE_API_BASE_URL

# Dependencies
npm audit
npm run depcheck
```

#### 4. Styling Issues

```bash
# Tailwind not working
npm run build  # Check if CSS is generated

# Shadcn components
# Check path alias in tsconfig.json

# Missing styles
# Verify @tailwind directives in CSS
```

### Debug Commands

```bash
# Quality check
npm run quality

# Bundle analysis
npm run bundle-analyze

# Dependency check
npm run depcheck

# Security audit
npm run security
```

### Performance Optimization

```bash
# Bundle size
npm run bundle-analyze

# Unused code
npm run unused

# Circular dependencies
npm run circular
```

---

## 📝 Note Finali

### Versioning

- **Current**: v1.0
- **React**: 18.3.1
- **TypeScript**: 5.6.2
- **Vite**: 7.1.7

### Maintenance

- **Dependencies**: Aggiornare mensilmente
- **Security**: npm audit settimanale
- **Quality**: Pre-commit hooks attivi
- **Testing**: Coverage >80%

### Future Improvements

- [ ] Unit test coverage completa
- [ ] E2E testing con Playwright
- [ ] PWA capabilities
- [ ] Dark mode support
- [ ] Internazionalizzazione (i18n)

---

**Documentazione aggiornata**: 23 Settembre 2025
**Versione**: 1.0.0
**Autore**: BrewChrome Team
