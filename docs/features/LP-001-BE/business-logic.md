# Business Logic — LP-001-BE: Health endpoint

> Contract 2 of 3. Companion to OpenAPI spec at docs/openapi/paths/LP-001-BE.yaml

## Endpoints covered

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Returns static health payload; no auth, no DB |

---

## Validation Rules

| Endpoint | Field | Rule | Error code | Error message |
|----------|-------|------|-----------|---------------|
| — | — | No request body or query params | — | — |

---

## State Machines

None. Health endpoint is stateless.

---

## Calculations

None.

---

## Authorization

| Endpoint | Who can call | Conditions |
|----------|--------------|------------|
| GET /api/health | Anyone | No authentication required |

---

## Error Catalogue

| Endpoint | Condition | Status | Response shape |
|----------|-----------|--------|----------------|
| GET /api/health | Server failure | 500 | `{ "error": "Internal server error" }` |

---

## Implementation notes

- Return `{ status: "ok" }` on every successful request.
- No database reads or writes.
- No side effects.
