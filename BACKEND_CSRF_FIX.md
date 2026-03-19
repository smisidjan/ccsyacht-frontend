# Backend CSRF Configuration Fix

## Probleem
CSRF cookies zijn niet toegankelijk cross-subdomain tussen:
- API: `api.papertrail.ccsyacht.com`
- Frontend: `papertrail.ccsyacht.com`

## Oplossing voor Backend (Laravel)

### Optie 1: CSRF uitschakelen voor API routes (AANBEVOLEN)
In `app/Http/Middleware/VerifyCsrfToken.php`:

```php
protected $except = [
    'api/*',  // Schakel CSRF uit voor alle API routes
];
```

### Optie 2: Stateless API met Sanctum
In `config/sanctum.php`:

```php
'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
    '%s,%s,%s',
    'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1',
    'papertrail.ccsyacht.com',
    'api.papertrail.ccsyacht.com'
))),
```

En in `.env`:
```
SANCTUM_STATEFUL_DOMAINS=papertrail.ccsyacht.com,api.papertrail.ccsyacht.com
SESSION_DOMAIN=.ccsyacht.com
```

### Optie 3: Custom CSRF Header Check
Voeg toe aan `app/Http/Middleware/VerifyCsrfToken.php`:

```php
protected function tokensMatch($request)
{
    // Check for API token authentication first
    if ($request->bearerToken()) {
        return true; // Skip CSRF for authenticated API requests
    }

    return parent::tokensMatch($request);
}
```

## Frontend Status

De frontend stuurt nu:
- `credentials: 'include'` voor cookies
- `mode: 'cors'` voor cross-origin
- Maar GEEN `X-XSRF-TOKEN` header (kan cookie niet lezen)

## Aanbeveling

Voor een API die door een separate frontend wordt gebruikt, is het beste om:
1. CSRF uit te schakelen voor API routes
2. Te vertrouwen op Bearer token authentication
3. CORS proper te configureren (wat al werkt)

De CSRF bescherming is vooral belangrijk voor traditionele web forms, niet voor API's met token authentication.