# Orvessa for Make

Source of the **Orvessa** custom app for [Make](https://www.make.com). Connect your own messaging
accounts through [Orvessa](https://orvessa.uk), then send messages, check their delivery and call
AI models from Make scenarios, all with one Orvessa API key.

> Status: private beta. The app runs in the ENESTJOY Make organization (zone `eu2.make.com`) and is
> not yet listed publicly. See [CHANGELOG.md](CHANGELOG.md).

## Modules

25 modules in seven groups, plus a universal API call.

### Triggers (instant)

| Module | What it does |
| --- | --- |
| Watch Messages | Fires when a message arrives, or when a message you sent changes status (sent, delivered, read, failed). Filter by event and account; recovered and imported messages can be skipped. |
| Watch Account Events | Fires when an account changes status or finishes connecting, a history import ends, or an e-mail arrives or bounces. |

Both register their webhook in Orvessa when you create it in Make and remove it when you delete it.

### Messaging

| Module | Type | What it does |
| --- | --- | --- |
| Send a Message | Action | Text to a phone number, a username or an existing conversation (picked from a list). |
| Send a File | Action | Uploads a file from any Make module and sends it, with a caption. |
| Get a Message | Action | A message and its status: `pending`, `sent`, `delivered`, `read` or `failed`. |
| List Messages in a Conversation | Search | The chat history, newest first. |
| Download an Attachment | Action | A received or sent file, ready for the next module. |

### Conversations and contacts

| Module | Type | What it does |
| --- | --- | --- |
| List Conversations | Search | An account's conversations, most recently active first. |
| Get a Conversation | Action | A conversation and the person or group it is with. |
| List Contacts | Search | The people an account has exchanged messages with. |

### Accounts

| Module | Type | What it does |
| --- | --- | --- |
| List Connected Accounts | Search | Accounts, filtered by status or provider. |
| Get an Account | Action | Live connection state and supported connect methods. |
| Get Account Limits | Search | Sending limits and how much the last 24 hours used. |
| Create an Account | Action | Creates an account (WhatsApp, Telegram, Bluesky…) and returns the link where its owner connects it. |
| Create a Connect Link | Action | A new connect or reconnect link for an existing account. |
| Reconnect an Account | Action | Restarts a failed, expired or disconnected account. |
| Import Message History | Action | Imports earlier conversations and messages in the background. |
| Get a History Import | Action | The progress of an import. |
| Delete an Account | Action | Deletes an account and everything stored for it. |

### Social

| Module | Type | What it does |
| --- | --- | --- |
| Create a Post | Action | A public post on Bluesky, Mastodon, LinkedIn or X, with an optional image. |

### AI Gateway

| Module | Type | What it does |
| --- | --- | --- |
| Create a Chat Completion | Action | System, user and assistant messages to a model; returns the answer, finish reason and token usage. |
| List AI Models | Search | The models your connected AI providers offer. |
| Test AI Completion | Action | Checks that a model answers. |

### Other

| Module | Type | What it does |
| --- | --- | --- |
| Run an Operation | Action | Any operation an account declares: e-mail, calendar, GitHub, Cloudflare, Telegram bots and more. |
| Make an API Call | Universal | Any call to the Orvessa API with the connection's key. |

Every field you pick from (account, conversation, model, operation, provider) is a list loaded
from Orvessa; in mapping mode you can map the ID instead.

## Connection

The connection takes an **Orvessa API key**, created in the Orvessa dashboard under
*API keys*. Make checks the key by listing your accounts, so it always needs `accounts:read`.
Add only the scopes your scenarios need:

| Scope | Needed for |
| --- | --- |
| `accounts:read` | The connection check, account lists, Get an Account, limits, history progress |
| `accounts:write` | Create an Account, Create a Connect Link, Reconnect, Delete, Import Message History |
| `messages:send` | Send a Message, Send a File, Create a Post |
| `messages:read` | Get a Message, messages, conversations, contacts, attachments |
| `webhooks:manage` | Watch Messages, Watch Account Events |
| `ai:use` | The AI Gateway modules |
| `productivity:read`, `productivity:write` | Run an Operation on e-mail, calendar, GitHub or Cloudflare accounts |

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
test-scenarios/        blueprints of the Make scenarios used to test the app
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
