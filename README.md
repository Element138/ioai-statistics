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
available. Inquiries, including corrections and privacy requests, can be made
through the contact details published on the website.

## Public-interest purpose and responsible use

This repository and the website it operates are published for public-interest
reporting, archiving, education, and transparency concerning officially
published IOAI records. The archive includes names, affiliations, and results
that may constitute personal information. Anyone reusing the repository or its
data is responsible for ensuring that their use is lawful, fair, accurate,
proportionate, and compliant with all applicable privacy, data-protection, and
other laws. The data should not be used to harass, target, discriminate against,
or make consequential decisions about any person.

The software is provided under the MIT License and, like the archive data, is
provided without any guarantee of completeness, accuracy, or fitness for a
particular purpose. The MIT License does not grant rights in third-party source
materials, names, logos, or personal information, and it does not remove any
legal obligations that apply to a user's own processing or republication of the
data. Official sources remain authoritative. Please report an accuracy or
privacy concern through the inquiries contact published on the website.

## License

The software in this repository is licensed under the [MIT License](LICENSE).
