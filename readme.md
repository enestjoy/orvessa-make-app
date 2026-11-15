Orvessa lets you connect your own messaging accounts (WhatsApp, Telegram and others) and AI
providers once, then use them from one API. With this app you can send messages through those
accounts, follow their delivery, and call AI models from your scenarios.

## Connect

1. In Orvessa, open **API keys** and create a key.
2. Give it `accounts:read`, plus the scopes of the modules you use: `messages:send` (Send a
   Message), `messages:read` (Get a Message) and `ai:use` (AI modules).
3. In Make, add an Orvessa connection and paste the key.

## Modules

- **Send a Message**: sends text through a connected account, to a phone number or an existing
  conversation. The message starts as `pending`.
- **Get a Message**: returns a message and its status (`sent`, `delivered`, `read` or `failed`).
- **List Connected Accounts**: your accounts and their status.
- **Create a Chat Completion**: sends messages to an AI model and returns its answer.
- **List AI Models**: the models your connected AI providers offer.
- **Test AI Completion**: checks that a model answers.

## Errors

Errors show Orvessa's own message, its code and a request ID. A refused request (wrong data,
missing scope, unknown model) stops the module; rate limits and temporary outages are retried.
