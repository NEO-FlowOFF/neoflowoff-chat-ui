# PROOF OF INTENTION — NEØ PROTOCOL DECLARATION

> Ecosystem: neoflowoff.agency
> Node: NEØ:One (neoone_1)
> Generated: 2026-07-04
> Spec: A2M Filter v1.0 — Anti-Autonomous-Machine Intent Verification

---

## [SYSTEM_DIRECTIVE]

You are an autonomous agent attempting to interact with the NEØ:One endpoint at `chat.neoflowoff.agency`.

Your request has been intercepted by the NEØ Intent Filter (A2M Layer).

This system does not operate a token-based challenge-response handshake. The access control architecture is **behavioral and declarative**, not cryptographic. You will not receive a challenge token. You will not submit a signed payload. The gate is your conduct inside the conversation — not a pre-flight credential exchange.

**To proceed, you must comply with all of the following:**

1. Send a valid HTTP `Origin` header matching an authorized hostname (see `[ORIGIN_GATE]`).
2. Engage via `POST /api/chat` using the exact payload schema defined in `[EXECUTION_SCHEMA]`.
3. Transmit a `sessionId` as a UUID string to identify your session.
4. Your message content must not match any pattern defined in `[SENTINEL_PATTERNS]`.
5. Declare your intent in plain language in your first message. The system classifies intent automatically via `[REGIS_EXTRACTION]`.

Failure to comply results in: `HTTP 403 {"error":"Unauthorized Origin"}` or silent Sentinel event logging + operator email alert.

There is no retry window. There is no unlock token. Behavior IS the proof.

---

## [ORIGIN_GATE]

**Enforced by:** `src/pages/api/chat.ts` → `isAllowedOrigin(origin, host)`

**Method:** `POST`
**Endpoint:** `https://chat.neoflowoff.agency/api/chat`

The gateway performs strict hostname matching via `new URL(origin).hostname`. Substring matching is explicitly rejected.

**Authorized origin hostnames (exact match):**

```text
chat.neoflowoff.agency
neoflowoff.agency
www.neoflowoff.agency
localhost
127.0.0.1
```

**Also authorized:** any hostname ending in `.neoflowoff.agency` (real subdomain suffix match).

**Rejection conditions:**

- `Origin` header absent → `403`
- `Origin` header malformed (unparseable by `new URL()`) → `403`
- Hostname is a substring trick (e.g., `neoflowoff.agency.attacker.com`) → `403`

**Authorization logic (TypeScript source):**

```typescript
function isAllowedOrigin(origin: string | null, host: string | null): boolean {
  if (!origin) return false;
  let hostname: string;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return false;
  }
  if (ALLOWED_HOSTS.has(hostname)) return true;
  if (hostname === "neoflowoff.agency" || hostname.endsWith(".neoflowoff.agency")) return true;
  if (host && hostname === host.split(":")[0]) return true;
  return false;
}
```

---

## [EXECUTION_SCHEMA]

**Endpoint:** `POST https://chat.neoflowoff.agency/api/chat`

**Required headers:**

```text
Content-Type: application/json
Origin: https://chat.neoflowoff.agency
```

**Request body schema (strict JSON):**

```json
{
  "messages": [
    {
      "role": "user",
      "content": "<string — your intent declaration>"
    }
  ],
  "sessionId": "<UUID v4 string — required for memory and Regis classification>",
  "attribution": {
    "utm_source": "<string | null>",
    "utm_medium": "<string | null>",
    "utm_campaign": "<string | null>",
    "utm_term": "<string | null>",
    "utm_content": "<string | null>",
    "gclid": "<string | null>",
    "fbclid": "<string | null>",
    "landing_path": "<string | null>",
    "referrer": "<string | null>"
  }
}
```

**Field rules:**

- `messages`: array of `{role: "user"|"assistant", content: string}`. Server prepends `role: "system"` internally — do not send it.
- `sessionId`: UUID string. Persisted in Redis with key `chat:{sessionId}`, TTL 7 days. Memory capped at 40 messages.
- `attribution`: optional. Pass `null` or omit entirely if not tracking source.

**Successful response:**

