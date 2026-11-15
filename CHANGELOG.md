# Changelog

All notable changes to the Orvessa app for Make. Versions follow the app version in Make.

## Unreleased

### Added

- Repository with the app's source and `scripts/make-app.mjs` to pull, push and validate it
  through Make's API.
- Development guide and troubleshooting notes.

### Fixed

- AI test scenarios used models the providers had retired; they now use current models
  (see [docs/troubleshooting.md](docs/troubleshooting.md)).

## 1 (2026-11-15)

- First version, created in Make: connection with an Orvessa API key; modules List Connected
  Accounts, Send a Message, Get a Message, List AI Models and Test AI Completion.
