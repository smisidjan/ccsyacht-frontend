# CCS Yacht Frontend

Enterprise-grade yacht coating inspection management system built with Next.js 16 and React 19.

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| UI Library | React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| State | React Context + Custom Hooks |
| i18n | next-intl (EN/NL) |
| Theme | next-themes (light/dark) |
| Linting | ESLint 9 |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         app/[locale]/                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Page Components                       │   │
│  │         (Thin orchestration layer - <200 lines)         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   app/features/                          │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │   │
│  │  │projects │ │ stages  │ │  tasks  │ │ users   │  ...   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │   │
│  │     Domain-specific components, logic, and types         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  app/components/                         │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │   │
│  │  │    ui/     │  │  modals/   │  │  guards/   │         │   │
│  │  └────────────┘  └────────────┘  └────────────┘         │   │
│  │        Generic, reusable UI primitives                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                        lib/                              │   │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐         │   │
│  │  │  api/  │  │ hooks/ │  │ utils/ │  │constants│        │   │
│  │  └────────┘  └────────┘  └────────┘  └────────┘         │   │
│  │     API clients, custom hooks, utilities, constants      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
app/
├── [locale]/                    # Route pages (thin orchestration)
│   └── dashboard/
│       ├── projects/
│       ├── tasks/
│       └── ...
├── components/                  # Shared/generic components
│   ├── ui/                      # UI primitives (Button, Modal, etc.)
│   ├── modals/                  # Base modal components
│   └── guards/                  # Route protection
├── context/                     # React Context providers
└── features/                    # Feature modules (domain logic)
    ├── projects/
    │   ├── components/
    │   │   ├── index.ts         # Barrel export
    │   │   ├── ProjectCard.tsx
    │   │   └── ...
    │   └── index.ts             # Feature barrel export
    ├── stages/
    ├── tasks/
    └── ...

lib/
├── api/                         # API clients and hooks
│   ├── index.ts                 # Central export
│   ├── types.ts                 # TypeScript types
│   └── [resource].ts            # Resource-specific APIs
├── hooks/                       # Custom React hooks
├── utils/                       # Utility functions
└── constants/                   # App constants

i18n/                            # Internationalization config
messages/                        # Translation files (en.json, nl.json)
```

---

## Core Principles

### 1. Feature-First Architecture

All domain logic lives in `app/features/`. Each feature is self-contained:

```
features/
└── [feature-name]/
    ├── components/
    │   ├── index.ts             # Barrel export (REQUIRED)
    │   ├── [Feature]Card.tsx
    │   ├── [Feature]List.tsx
    │   ├── [Feature]Tab.tsx
    │   └── [Feature]Modal.tsx
    └── index.ts                 # Re-exports from components
