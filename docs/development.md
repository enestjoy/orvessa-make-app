# Development

## Workflow

1. `npm run pull` before you start, so `src/` matches what runs in Make. Someone may have changed
   the app in Make's web editor.
2. Edit the files in `src/`. Sections are JSONC: comments and trailing commas are allowed, and
   Make keeps them.
3. `npm run validate`, then `npm run push:dry` to see what would be sent.
4. `npm run push`. Only sections that differ from Make are uploaded; `--force` sends all of them.
5. Run a test scenario in Make (see below), then commit.

A component folder that exists in `src/` but not in Make is created on push. A component that
exists only in Make is reported and left alone; delete it in Make's editor if you mean to.

## Files of a module

| File | Make section |
| --- | --- |
| `component.json` | name, label, description, `typeId`, connection |
| `api.jsonc` | Communication: the request and how the response maps to output |
| `parameters.jsonc` | Static parameters (set once, such as the connection) |
| `expect.jsonc` | Mappable parameters (the fields a user fills in or maps) |
| `interface.jsonc` | Output fields, so later modules can map them |
| `samples.jsonc` | Sample output shown before the first run |
| `scope.jsonc` | OAuth scopes the module needs |
| `epoch.jsonc` | "Choose where to start" for polling triggers |

`typeId`: 1 trigger, 4 action, 9 search, 10 instant trigger, 11 responder, 12 universal.

## Conventions

- Shared behavior lives in `base.jsonc`: base URL, the `Authorization` header and error handling.
  Modules only describe their own request.
- Errors keep Orvessa's own message and code (`error.code`, `error.message`, `error.request_id`),
  so a failed run says what to fix.
- Retries follow Orvessa's `error.action`: `retry` and `pause` are temporary, `fix` and `skip`
  are not. A request the server refused is never presented as "service unavailable".
- Every option list a user picks from (accounts, models) comes from an RPC, not from typed IDs.
- Labels and help texts are in English, in sentence case, and say what the field does.

## Testing in Make

The test scenarios live in the ENESTJOY team (`eu2.make.com`, team 1044537):

| Scenario (ID) | Checks |
| --- | --- |
| Orvessa AI Test, chat completion (10166646) | Create a Chat Completion; returns text, finish reason, model and tokens as scenario outputs |
| Orvessa Messaging Test, read only (10166671) | List Connected Accounts or Get a Message, with outputs; sends nothing |
| Orvessa AI Gateway, Test modele (10164883) | List AI Models |
| Orvessa AI Gateway, Test răspuns Groq (10164892) | Test AI Completion with a Groq model |
| Orvessa AI Test, gemini (10164893) | Test AI Completion with a Gemini model |
| Orvessa AI Test, openrouter (10164894) | Test AI Completion with an OpenRouter free model |
| Integration Orvessa (10164878) | Send a Message, then Get a Message, with outputs (**sends a real message**; change the idempotency key before each run, or Orvessa returns the earlier message) |

They run on demand, so they spend operations only when you start them. The plan allows two
active scenarios at a time: activate, run, deactivate.

The two scenarios with outputs end in *Return output*, so a run started through the Make API
or MCP returns the module's fields, which makes it easy to check the mapping of a response.
To check error handling, map a wrong value (an unknown model, a random message ID) and read
the error the run returns.

The option lists (RPCs) can be run on their own through the Make API or MCP
(`rpc_execute` with `rpcAccounts` or `rpcAiModels` and the connection ID).

## Last verified

2026-11-15, after the error-handling and module rewrite:

| Check | Result |
| --- | --- |
| Create a Chat Completion, Groq and Gemini *lite* | Answer, `stop`, model and tokens returned |
| Test AI Completion, Groq and OpenRouter | Passed |
| Test AI Completion, `gemini/gemini-flash-latest` | Passed once in 4 s, timed out (40 s) once |
| List AI Models, List Connected Accounts (with filter) | Passed |
| Account and model lists (RPCs) | Return messaging accounts and current models |
| Unknown model | `[400] … (VALIDATION_FAILED) Request ID: …`, `DataError` |
| Retired model | `[502]` with the explanation, `RuntimeError`, not retried |
| Unknown message ID | `[404] Message not found. Request ID: …`, `DataError` |
| Send a Message, then Get a Message | `pending` on send, `delivered` seconds later (WhatsApp) |
