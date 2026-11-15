# Orvessa for Make

Source of the **Orvessa** custom app for [Make](https://www.make.com). Connect your own messaging
accounts through [Orvessa](https://orvessa.uk), then send messages, check their delivery and call
AI models from Make scenarios, all with one Orvessa API key.

> Status: private beta. The app runs in the ENESTJOY Make organization (zone `eu2.make.com`) and is
> not yet listed publicly. See [CHANGELOG.md](CHANGELOG.md).

## Modules

### Messaging

| Module | Type | What it does |
| --- | --- | --- |
| Send a Message | Action | Sends text through a connected account, to a phone number or an existing conversation. Pick the account from a list. |
| Get a Message | Action | Returns a message and its status: `pending`, `sent`, `delivered`, `read` or `failed`. |
| List Connected Accounts | Search | Lists your accounts, filtered by status or provider, one bundle per account. |

### AI Gateway

| Module | Type | What it does |
| --- | --- | --- |
| Create a Chat Completion | Action | Sends system, user and assistant messages to a model and returns the answer, finish reason and token usage. |
| List AI Models | Search | Lists the models your connected AI providers offer, one bundle per model. |
| Test AI Completion | Action | Sends a short test prompt to a model, to check it answers. |

Every field you pick from (account, model) is a list loaded from Orvessa; in mapping mode you
can map the ID instead.

## Connection

The connection takes an **Orvessa API key**, created in the Orvessa dashboard under
*API keys*. Make checks the key by listing your accounts, so it always needs `accounts:read`.
Add only the scopes your scenarios need:

| Scope | Needed for |
| --- | --- |
| `accounts:read` | The connection check, List Connected Accounts, the account list in Send a Message |
| `messages:send` | Send a Message |
| `messages:read` | Get a Message |
| `ai:use` | Create a Chat Completion, List AI Models, Test AI Completion |

## Errors

Errors show Orvessa's own message, its code and the request ID, for example
`[404] Message not found. Request ID: aeac6e11-…`. The error type tells Make what to do:

| Status | Make error type | Effect |
| --- | --- | --- |
| 400, 404, 409, 501 | `DataError` | Stops the module; the data must change. |
| 401 | `InvalidAccessTokenError` | The key was refused; update the connection. |
| 403 | `RuntimeError` | Missing scope, suspended workspace or plan limit. |
| 429 | `RateLimitError` | Make waits and resumes. |
| 502 | `RuntimeError` | The connected service or AI provider refused the request; not retried. |
| 500, 503, 504 | `ConnectionError` | Temporary; Make retries later. |

orvessa.uk is served through Cloudflare, which replaces the body of a 502, 503 or 504 with its
own text, so those three show a fixed explanation instead of Orvessa's message.

## AI models

The AI modules use the providers the workspace owner connected in Orvessa (Groq, Google Gemini,
OpenRouter, Mistral, Cloudflare Workers AI or a custom endpoint). A model is written
`provider/model`, for example `groq/openai/gpt-oss-20b`. Pick it from the list: providers retire
models, and a retired model fails with a 502.

Make waits at most 40 seconds for a module. Slow reasoning models (for example
`gemini/gemini-flash-latest`) can exceed that; prefer fast ones such as
`gemini/gemini-flash-lite-latest` or `groq/openai/gpt-oss-20b`, or set *Maximum tokens*.

## Repository layout

```
make-app.json          which Make app and zone this repository holds
src/                   the app, one file per section, as Make stores it
  app.json             name, description, theme
  base.jsonc           base URL, auth header, shared error handling
  groups.jsonc         how modules are grouped in the scenario editor
  readme.md            documentation shown in Make
  connections/<name>/  connection: parameters, API call that validates it
  modules/<name>/      one folder per module: component.json, api, parameters, interface...
  rpcs/<name>/         dynamic option lists (for example, models and accounts)
scripts/make-app.mjs   pull, push and validate (Node 22+, no dependencies)
docs/                  development guide and troubleshooting notes
```

## Development

```bash
cp .env.example .env      # then put a Make API token with sdk-apps:read and sdk-apps:write in it
npm run pull              # download the app from Make into src/
npm run validate          # check every section offline
npm run push:dry          # see what would change in Make
npm run push              # upload the changes
```

`pull` and `push` never touch the *common* data of the app or its connections (client IDs and
secrets). `validate` also fails when a file looks like it contains a token.

Details: [docs/development.md](docs/development.md). Known problems and their fixes:
[docs/troubleshooting.md](docs/troubleshooting.md).

## Support

Questions and problems: open an issue in this repository.
