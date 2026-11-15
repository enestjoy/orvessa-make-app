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

**Still to change.**

- In this app: map Orvessa's errors in `base.jsonc` so a refused request shows Orvessa's
  message and is not retried as an outage, and offer the model as a list from
  *List AI Models* instead of a typed ID.
- In Orvessa: answer a provider's "model not found" with a 4xx error that names the model, and
  stop listing a provider's default model when the provider no longer offers it.

## "Status Code Error: 400" on Send a Message

Make shows only the status when the app does not read the error body. Orvessa's body says
what was wrong (`error.message`, for example an unknown account or a phone number in the wrong
format). The error mapping in `base.jsonc` brings that message into the scenario.

## "Maximum number of active scenarios has been exceeded"

The Make plan limits how many scenarios can be active at once. The test scenarios run on
demand: activate one, run it, then deactivate it.
