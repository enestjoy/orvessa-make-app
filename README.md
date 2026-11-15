# Orvessa for Make

Source of the **Orvessa** custom app for [Make](https://www.make.com). Connect your own messaging
accounts through [Orvessa](https://orvessa.uk), then send messages, check their delivery and call
AI models from Make scenarios, all with one Orvessa API key.

> Status: private beta. The app runs in the ENESTJOY Make organization (zone `eu2.make.com`) and is
> not yet listed publicly. See [CHANGELOG.md](CHANGELOG.md).

## Modules

| Module | Type | What it does |
| --- | --- | --- |
| List Connected Accounts | Search | Lists the accounts connected to your Orvessa workspace. |
| Send a Message | Action | Sends a text message through a connected account. |
| Get a Message | Action | Returns the status and details of a message Orvessa sent. |
| List AI Models | Search | Lists the AI models you can use through the Orvessa AI Gateway. |
| Test AI Completion | Action | Sends a short prompt to a chosen model, to check it answers. |

## Connection

The connection takes an **Orvessa API key**, created in the Orvessa dashboard under
*API keys*. Give the key only the scopes your scenarios need:

| Scope | Needed for |
| --- | --- |
| `accounts:read` | List Connected Accounts |
| `messages:send` | Send a Message |
| `messages:read` | Get a Message |
| `ai:use` | List AI Models, Test AI Completion |

Make checks the key when you save the connection.

## AI models

The AI modules use the providers the workspace owner connected in Orvessa (Groq, Google Gemini,
OpenRouter, Mistral, Cloudflare Workers AI or a custom endpoint). A model is written
`provider/model`, for example `groq/openai/gpt-oss-20b`. Pick it from **List AI Models**:
providers retire models, and a retired model fails with *model not found*.

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
