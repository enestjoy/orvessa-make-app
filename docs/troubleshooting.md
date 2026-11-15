# Troubleshooting

## "Service is temporarily unavailable" on an AI module (2026-11-15)

**Symptom.** *Test AI Completion* failed with `ConnectionError: Service is temporarily
unavailable.` after about 10 seconds, for Groq, Gemini and OpenRouter alike. *List AI Models*
worked.

**Cause.** The scenarios asked for models the providers have retired:
`groq/llama-3.3-70b-versatile`, `gemini/gemini-2.5-flash` and
`openrouter/openai/gpt-oss-20b:free`. Each provider answered `404 model not found`. Orvessa turned
that into `502 PROVIDER_ERROR`, and Make treats a 5xx answer as a temporary outage: it retried
for 10 seconds, then reported the service as unavailable. The real reason never reached the
scenario.

**Fix applied.** The test scenarios now use models the providers serve today, and each passed:

| Provider | Model |
| --- | --- |
| Groq | `groq/openai/gpt-oss-20b` |
| Google Gemini | `gemini/gemini-flash-lite-latest` |
| OpenRouter | `openrouter/google/gemma-4-31b-it:free` |

`gemini/gemini-flash-latest` did not answer within Make's 40-second module limit; use the
*lite* model for quick calls.

**Fixed in the app.** `base.jsonc` maps Orvessa's errors: a 502 is now a `RuntimeError` with an
explanation (pick another model), not a retried outage; 4xx errors quote Orvessa's message and
request ID. The model is picked from a list of the models offered now.

**Found while fixing it.** orvessa.uk is behind Cloudflare, which replaces the body of a 502
with its own `error code: 502`. Orvessa's JSON (code, message, request ID) never reaches Make
for a 502, so the app shows a fixed message for 502, 503 and 504.

**Still to change in Orvessa.**

- Answer a provider's "model not found" with a 4xx error that names the model (a 4xx body
  passes through Cloudflare), and stop listing a provider's default model when the provider
  no longer offers it.
- `GET /v1/ai/models` also lists models that cannot chat (text-to-speech, transcription,
  embeddings, image models). The model lists in Make show them too.

## "Status Code Error: 400" on Send a Message

Make showed only the status because the app did not read the error body. Orvessa's body says
what was wrong (`error.message`, for example an unknown account or a phone number in the wrong
format); `base.jsonc` now brings that message into the scenario.

## "Maximum number of active scenarios has been exceeded"

The Make plan limits how many scenarios can be active at once. The test scenarios run on
demand: activate one, run it, then deactivate it.
