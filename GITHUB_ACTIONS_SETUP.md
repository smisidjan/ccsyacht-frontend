# GitHub Actions Deployment Setup

## Automatische deployment bij push naar main branch

Deze setup zorgt ervoor dat elke push naar de `main` branch automatisch de applicatie deployt naar je productie server.

## Voordelen
✅ **Geen cross-platform build issues** - GitHub Actions draait op native linux/amd64
✅ **Automatische deployment** - Push naar main = automatisch live
✅ **Docker image caching** - Snellere builds door slim cachen
✅ **GitHub Container Registry** - Gratis Docker image hosting
✅ **Rollback mogelijk** - Oude images blijven bewaard

## Setup Stappen

### 1. GitHub Secrets Configureren

Ga naar je GitHub repository → Settings → Secrets and variables → Actions

Voeg deze secrets toe:

| Secret Name | Value | Beschrijving |
|------------|-------|--------------|
| `SERVER_HOST` | `167.235.135.241` | IP adres van je server |
| `SERVER_USER` | `root` | SSH gebruikersnaam |
| `SERVER_SSH_KEY` | `(inhoud van ~/.ssh/css_key)` | Private SSH key (volledig, inclusief BEGIN/END regels) |

**SSH Key toevoegen:**
```bash
# Op je lokale machine, kopieer de key:
cat ~/.ssh/css_key | pbcopy

# Plak deze in GitHub als SERVER_SSH_KEY secret
```

### 2. GitHub Container Registry Activeren

1. Ga naar GitHub → Settings → Developer settings → Personal access tokens
2. Maak een nieuwe token met `write:packages` permission
3. Of gebruik de automatische GITHUB_TOKEN (al geconfigureerd in workflow)

### 3. Server Voorbereiden

SSH naar je server en voer uit:

```bash
# Login bij GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Update docker-compose.prod.yml om GitHub registry te gebruiken
# (dit gebeurt automatisch in de workflow)
```

### 4. Workflow Activeren

```bash
# Commit en push de workflow
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Actions deployment workflow"
git push origin main
```

## Hoe het werkt

1. **Push naar main** → GitHub Actions start
2. **Build Docker image** op Ubuntu runner (linux/amd64)
3. **Push image** naar GitHub Container Registry
4. **SSH naar server** en pull nieuwe image
5. **Restart container** met nieuwe versie
6. **Cleanup** oude images

## Workflow Triggers

- **Automatisch:** Bij elke push naar `main` branch
- **Handmatig:** Via GitHub UI → Actions → Deploy to Production → Run workflow

## Monitoring

### Build Status Bekijken
1. Ga naar GitHub repository → Actions tab
2. Klik op een workflow run voor details
3. Bekijk logs van elke stap

### Badge Toevoegen aan README
```markdown
![Deploy Status](https://github.com/[username]/ccsyacht-frontend/actions/workflows/deploy.yml/badge.svg)
```

## Rollback

Als er iets mis gaat:

```bash
# SSH naar server
ssh root@167.235.135.241

# Lijst beschikbare images
docker images | grep ghcr.io

# Rollback naar vorige versie
docker run -d -p 3000:3000 ghcr.io/[username]/ccsyacht-frontend:sha-[previous-commit]
```

## Troubleshooting

### Build faalt
- Check GitHub Actions logs
- Controleer of alle dependencies in package.json staan

### SSH connectie faalt
- Controleer SERVER_SSH_KEY secret
- Test SSH verbinding lokaal eerst

### Docker pull faalt
- Check GitHub Container Registry permissions
- Controleer docker login op server

## Extra Features

### Environment Variables
Voeg production environment variables toe als secrets:
```yaml
env:
  NEXT_PUBLIC_API_URL: ${{ secrets.API_URL }}
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Slack Notifications
Voeg Slack notifications toe voor deployment status:
```yaml
- name: Notify Slack
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Kosten

- **GitHub Actions:** 2000 minuten/maand gratis voor private repos
- **GitHub Container Registry:** 500MB gratis opslag
- Een deployment duurt ~3-5 minuten

---

## Quick Start

1. Kopieer SSH key naar GitHub Secrets
2. Push naar main branch
3. Bekijk deployment in Actions tab
4. 🎉 Automatische deployment werkt!