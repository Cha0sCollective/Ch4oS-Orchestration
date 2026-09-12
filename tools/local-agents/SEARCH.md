# Bounded web search

The owner authorized a separate $5, non-resetting search budget. Model inference
remains free-only. `SearchService` is a transport-independent source acquisition
API for explicit coordinator queries; workers do not receive browsing tools.
The existing five worker operations are unchanged. Codex verifies the returned
sources and can supply dated material to a bounded worker assignment.

## Host setup

Create a separate OpenRouter key with credit limit **5**, reset **none**, and save
it as the Windows user environment variable `OPENROUTER_SEARCH_API_KEY`. Account
credit and a key's spending limit are different. The service checks the actual
key limit before a new search; an unlimited or resetting key is rejected.
Never use a management key or put a key in committed configuration. A newly
started process must receive this variable; existing processes may have stale
environment values. Keep the inference key `OPENROUTER_API_KEY` unchanged.

Create host-local `search.json`, with a model record copied from verified endpoint
discovery (the same exact identity shape as the worker host's OpenRouter model):

```json
{
  "model": "REPLACE_WITH_VERIFIED_MODEL_OBJECT",
  "keyEnv": "OPENROUTER_SEARCH_API_KEY",
  "storeDir": "search-state",
  "lifetimeMaxUsd": 5,
  "dataCollection": "deny",
  "timeoutMs": 120000
}
```

This example deliberately requires a current model object; it is not executable
as written. A free NVIDIA endpoint requiring collection needs explicit `allow`
in host configuration. The owner has approved that for nonconfidential Minecraft
work. Only a concise search query is sent, not repository snapshots or chat history.

```powershell
ch4os-web-search capabilities --config search.json
ch4os-web-search search --config search.json --request query.json
ch4os-web-search mcp --config search.json
```

`query.json` contains `requestKey` and `query`. Use a new unique request key for
each intentional search. The separate stdio MCP service exposes only
`search_capabilities` and `web_search`. It does not activate paid GUI searches.
Capabilities reports local configuration and budget, not a live provider guarantee.

## Cost and failure behavior

The initial adapter pins the Exa `fast` plugin, five results, one completion,
1,024 output tokens, and no retries or provider fallback. Its documented search
charge is $0.007, allowing at most 714 attempts within $5. It independently
checks the model endpoint's zero-price catalog and completion/generation receipts.
Price or receipt mismatch rejects the result; the provider may already have billed
the request, so the key limit remains the external spending boundary.

The plugin is deprecated upstream in favor of an agent-controlled search tool.
The latter can make multiple calls; this initial adapter uses the documented
single-search plugin to keep the per-request limit predictable. Replacement belongs
behind the search interface, with renewed cost and cancellation tests.

An atomic host-local reservation precedes each paid attempt. Concurrent processes
share the same budget directory. A failed or interrupted paid attempt remains
reserved; it never silently retries or refunds. Reusing its key reports uncertainty.
A successful request replays its durable result without another search. Do not
delete the budget ledger to recover a slot. Stale locks require operator inspection.
Results and URL annotations are untrusted evidence: receipt validation proves
routing and bounded accounting, not the truth of the answer or source contents.

Keep the budget ledger for the lifetime of this allowance, outside Git. It stores
query hashes, not query text. Cached answers and citations are host-local;
review retention before using search for a different data class.

Sources checked 2026-09-12: [plugin and prices](https://openrouter.ai/docs/guides/features/plugins/web-search),
[key limits](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-key),
[generation receipts](https://openrouter.ai/docs/api/api-reference/generations/get-generation).
