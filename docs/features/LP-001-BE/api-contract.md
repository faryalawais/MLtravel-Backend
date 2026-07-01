# API Contract — LP-001-BE: Health endpoint

## Endpoints

| Method | Path | operationId | Purpose |
|--------|------|-------------|---------|
| GET | `/api/health` | `getHealth` | Returns 200 + minimal health payload |

## Status code matrix

| Endpoint | 200 |
|----------|-----|
| GET /api/health | API is healthy |

## Schemas

| Schema | Fields |
|--------|--------|
| `HealthResponse` | `status` (string, required) |

## Example response

```json
{ "status": "ok" }
```

Source of truth: `docs/openapi/paths/LP-001-BE.yaml`  
Feature view: `http://localhost:3001/api/docs?feature=LP-001-BE`