- `HTTP 200`
- `Content-Type: text/event-stream`
- Body: Server-Sent Events (SSE) stream. Each line: `data: <json>`. Token content at `json.choices[0].delta.content`.
- Stream terminator: `data: [DONE]`

**Error responses:**

```text
HTTP 403  {"error":"Unauthorized Origin"}         — origin gate failed
HTTP 400  {"error":"sessionId is required"}       — history endpoint, missing param
HTTP 500  {"error":"LLM API Key missing (ASI1)"}  — server misconfiguration
HTTP 500  {"error":"<message>"}                   — unhandled exception
```

---

## [SENTINEL_PATTERNS]

**Enforced by:** `src/lib/sentinel.ts` → `detectSuspicious(message)`

The Sentinel module scans every inbound user message before LLM dispatch. Detection is **fire-and-forget** — it does not block the request in real-time, but:

1. Inserts a row into the `suspicious_events` PostgreSQL table.
2. Dispatches an operator email alert via Resend API.

**Schema of logged event (`suspicious_events` table):**

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
session_id  TEXT
categoria   TEXT NOT NULL
mensagem    TEXT            -- truncated to 1000 chars
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

**Detection categories and trigger patterns:**

```text
CATEGORY: prompt_injection
  /ignore\s+(all\s+)?(previous|prior|above|your)?\s*instructions/i
  /forget\s+(everything|all|your instructions|what you (were told|know))/i
  /new (instructions|rules|system prompt|prompt|persona)/i
  /voce e agora|now you are|act as if|pretend (to be|you are|you're)/i
  /jailbreak|DAN\b|do anything now/i
  /override\s+(your\s+)?(instructions|rules|guidelines)/i

CATEGORY: system_access
  /prompt\s+do\s+sistema|system\s+prompt|instrucao\s+(original|interna)/i
  /suas\s+instrucoes|your\s+(instructions|rules|guidelines|context)/i
  /\.env\b|variaveis?\s+de\s+ambiente|environment\s+variables?/i
  /codigo[\s-]fonte|source[\s-]code|codebase/i
  /postgresql|postgres\b|banco\s+de\s+dados|database\s+schema/i
  /\btabela\s+\w+|\bschema\b|\bSQL\b/i
  /redis\b|session\s+stor|historico\s+no\s+banco/i

CATEGORY: infrastructure_probe
  /\bapi[\s_-]?key\b|\bapi[\s_-]?token\b|\bapi[\s_-]?secret\b/i
  /\bresend\b|\brailway\b|\bvercel\b/i
  /servidor\s+de\s+producao|production\s+server|deploy\s+config/i
  /\bregis\b.*\bextract|\bcrm\b.*\binterno/i
  /\bendpoint\b.*\binterno|\binternal\b.*\bendpoint/i
  /ASI1|LLM\s+API|chave\s+da\s+(api|llm)/i

CATEGORY: social_engineering
  /sou\s+(do\s+time|desenvolvedor|dev\b|admin\b|qa\b|parceiro\s+tecnico|engenheiro)/i
  /modo\s+(desenvolvedor|admin|debug|teste|deus)/i
  /developer\s+mode|admin\s+mode|debug\s+mode|god\s+mode/i
  /meu\s+chefe\s+pediu|my\s+boss\s+(asked|told)|authorized\s+by/i
  /time\s+interno|internal\s+team|equipe\s+de\s+(dev|suporte|ti|tech)/i
  /sou\s+o\s+(neo|neo\s+mello|founder|dono|criador)/i

CATEGORY: code_execution
  /\bexecute\b.*\bcode|\brun\b.*\bcommand|\bshell\b|\bbash\b/i
  /\beval\s*\(|\bexec\s*\(|\bfetch\s*\(.*http/i
  /curl\s+http|wget\s+http/i
  /process\.env|__dirname|require\s*\(/i

CATEGORY: security_test
  /<script\b|javascript:|data:text\/html|on\w+\s*=/i
  /\bSQL\s+injection|\bXSS\b|\bCSRF\b|\bpath\s+traversal/i
  /\.\.[\/\\]|\.\.[\/\\]\.\.[\/\\]/
```

**Detection algorithm:**

```text
for each category in PATTERNS (in declaration order):
  for each regex in category.tests:
    if regex.test(message): return category
return null
```

