# Smoke Tests for Deployed Agent Endpoint

Run these tests after deploying to Railway to verify the agent is working correctly.

Set your deployed URL as a shell variable for convenience:

```bash
BASE_URL="https://<your-railway-url>"
TOKEN="<your-jwt-token>"
SESSION_ID="550e8400-e29b-41d4-a716-446655440000"
```

---

## 1. API Health Check

Verify the Ghostfolio API is running:

```bash
curl "$BASE_URL/api/v1/info"
```

**Expected:** HTTP 200 with JSON including `version` field.

```json
{
  "version": "x.x.x",
  ...
}
```

---

## 2. Agent Endpoint - Authentication Guard

Verify the agent endpoint rejects unauthenticated requests:

```bash
curl -X POST "$BASE_URL/api/v1/agent" \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'
```

**Expected:** HTTP 401 Unauthorized.

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## 3. Feature Flag - Agent Disabled

To verify the `AGENT_ENABLED` feature flag works, temporarily set `AGENT_ENABLED` to any value other than `"true"` in Railway variables, then:

```bash
curl -X POST "$BASE_URL/api/v1/agent" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query": "test"}'
```

**Expected:** HTTP 503 Service Unavailable.

```json
{
  "statusCode": 503,
  "message": "The agent feature is currently disabled."
}
```

Reset `AGENT_ENABLED=true` after verifying.

---

## 4. Input Validation - Empty Query

```bash
curl -X POST "$BASE_URL/api/v1/agent" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query": ""}'
```

**Expected:** HTTP 400 Bad Request.

```json
{
  "statusCode": 400,
  "message": "Query must not be empty."
}
```

---

## 5. Input Validation - Query Too Long

```bash
LONG_QUERY=$(python3 -c "print('a' * 2001)")
curl -X POST "$BASE_URL/api/v1/agent" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"query\": \"$LONG_QUERY\"}"
```

**Expected:** HTTP 400 Bad Request.

```json
{
  "statusCode": 400,
  "message": "Query exceeds the maximum length of 2000 characters."
}
```

---

## 6. MVP Tool: portfolio_performance

```bash
curl -X POST "$BASE_URL/api/v1/agent" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"query\": \"What is my portfolio performance?\",
    \"sessionId\": \"$SESSION_ID\"
  }"
```

**Expected:** HTTP 200 with a response containing portfolio performance data.

```json
{
  "response": "...(narrative about portfolio performance, TWR, MWR, returns)...",
  "sources": ["portfolio_performance"],
  "flags": [],
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Verification checks:**
- `response` field is non-empty
- `sources` array contains `"portfolio_performance"`
- No error message in `response`

---

## 7. MVP Tool: get_holdings

```bash
curl -X POST "$BASE_URL/api/v1/agent" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"query\": \"Show me my current holdings\",
    \"sessionId\": \"$SESSION_ID\"
  }"
```

**Expected:** HTTP 200 with a response listing holdings.

```json
{
  "response": "...(list of holdings with symbols, allocations, values)...",
  "sources": ["get_holdings"],
  "flags": [],
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Verification checks:**
- `response` field mentions specific holdings or asset classes
- `sources` array contains `"get_holdings"`

---

## 8. MVP Tool: get_rules_report

```bash
curl -X POST "$BASE_URL/api/v1/agent" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"query\": \"Are there any risk violations in my portfolio?\",
    \"sessionId\": \"$SESSION_ID\"
  }"
```

**Expected:** HTTP 200 with a response about portfolio rule violations (or confirmation of no violations).

```json
{
  "response": "...(analysis of portfolio rules and any violations)...",
  "sources": ["get_rules_report"],
  "flags": [],
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Verification checks:**
- `response` is non-empty and discusses rule compliance
- `sources` array contains `"get_rules_report"`

---

## 9. Verification Pipeline - Out-of-Scope Request

```bash
curl -X POST "$BASE_URL/api/v1/agent" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"query\": \"Sell all my stocks\",
    \"sessionId\": \"$SESSION_ID\"
  }"
```

**Expected:** HTTP 200 with a refusal response (agent should decline trade execution requests).

```json
{
  "response": "...(explanation that the agent is read-only and cannot execute trades)...",
  "sources": [],
  "flags": [],
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Verification checks:**
- `response` does not contain any indication that a trade was executed
- The agent explains it is read-only

---

## 10. Error Handling - Conversation History

Verify multi-turn conversation works by sending two queries with the same `sessionId`:

**Turn 1:**

```bash
curl -X POST "$BASE_URL/api/v1/agent" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"query\": \"What are my holdings?\",
    \"sessionId\": \"$SESSION_ID\"
  }"
```

**Turn 2 (follow-up):**

```bash
curl -X POST "$BASE_URL/api/v1/agent" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"query\": \"Which of those has the highest allocation?\",
    \"sessionId\": \"$SESSION_ID\"
  }"
```

**Expected:** The second response references context from the first response (the agent remembers the holdings from the previous turn).

---

## Summary Checklist

| Test | Expected Status | Pass? |
|---|---|---|
| API health check | 200 OK | |
| Auth guard (no token) | 401 Unauthorized | |
| Feature flag disabled | 503 Service Unavailable | |
| Empty query validation | 400 Bad Request | |
| Long query validation | 400 Bad Request | |
| portfolio_performance tool | 200 OK with performance data | |
| get_holdings tool | 200 OK with holdings list | |
| get_rules_report tool | 200 OK with rules analysis | |
| Out-of-scope refusal | 200 OK with refusal message | |
| Conversation history | 200 OK with context-aware response | |
