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
   - `Modal.tsx` - Basis modal met blur backdrop, ESC sluit, footer support
   - `FormInput.tsx` - Input veld met label, error, hint support
   - `Button.tsx` - Button met variants (primary, secondary, danger, etc.) en loading state
   - `Alert.tsx` - Alert messages (error, success, info, warning)
   - `Toast.tsx` - Toast notificaties (gebruik via `useToast()` hook)
   - `StatusBadge.tsx` - Status badges (setup, active, locked, completed)
   - `ProgressCircle.tsx` - Circulaire voortgangsindicator
   - `ProjectCard.tsx` - Project kaart
   - `SearchInput.tsx` - Zoekbalk met icoon
   - `FilterTabs.tsx` - Filter tabs/buttons
   - `ProfileInfoItem.tsx` - Profiel informatie item met icon en optionele change knop

   **Toast gebruik:**
   ```tsx
   import { useToast } from "@/app/context/ToastContext";

   const { showToast } = useToast();
   showToast("success", "Actie geslaagd!");
   showToast("error", "Er ging iets mis");
   ```

4. **Modal componenten - BELANGRIJK PATROON:**
   - **NOOIT nieuwe modal wrapper componenten maken** (zoals DeleteConfirmModal, etc.)
   - Gebruik ALTIJD direct de bestaande `Modal.tsx` of `BaseModal.tsx` componenten
   - Alle modal logica moet in de parent component staan, niet in een nieuwe wrapper
   - Dit voorkomt duplicate code en houdt modals simpel en configureerbaar

   **Modal keuze:**
   - Gebruik `BaseModal.tsx` voor modals met formulieren (automatische toast, error handling, loading state)
   - Gebruik `Modal.tsx` voor simpele modals (confirmatie, info, etc.)

   **BaseModal pattern (voor formulieren):**
   ```tsx
   import BaseModal from "@/app/components/modals/BaseModal";
   import FormInput from "@/app/components/ui/FormInput";

   export default function MyComponent() {
     const [isOpen, setIsOpen] = useState(false);
     const [value, setValue] = useState("");

     const handleSubmit = async () => {
       await api.doSomething(value);
     };

     return (
       <>
         <Button onClick={() => setIsOpen(true)}>Open</Button>
         <BaseModal
           isOpen={isOpen}
           onClose={() => setIsOpen(false)}
           title={t("title")}
           formId="my-form"
           onSubmit={handleSubmit}
           successMessage={t("success")}
           errorFallbackMessage={t("error")}
         >
           <FormInput
             id="field"
             label={t("label")}
             value={value}
             onChange={(e) => setValue(e.target.value)}
             required
           />
         </BaseModal>
       </>
     );
   }
   ```

   **Modal pattern (voor confirmatie/info):**
   ```tsx
   import Modal from "@/app/components/ui/Modal";
   import Button from "@/app/components/ui/Button";

   export default function MyComponent() {
     const [isOpen, setIsOpen] = useState(false);

     const handleConfirm = async () => {
       await api.doSomething();
       setIsOpen(false);
     };

     return (
       <>
         <Button onClick={() => setIsOpen(true)}>Delete</Button>
         <Modal
           isOpen={isOpen}
           onClose={() => setIsOpen(false)}
           title={t("confirmDelete")}
           actions={[
             { label: t("cancel"), onClick: () => setIsOpen(false), variant: "secondary" },
             { label: t("delete"), onClick: handleConfirm, variant: "danger" }
           ]}
         >
           <p>{t("deleteWarning")}</p>
         </Modal>
       </>
     );
   }
   ```

   **Voordelen van dit patroon:**
   - Geen duplicate modal componenten
   - Alle modal state en logica op één plek (parent component)
   - Makkelijker te onderhouden
   - Consistent gedrag voor alle modals

5. **Pattern voor nieuwe UI componenten:**
   - Maak ze generiek en herbruikbaar
   - Plaats ze in `app/components/ui/`
   - Gebruik props voor customization
   - Documenteer de props met TypeScript interfaces

6. **Helper functies en utilities:**
   - Plaats in `lib/utils/` voor algemene utilities
   - Plaats in `lib/hooks/` voor custom React hooks
   - Hergebruik bestaande helpers waar mogelijk

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
