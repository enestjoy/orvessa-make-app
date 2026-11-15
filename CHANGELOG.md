# Changelog

All notable changes to the Orvessa app for Make. Versions follow the app version in Make.

## Unreleased

### Added

- **Create a Post**: public posts on Bluesky, Mastodon, LinkedIn and X, with an account list
  of the accounts that can post (from Orvessa's capability discovery).
- **Create a Chat Completion**: system, user and assistant messages, maximum tokens and
  temperature; returns the answer, finish reason, model and token usage.
- Account and model lists (RPCs `rpcAccounts`, `rpcAiModels`) for Send a Message, Create a
  Chat Completion and Test AI Completion. The account list shows messaging accounts only.
- Send a Message can address an existing conversation as well as a phone number.
- List Connected Accounts filters by status and provider and pages through every account.
- Output fields (interface) and samples for every module, so later modules can map them.
- Module groups *Messaging* and *AI Gateway*; documentation shown in Make.
- Repository with the app's source and `scripts/make-app.mjs` to pull, push and validate it
  through Make's API; development guide and troubleshooting notes.

### Changed

- List AI Models and List Connected Accounts are search modules: one bundle per item, with a
  limit.
- Test AI Completion returns the answer as fields instead of the raw response, and asks in
  English.

### Fixed

- Errors show Orvessa's message, code and request ID instead of `Status Code Error: 400`, and
  their type matches the cause: a refused request is no longer retried as "Service is
  temporarily unavailable".
- The connection check read the error from the wrong field.
- AI test scenarios used models the providers had retired; they now use current models
  (see [docs/troubleshooting.md](docs/troubleshooting.md)).

## 1 (2026-11-15)

- First version, created in Make: connection with an Orvessa API key; modules List Connected
  Accounts, Send a Message, Get a Message, List AI Models and Test AI Completion.
