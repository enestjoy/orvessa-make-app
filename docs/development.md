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

Test scenarios are not kept in Make; their blueprints are in [`test-scenarios/`](../test-scenarios).
Create one when you need it (Make: *Create a new scenario* > *Import blueprint*, or the Make API
or MCP), replace the `<...>` placeholders with your connection ID and test values, set it to
run on demand, and delete it afterwards.

| Blueprint | Checks |
| --- | --- |
| `chat-completion.json` | Create a Chat Completion; returns text, finish reason, model and tokens |
| `list-accounts.json` | List Connected Accounts with a filter; sends nothing |
| `send-and-check-message.json` | Send a Message, then Get a Message (**sends a real message**; use a new idempotency key for each run, or Orvessa returns the earlier message) |

Each ends in *Return output*, so a run started through the Make API or MCP returns the module's
fields, which makes it easy to check the mapping of a response. The plan allows two active
scenarios at a time.
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
| Send a Message, then Get a Message: WhatsApp | `pending` on send, `delivered` seconds later |
| Send a Message, then Get a Message: Telegram (`+phone`) | `pending`, then `sent` |
| Send a Message: Bluesky (`@enestjoy.bsky.social`) | `failed`, `error_code` `invalid_message`; probably a message to the account itself |
| Send a Message, then Get a Message: Mastodon (`@user@mastodon.social`) | `pending`, then `sent` (direct post) |
| Create a Chat Completion, every provider (2026-11-15, all-scope key) | Groq, Gemini, GitHub, Codex and an OpenRouter free model answered; `openrouter/google/gemma-4-31b-it:free` was unavailable (502) at that moment |

Sending is asynchronous: Send a Message succeeds when Orvessa queues the message. A message
that the service refuses later shows up as `failed` with an `error_code` in Get a Message (or
the `message.failed` webhook), not as a module error.
