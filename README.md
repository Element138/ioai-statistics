# IOAI Statistics

[IOAI Statistics](https://ioai-statistics.org) is an unofficial reporting archive of
International Olympiad in Artificial Intelligence results, delegations,
countries, contestants, awards, and tasks.

The site is a statically exported Next.js application. It does not require a
database or server-side functions in production.

## Development

Node.js 22.13 or newer is required.

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run lint
npm test
```

`npm run build` writes the static site to `out/`.

## Deployment

Vercel builds and deploys `main` using the settings in `vercel.json`. The
production site is served at [ioai-statistics.org](https://ioai-statistics.org).

## Status and attribution

This project is independent and is not affiliated with or endorsed by the
official IOAI organization. Results pages link to their official source where
available. Corrections can be reported through the contact details published
on the website.
