# Contributing

Thanks for helping improve the Himalayas Remote Jobs API docs and examples.

## What lives here

This repository holds the public documentation, OpenAPI specification, and code
examples for the API. The API itself runs on [himalayas.app](https://himalayas.app)
and is not open source.

## Ways to help

- **Report a docs bug.** If something here doesn't match the API's real
  behaviour, [open an issue](https://github.com/Himalayas-App/remote-jobs-api/issues)
  with the request you made and the response you got.
- **Add an example in a new language.** Rust, Java, C#, Elixir, and .NET are all
  welcome. Match the structure of the existing files in [`examples/`](examples):
  a browse call, a search call, salary formatting, and a comment explaining that
  `companySlug` is the canonical company filter.
- **Improve an existing example.** More idiomatic code and better error handling
  are always welcome.

## Ground rules for examples

- **Standard library first.** Only reach for a dependency when the standard
  library genuinely can't do the job (e.g. `requests` in Python, an XML parser
  for the RSS feed).
- **Runnable as-is.** Someone should be able to copy the file and run it with a
  single command, with no API key and no configuration.
- **Handle `429`.** The API is rate limited; show the reader what that looks like.
- **Server-side only.** The API does not send CORS headers, so don't add examples
  that call it from browser JavaScript.
- **Respect the daily refresh.** Job data updates every 24 hours. Examples that
  loop over the feed should include a delay between requests.

## Reporting an API bug

For problems with the API itself — wrong data, unexpected errors, a listing
that shouldn't be there — email [hi@himalayas.app](mailto:hi@himalayas.app) or
open an issue here.

## Higher rate limits

If you're building something that needs more headroom, email
[hi@himalayas.app](mailto:hi@himalayas.app) and tell us about it.
