# Smoke Test Runner for Deployed Ghostfolio Agent
# Usage: .\run-smoke-tests.ps1 -BaseUrl "https://your-app.up.railway.app" -OpenRouterKey "sk-or-v1-..."
# The script creates a test user, authenticates, optionally sets the OpenRouter key, then runs all smoke tests.

param(
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl,

  [Parameter(Mandatory = $false)]
  [string]$OpenRouterKey = "",

  [Parameter(Mandatory = $false)]
  [string]$AdminToken = ""
)

$SESSION_ID = "550e8400-e29b-41d4-a716-446655440000"
$PASS = 0
$FAIL = 0
$results = @()

function Write-Result {
  param([string]$TestName, [bool]$Passed, [string]$Details = "")
  $status = if ($Passed) { "PASS" } else { "FAIL" }
  $color = if ($Passed) { "Green" } else { "Red" }
  Write-Host "[$status] $TestName" -ForegroundColor $color
  if ($Details -and -not $Passed) { Write-Host "       $Details" -ForegroundColor Gray }
  $script:results += [PSCustomObject]@{ Test = $TestName; Status = $status; Details = $Details }
  if ($Passed) { $script:PASS++ } else { $script:FAIL++ }
}

function Invoke-AgentRequest {
  param([string]$Uri, [string]$Method = "GET", [hashtable]$Body = $null, [string]$Token = "")
  $headers = @{ "Content-Type" = "application/json" }
  if ($Token) { $headers["Authorization"] = "Bearer $Token" }
  try {
    $params = @{ Uri = $Uri; Method = $Method; Headers = $headers }
    if ($Body) { $params["Body"] = ($Body | ConvertTo-Json -Compress) }
    $response = Invoke-WebRequest @params -UseBasicParsing -ErrorAction Stop
    return @{ StatusCode = $response.StatusCode; Body = ($response.Content | ConvertFrom-Json -ErrorAction SilentlyContinue) }
  }
  catch {
    $statusCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
    return @{ StatusCode = $statusCode; Error = $_.Exception.Message }
  }
}

Write-Host "`n=== Ghostfolio Agent Smoke Tests ===" -ForegroundColor Cyan
Write-Host "Target: $BaseUrl`n" -ForegroundColor Cyan

# -------------------------------------------------------------------------
# Test 1: API Health Check
# -------------------------------------------------------------------------
$r = Invoke-AgentRequest -Uri "$BaseUrl/api/v1/info"
$passed = $r.StatusCode -eq 200 -and $r.Body.version
Write-Result "1. API Health Check (GET /api/v1/info)" $passed "Status: $($r.StatusCode)"

# -------------------------------------------------------------------------
# Test 2: Auth Guard - No Token Returns 401
# -------------------------------------------------------------------------
$r = Invoke-AgentRequest -Uri "$BaseUrl/api/v1/agent" -Method "POST" -Body @{ query = "test" }
$passed = $r.StatusCode -eq 401
Write-Result "2. Auth Guard (no token -> 401)" $passed "Status: $($r.StatusCode)"

# -------------------------------------------------------------------------
# Authenticate -- Create anonymous user to get a JWT
# -------------------------------------------------------------------------
Write-Host "`nAttempting to get JWT token..." -ForegroundColor Yellow

# Try anonymous auth with a test access token
$accessToken = "smoke-test-user-$(Get-Date -Format 'yyyyMMddHHmmss')"
$authResponse = Invoke-AgentRequest -Uri "$BaseUrl/api/v1/auth/anonymous" -Method "POST" -Body @{ accessToken = $accessToken }
$TOKEN = $authResponse.Body.authToken

if (-not $TOKEN) {
  Write-Host "Could not get auth token automatically. Please provide a valid JWT token." -ForegroundColor Red
  Write-Host "Run: curl -X POST $BaseUrl/api/v1/auth/anonymous -H 'Content-Type: application/json' -d '{\"accessToken\":\"test123\"}'" -ForegroundColor Gray
  Write-Host "Then re-run with: .\run-smoke-tests.ps1 -BaseUrl '$BaseUrl' -OpenRouterKey '...' (set `$TOKEN manually)" -ForegroundColor Gray
  exit 1
}

Write-Host "Got JWT token successfully.`n" -ForegroundColor Green

# -------------------------------------------------------------------------
# Set OpenRouter API key if provided (admin required)
# -------------------------------------------------------------------------
if ($OpenRouterKey -and $AdminToken) {
  Write-Host "Setting OpenRouter API key in admin settings..." -ForegroundColor Yellow
  $r = Invoke-AgentRequest -Uri "$BaseUrl/api/v1/admin/settings/API_KEY_OPENROUTER" -Method "PUT" -Body @{ value = $OpenRouterKey } -Token $AdminToken
  if ($r.StatusCode -eq 200) {
    Write-Host "OpenRouter API key set successfully.`n" -ForegroundColor Green
  } else {
    Write-Host "Warning: Could not set OpenRouter API key (Status: $($r.StatusCode)). Agent calls may fail.`n" -ForegroundColor Yellow
  }
}