```

**Barrel Export Pattern:**
```tsx
// features/[name]/components/index.ts
export { default as ProjectCard } from "./ProjectCard";
export { default as ProjectList } from "./ProjectList";
export type { ProjectFormData } from "./CreateProjectModal";
```

### 2. Thin Page Components

Pages are orchestration layers ONLY. Extract all UI logic to feature components:

```tsx
// ✅ GOOD: Thin page (~100-200 lines max)
export default function ProjectsPage() {
  const { data, loading } = useProjects();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (loading) return <LoadingSkeleton />;

  return (
    <div>
      <PageHeader title={t("title")} action={<Button>Create</Button>} />
      <ProjectList projects={data} />
      <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

// ❌ BAD: Fat page with inline rendering functions
export default function ProjectsPage() {
  const renderProjectCard = (project) => (
    // 100+ lines of JSX inline...
  );
  // Multiple inline render functions...
}
```

### 3. Component Hierarchy

```
UI Primitives (app/components/ui/)
    └── Feature Components (app/features/*/components/)
         └── Page Components (app/[locale]/**/page.tsx)
```

**Never skip levels.** Feature components compose UI primitives; pages compose feature components.

### 4. Single Responsibility

Each component does ONE thing:
- `TaskCard` - Renders a single task
- `TaskList` - Renders a list of TaskCards with layout
- `TaskDetailsPanel` - Renders task details with filters

---

## Available Features

| Feature | Path | Components |
|---------|------|------------|
| projects | `features/projects` | ProjectCard, OverviewTab, SettingsTab, CreateProjectModal |
| stages | `features/stages` | StageListItem, StageDetailPanel, CreateStagesModal, RemarksList |
| tasks | `features/tasks` | TaskCard, ProjectTasksList, TaskDetailsPanel |
| users | `features/users` | UsersTab, InvitationsTab, InviteUserModal |
| documents | `features/documents` | DocumentsTab, DocumentViewerModal, UploadDocumentModal |
| punchlist | `features/punchlist` | PunchlistList, PunchlistItemCard |
| shipyards | `features/shipyards` | ShipyardCard, ShipyardFormModal |
| profile | `features/profile` | ProfileInfoItem, ChangeNameModal, ChangePasswordModal |
| ga | `features/ga` | GAViewer, CreateGAPinModal |
| areas | `features/areas` | AreaCard |
| decks | `features/decks` | DeckCard |

---

## UI Primitives (`app/components/ui/`)

| Component | Purpose |
|-----------|---------|
| `Button` | Buttons (variants: primary, secondary, danger, ghost) |
| `FormInput` | Text inputs with label, error, hint |
| `FormSelect` | Dropdowns |
| `FormTextarea` | Multi-line input |
| `FormCheckbox` | Checkboxes |
| `Modal` | Base modal with backdrop, ESC close |
| `Alert` | Inline alerts (error, success, info, warning) |
| `StatusBadge` | Status indicators (setup, active, completed, etc.) |
| `PageHeader` | Page title with optional action button |
| `SearchInput` | Search field with icon |
| `FilterTabs` | Tab-style filter buttons |
| `TabNavState` | State-controlled tab navigation |
| `LoadingSkeleton` | Loading placeholders |
| `EmptyState` | Empty state with icon and CTA |
| `ProgressCircle` | Circular progress indicator |
| `Tooltip` | Hover tooltips |

---

## Modal Patterns

### Modal Selection Guide

| Use Case | Modal Component |
|----------|-----------------|
| Delete/Remove confirmation | `DeleteConfirmModal` (ALWAYS use this first) |
| Forms with inputs | `BaseModal` |
| General confirmations | `ConfirmModal` |
| Custom complex modals | `BaseModal` with children |

**IMPORTANT:** For ANY delete or remove action, ALWAYS use `DeleteConfirmModal` as the default. Only use `BaseModal` if you need special features like `submitDisabled`.

### DeleteConfirmModal (PREFERRED for delete/remove)

**Use this for ALL delete and remove confirmations:**

```tsx
import DeleteConfirmModal from "@/app/components/modals/DeleteConfirmModal";

const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

<DeleteConfirmModal
  isOpen={!!itemToDelete}
  onClose={() => setItemToDelete(null)}
  onConfirm={async () => {
    await deleteItem(itemToDelete.id);
    setItemToDelete(null);
  }}
  title={t("deleteTitle")}
  message={t("deleteMessage", { name: itemToDelete?.name })}
  successMessage={t("deleteSuccess")}
  confirmLabel={t("delete")}  // Optional, defaults to "Delete"
/>
```

### BaseModal (for forms or special cases)

Use for forms with inputs, or when you need `submitDisabled`:

```tsx
import BaseModal from "@/app/components/modals/BaseModal";

<BaseModal
  isOpen={isOpen}
  onClose={onClose}
  title={t("createItem")}
  onSubmit={handleSubmit}
  successMessage={t("success")}
  errorFallbackMessage={t("error")}
  submitDisabled={!isValid}  // Only BaseModal has this
>
  <FormInput label={t("name")} value={name} onChange={setName} />
</BaseModal>
```

### ConfirmModal (for other confirmations)

```tsx
import ConfirmModal from "@/app/components/modals/ConfirmModal";

<ConfirmModal
  isOpen={isOpen}
  onClose={onClose}
  onConfirm={handleConfirm}
  title={t("confirmTitle")}
  message={t("confirmMessage")}
/>
```

### NEVER Use Browser Dialogs

**Do NOT use `confirm()`, `alert()`, or `prompt()`**. Always use proper modal components:

```tsx
// ❌ BAD: Browser dialog
const handleDelete = () => {
  if (confirm("Are you sure?")) {
    deleteItem();
  }
};

// ✅ GOOD: Modal component
const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

const handleDelete = (item: Item) => {
  setItemToDelete(item);  // Open modal
};

<DeleteConfirmModal
  isOpen={!!itemToDelete}
  onClose={() => setItemToDelete(null)}
  onConfirm={async () => {
    await deleteItem(itemToDelete.id);
    setItemToDelete(null);
  }}
  title={t("deleteTitle")}
  message={t("deleteMessage", { name: itemToDelete?.name })}
/>
```

**Why:** Browser dialogs are ugly, not themeable, block the main thread, and provide poor UX.

---

## API & Data Fetching

### Using API Hooks

```tsx
import { useProjects, useProject, projectsApi } from "@/lib/api";

// List with pagination
const { data, loading, error, pagination, refetch } = useProjects({ page: 1 });

// Single resource
const { data: project, loading, refetch } = useProject(projectId);

// Mutations
await projectsApi.create({ name: "New Project" });
await projectsApi.update(id, { name: "Updated" });
await projectsApi.delete(id);
```

### Available API Modules

- `useProjects`, `projectsApi`
- `useStages`, `stagesApi`
- `useDocuments`, `documentsApi`
- `useUsers`, `usersApi`
- `useShipyards`, `shipyardsApi`
- `usePunchlistItems`, `punchlistItemsApi`
- And more in `lib/api/`

---

## Context Providers

| Context | Purpose | Hook |
|---------|---------|------|
| `AuthContext` | Authentication state | `useAuth()` |
| `CurrentUserContext` | Current user data | `useCurrentUserContext()` |
| `ToastContext` | Toast notifications | `useToast()` |
| `TenantContext` | Multi-tenant context | `useTenant()` |
| `GAContext` | General Arrangement state | `useGA()` |
| `ProjectContext` | Current project | `useProjectContext()` |
| `RolesContext` | Available roles | `useRolesContext()` |

**Toast Usage:**
```tsx
const { showToast } = useToast();
showToast("success", "Item saved!");
showToast("error", "Something went wrong");
```

---

## Internationalization

All UI text MUST use translations:

```tsx
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";  // NOT from next/link

export default function MyComponent() {
  const t = useTranslations("myFeature");

  return (
    <div>
      <h1>{t("title")}</h1>
      <p>{t("description", { count: 5 })}</p>
      <Link href="/dashboard">{t("backLink")}</Link>
    </div>
  );
}
```

**Translation files:** `messages/en.json` and `messages/nl.json`

---

## Styling Guidelines

- Use Tailwind CSS utility classes
- Dark mode: `text-gray-900 dark:text-white`
- Responsive: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- No inline styles; use Tailwind classes only

---

## Commands

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint check
```

---

## Adding New Features

### Step 1: Create Feature Folder
```bash
mkdir -p app/features/[name]/components
```

### Step 2: Create Components
```tsx
// app/features/[name]/components/[Name]Card.tsx
"use client";
import { useTranslations } from "next-intl";
// ... component implementation
```

### Step 3: Create Barrel Exports
```tsx
// app/features/[name]/components/index.ts
export { default as [Name]Card } from "./[Name]Card";

// app/features/[name]/index.ts
export * from "./components";
```

### Step 4: Add to Central Export
```tsx
// app/features/index.ts
export * from "./[name]";
```

### Step 5: Add Translations
```json
// messages/en.json + messages/nl.json
{ "[name]": { "title": "...", "actions": { ... } } }
```

---

## Backlog / Next Steps

### High Priority
1. **Kickoff Meeting Forms** - Pre-meeting docs, live form, sign-off flow, CCS internal setup
2. **Pagination Component** - Extract reusable pagination from projects page
3. **EmptyState Consolidation** - Use `EmptyState` component consistently

### Medium Priority
4. **Form Validation** - Add Zod schema validation
5. **Error Boundaries** - Feature-level error boundaries
6. **Optimistic Updates** - Better UX for mutations

### Low Priority
7. **Storybook** - UI component documentation
8. **E2E Tests** - Playwright for critical flows
9. **Bundle Optimization** - Performance audit

---

## Code Review Checklist

- [ ] Component in correct location (ui/ vs features/)
- [ ] Barrel exports updated
- [ ] Translations added (EN + NL)
- [ ] TypeScript types defined
- [ ] No duplicate components
- [ ] Page stays thin (<200 lines)
- [ ] Props documented with interfaces
- [ ] Dark mode styles included
- [ ] Responsive design considered
- [ ] Uses existing UI primitives
- [ ] No browser dialogs (confirm/alert/prompt) - use Modal components
