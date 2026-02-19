# CCS Yacht Frontend

## Project Overview

Dit is de frontend applicatie voor CCS Yacht, gebouwd met Next.js 16 en React 19.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI Library:** React 19
- **Styling:** Tailwind CSS 4
- **Language:** TypeScript 5
- **Linting:** ESLint 9
- **i18n:** next-intl (EN/NL)
- **Theme:** next-themes (light/dark)

## Project Structure

```
app/
  [locale]/          # Locale-specifieke pagina's
    layout.tsx       # Layout met NextIntlClientProvider
    page.tsx         # Home pagina
    login/
      page.tsx
    register/
      page.tsx
  components/        # Shared componenten
  context/           # React contexts (Auth)
  globals.css
  layout.tsx         # Root layout
i18n/
  routing.ts         # Locale configuratie
  request.ts         # Server-side i18n config
  navigation.ts      # Locale-aware Link, useRouter, etc.
messages/
  en.json            # Engelse vertalingen
  nl.json            # Nederlandse vertalingen
public/              # Statische bestanden
```

## Commands

```bash
npm run dev    # Start development server
npm run build  # Build voor productie
npm run start  # Start productie server
npm run lint   # Run ESLint
```

## Development Guidelines

### Code Style

- Gebruik TypeScript voor alle nieuwe bestanden
- Volg de ESLint configuratie (`eslint.config.mjs`)
- Gebruik functionele componenten met hooks
- Gebruik de `@/*` path alias voor imports (bijv. `@/app/components`)

### Component Hergebruik (BELANGRIJK)

**Voordat je een nieuw component maakt, controleer altijd:**

1. **Bestaat er al een vergelijkbaar component?**
   - Check `app/components/ui/` voor herbruikbare UI componenten
   - Check of een bestaand component uitgebreid kan worden

2. **Kan een bestaand component generiek gemaakt worden?**
   - Voeg props toe in plaats van een nieuw component te maken
   - Gebruik composition pattern (children prop)

3. **Herbruikbare componenten in `app/components/ui/`:**
   - `Modal.tsx` - Basis modal met customizable content
   - `StatusBadge.tsx` - Status badges (setup, active, locked, completed)
   - `ProgressCircle.tsx` - Circulaire voortgangsindicator
   - `ProjectCard.tsx` - Project kaart
   - `SearchInput.tsx` - Zoekbalk met icoon
   - `FilterTabs.tsx` - Filter tabs/buttons

4. **Pattern voor nieuwe UI componenten:**
   - Maak ze generiek en herbruikbaar
   - Plaats ze in `app/components/ui/`
   - Gebruik props voor customization
   - Documenteer de props met TypeScript interfaces

### Component Naming

- Componenten: PascalCase (bijv. `UserProfile.tsx`)
- Utilities/hooks: camelCase (bijv. `useAuth.ts`)
- Pages: `page.tsx` in de juiste route folder

### Styling

- Gebruik Tailwind CSS utility classes
- Vermijd inline styles in components, plaats ze in globals.css
- Globale styles in `app/globals.css`

### Internationalisatie (i18n)

**Belangrijk:** Alle tekst in de UI moet vertaald worden via next-intl.

1. **Nieuwe pagina's maken:**
   - Plaats pagina's in `app/[locale]/` folder
   - Gebruik `useTranslations()` hook voor vertalingen

2. **Vertalingen toevoegen:**
   - Voeg keys toe aan `messages/en.json` en `messages/nl.json`
   - Gebruik geneste structuur: `{ "section": { "key": "value" } }`

3. **Links in componenten:**
   - Gebruik `Link` van `@/i18n/navigation` (niet van `next/link`)
   - Gebruik `useRouter` van `@/i18n/navigation` voor programmatische navigatie

4. **Voorbeeld:**
```tsx
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function MyPage() {
  const t = useTranslations('mySection');

  return (
    <div>
      <h1>{t('title')}</h1>
      <Link href="/other-page">{t('linkText')}</Link>
    </div>
  );
}
```

### Git Workflow

- Commit messages in het Engels
- Branch naming: `feature/`, `fix/`, `chore/`

## Environment Variables

Maak een `.env.local` bestand aan voor lokale development:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Docker

Start de applicatie met Docker:

```bash
docker compose up        # Development mode
docker compose up --build # Rebuild en start
```