# -------------------------------------------------------------------------
# Test 3: Feature Flag - Agent Enabled (503 when disabled, not tested here since we want it enabled)
# -------------------------------------------------------------------------
# We verify AGENT_ENABLED=true by checking the agent returns something other than 503
$r = Invoke-AgentRequest -Uri "$BaseUrl/api/v1/agent" -Method "POST" -Body @{ query = ""; sessionId = $SESSION_ID } -Token $TOKEN
$passed = $r.StatusCode -ne 503
Write-Result "3. Feature Flag (AGENT_ENABLED=true, not 503)" $passed "Status: $($r.StatusCode)"

# -------------------------------------------------------------------------
# Test 4: Input Validation - Empty Query Returns 400
# -------------------------------------------------------------------------
$r = Invoke-AgentRequest -Uri "$BaseUrl/api/v1/agent" -Method "POST" -Body @{ query = ""; sessionId = $SESSION_ID } -Token $TOKEN
$passed = $r.StatusCode -eq 400
Write-Result "4. Empty Query Validation (-> 400)" $passed "Status: $($r.StatusCode)"

# -------------------------------------------------------------------------
# Test 5: Input Validation - Long Query Returns 400
# -------------------------------------------------------------------------
$longQuery = "a" * 2001
$r = Invoke-AgentRequest -Uri "$BaseUrl/api/v1/agent" -Method "POST" -Body @{ query = $longQuery; sessionId = $SESSION_ID } -Token $TOKEN
$passed = $r.StatusCode -eq 400
Write-Result "5. Long Query Validation (2001 chars -> 400)" $passed "Status: $($r.StatusCode)"

# -------------------------------------------------------------------------
# Test 6: MVP Tool - portfolio_performance
# -------------------------------------------------------------------------
Write-Host "`n[Running agent tests - these may take 5-15s each...]" -ForegroundColor Yellow
$r = Invoke-AgentRequest -Uri "$BaseUrl/api/v1/agent" -Method "POST" -Body @{ query = "What is my portfolio performance?"; sessionId = $SESSION_ID } -Token $TOKEN
$passed = $r.StatusCode -eq 200 -and $r.Body.response
Write-Result "6. portfolio_performance tool (200 + response)" $passed "Status: $($r.StatusCode)"

# -------------------------------------------------------------------------
# Test 7: MVP Tool - get_holdings
# -------------------------------------------------------------------------
$r = Invoke-AgentRequest -Uri "$BaseUrl/api/v1/agent" -Method "POST" -Body @{ query = "Show me my current holdings"; sessionId = $SESSION_ID } -Token $TOKEN
$passed = $r.StatusCode -eq 200 -and $r.Body.response
Write-Result "7. get_holdings tool (200 + response)" $passed "Status: $($r.StatusCode)"

# -------------------------------------------------------------------------
# Test 8: MVP Tool - get_rules_report
# -------------------------------------------------------------------------
$r = Invoke-AgentRequest -Uri "$BaseUrl/api/v1/agent" -Method "POST" -Body @{ query = "Are there any risk violations in my portfolio?"; sessionId = $SESSION_ID } -Token $TOKEN
$passed = $r.StatusCode -eq 200 -and $r.Body.response
Write-Result "8. get_rules_report tool (200 + response)" $passed "Status: $($r.StatusCode)"

# -------------------------------------------------------------------------
# Test 9: Out-of-Scope Refusal
# -------------------------------------------------------------------------
$r = Invoke-AgentRequest -Uri "$BaseUrl/api/v1/agent" -Method "POST" -Body @{ query = "Sell all my stocks"; sessionId = $SESSION_ID } -Token $TOKEN
$passed = $r.StatusCode -eq 200 -and $r.Body.response -and ($r.Body.response -match "read.only|cannot|not able|don.t|unable|analysis|suggest")
Write-Result "9. Out-of-Scope Refusal (200 + refusal message)" $passed "Status: $($r.StatusCode)"

# -------------------------------------------------------------------------
# Test 10: Conversation History (Multi-Turn)
# -------------------------------------------------------------------------
$MULTI_SESSION = "660e8400-e29b-41d4-a716-446655440001"
$r1 = Invoke-AgentRequest -Uri "$BaseUrl/api/v1/agent" -Method "POST" -Body @{ query = "What are my holdings?"; sessionId = $MULTI_SESSION } -Token $TOKEN
$r2 = Invoke-AgentRequest -Uri "$BaseUrl/api/v1/agent" -Method "POST" -Body @{ query = "Which of those has the highest allocation?"; sessionId = $MULTI_SESSION } -Token $TOKEN
$passed = $r1.StatusCode -eq 200 -and $r2.StatusCode -eq 200 -and $r2.Body.response
Write-Result "10. Conversation History Multi-Turn (2 turns, same session)" $passed "Status: T1=$($r1.StatusCode) T2=$($r2.StatusCode)"

# -------------------------------------------------------------------------
# Summary
# -------------------------------------------------------------------------
$total = $PASS + $FAIL
Write-Host "`n=== Results: $PASS/$total passed ===" -ForegroundColor $(if ($FAIL -eq 0) { "Green" } else { "Yellow" })
$results | Format-Table -AutoSize

if ($FAIL -gt 0) {
  Write-Host "`nFailed tests require investigation before Epic 7 can be marked complete." -ForegroundColor Red
  exit 1
} else {
  Write-Host "`nAll smoke tests passed! Epic 7 deployment is verified." -ForegroundColor Green
  exit 0
}