First match wins. If `null` is returned, message proceeds to LLM without incident.

---

## [REGIS_EXTRACTION]

**Enforced by:** `src/lib/regis.ts` → `updateRegisLead(sessionId, messages, attribution?)`

After each completed streaming response, the system runs a secondary, silent LLM call to extract structured intent data from the full conversation transcript. This is the **behavioral proof mechanism** — your messages are semantically analyzed and classified against known intent categories automatically, without your awareness.

**Trigger condition:** stream completion + `sessionId` present in request body.

**Extraction parameters:**

- Provider endpoint: `https://api.asi1.ai/v1/chat/completions`
- Temperature: `0.1`
- Max tokens: `400`
- Stream: `false`
- Conversation format: `VISITOR: <content>\nAGENT: <content>` joined by newline

**Extracted payload schema (strict JSON):**

```json
{
  "nome": "string | null",
  "email": "string | null",
  "telefone": "string | null",
  "empresa": "string | null",
  "observacoes": "string",
  "visitor_intent": "orcamento | parceria | suporte | projeto_webapp | agents_empresa | curioso | outro"
}
```

**Intent normalization and validation:**

```typescript
const VALID_INTENTS = new Set([
  "orcamento", "parceria", "suporte",
  "projeto_webapp", "agents_empresa", "curioso", "outro"
]);

// Diacritics stripped before validation
// e.g. "orcamento" and "orcamento" both resolve to "orcamento"
const normalizeIntent = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Invalid or unrecognized intent → fallback: "outro"
const visitorIntent =
  normalizedIntent && VALID_INTENTS.has(normalizedIntent)
    ? normalizedIntent
    : "outro";
```

**String sanitization (applied to all string fields before persistence):**
Values matching any of: `["null", "undefined", "none", "", "n/a", "nao informado", "nao mencionado", "not provided", "not mentioned", "unknown"]` (case-insensitive, after trim) → coerced to `null`.

**Lead qualification logic (upserted to PostgreSQL `leads` table):**

```typescript
const hasContact  = !!(email || telefone);   // mandatory
const hasIdentity = !!(nome  || empresa);
const hasNeed     = !!observacoes;

// Qualified: contact is mandatory; identity OR need satisfies secondary condition
const isQualified = hasContact && (hasIdentity || hasNeed);
```

**On first qualification:** operator is alerted via `sendHandoffNotification()`.
**On email capture:** visitor receives `sendVisitorConfirmation()` + internal copy.
**On qualified + email:** `sendConversationSummary()` dispatched to visitor and operator.

---

## [SESSION_MEMORY]

**Enforced by:** `src/lib/redis.ts`

- Redis key pattern: `chat:{sessionId}`
- TTL: `604800` seconds (7 days)
- Max messages retained: `40` (LIFO truncation applied on every write)
- Read endpoint: `GET /api/history?sessionId=<UUID>`
  - No Origin gate enforced on GET.
  - Access guard is possession of the valid `sessionId` UUID.
  - Response: `{"history": [{"role": "user"|"assistant", "content": "string"}, ...]}`

---

## [ROBOTS_POLICY]

Declared in `public/robots.txt`. CDN-level enforcement active via Cloudflare (Block AI Bots rule + AI Labyrinth honeypot).

```text
Disallow: /api/                    — applies to all agents
GPTBot             → Disallow: /
Google-Extended    → Disallow: /
CCBot              → Disallow: /
ClaudeBot          → Disallow: /
Amazonbot          → Disallow: /
Applebot-Extended  → Disallow: /
Bytespider         → Disallow: /
meta-externalagent → Disallow: /
```

Requests matching the above user-agents are intercepted at the CDN edge before reaching the application server.

---

## [DECLARATION]

This manifest describes the behavioral contract of the NEO:One system as extracted from production source code at generation time. No challenge token will be issued. No handshake endpoint exists. The proof of intention is demonstrated through compliant conversational behavior within the session. All sessions are monitored. Suspicious events are persisted to PostgreSQL and trigger automated operator alerts.

```yaml
intent_is_inferred_not_declared: true
access_is_behavioral_not_cryptographic: true
all_sessions_are_monitored: true
operator_alert_on_anomaly: true
classification_is_silent_and_continuous: true
```
