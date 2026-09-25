# Recover

A private book-cover library built with Next.js, shadcn/ui, BetterAuth, Prisma 7, and MySQL. Upload a flat book-cover image, identify its title and author with OpenAI, and enhance the cover while extending its background to produce a 1072 × 1448 JPEG. Originals, results, and thumbnails are stored as binary MySQL MEDIUMBLOB values.

## Local setup

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env` and fill in credentials. Generate a random `BETTER_AUTH_SECRET`; keep secrets server-side.
3. Start the local database with `docker compose up -d`. The existing initialization script creates `app_dev`, `app_test`, and `app_shadow`.
4. Run `npm run db:generate` and `npm run db:migrate` (Prisma migrate deploy).
5. Set `OPENAI_API_KEY` to an API project key with access to the configured models.
6. Run `npm run dev` and open http://localhost:3000.

The Prisma CLI configuration is `prisma7.config.ts`; package scripts explicitly pass this path. All schema changes are defined in `prisma/schema.prisma` and deployed through Prisma migrations. Generate future migrations with `prisma migrate dev --config prisma7.config.ts --name <name>` on a development database. Do not edit production tables directly or use `db push` for deployment.

## Processing and privacy

- `POST /api/uploads` accepts multipart `id` (client-generated UUID) and `image`, validates the actual image, stores it, and returns the record. Repeating the same ID for the same account returns the same upload.
- `POST /api/uploads/:id/process` runs synchronously. No external queue or storage service is used. A saved `queued` record means “ready to process”, not an automatically scheduled background job.
- OpenAI Responses extracts nullable title/author from the original. Images edit enhances and extends a 1072 × 1456 canvas for every upload; Sharp crops the extra rows and exports exactly 1072 × 1448. Low-resolution sources may still lack fine detail, so users should upload a larger image if the result is unclear.
- Metadata failure does not fail a successful image. Users can edit metadata afterward.
- A short Prisma transaction locks the user row when claiming work or enforcing quotas. No transaction is held during an OpenAI request. One active processing request is allowed per account across Vercel instances.
- SDK retries are disabled to avoid repeating chargeable edits. Manual retries consume another daily attempt. A finished upload's process endpoint is idempotent.
- A 310-second database lease recovers interrupted requests on subsequent history/status access. Tokens prevent an expired attempt from overwriting a newer one. This is request processing, not a durable job runner; closing the page or a host interruption can require a manual retry.
- Image, metadata, mutation, and history endpoints check session ownership. Mutating API calls require the site's Origin header. Images have private, no-store responses and bypass the public image optimizer.
- Images are sent to OpenAI for processing. Text response storage is disabled. Application errors do not log image bytes or provider payloads.

## Limits

- 4,000,000 bytes per uploaded image and a bounded 4,100,000-byte multipart request, leaving headroom under Vercel's 4.5 MB request limit.
- JPEG, PNG, or WebP, single-frame only, at most 20 megapixels. Actual decoding is validated before storage.
- Processed JPEGs are capped at 4,000,000 bytes, so authenticated downloads also fit Vercel's response limit.
- `MAX_SAVED_UPLOADS=50` and `DAILY_PROCESSING_LIMIT=10` by default. Attempts reset at midnight UTC; deleting a cover does not reset usage.
- The allowance is per account, not a global spending cap. Configure OpenAI project budgets/rate limits appropriate to your audience before a public launch.

## Vercel + Simply.com

1. Obtain Simply.com's external MySQL hostname and credentials. Confirm remote connections from Vercel, TLS support, storage capacity, and connection limits. If a fixed outbound IP is required, resolve that hosting requirement before deployment.
2. Configure `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (deployed HTTPS origin), `OPENAI_API_KEY`, and model/limit settings in Vercel. Keep preview and production databases separate.
3. Set `DATABASE_SSL=true` for verified TLS. If the host requires a private CA, set `DATABASE_SSL_CA` to its PEM certificate (literal `\n` is supported). Do not disable certificate verification. Prisma's migration CLI uses TLS options in `DATABASE_URL` independently of the application's `DATABASE_SSL`; configure the host's required Prisma MySQL TLS URL parameters for migrations too.
4. Confirm MySQL `max_allowed_packet` accommodates images plus statement overhead (at least 8 MiB recommended). Monitor database size and backups; originals, results, and thumbnails all use space.
5. Run `npm run db:migrate` against production from a trusted deployment environment before serving the new app. Migrations are deliberately separate from builds so preview builds cannot change production schema.
6. Deploy with `npm run build`, which generates Prisma Client first. Enable Fluid Compute. Processing uses Node.js and `maxDuration=300`, with a 240-second application deadline. Choose a function region near the database. Each instance uses two database connections; total connections still depend on scaling.
7. Verify sign-up/sign-in, writes, and one real OpenAI edit on the deployed environment. Tests do not deploy or spend OpenAI credits.

Defaults are `gpt-image-2` for editing and `gpt-4.1-mini` for reading book details. `OPENAI_IMAGE_MODEL` must support the `1072x1456` edit size; fixed-size models are not drop-in replacements. Availability depends on the OpenAI project. Never set `OPENAI_BASE_URL` in production unless using a deliberately trusted compatible provider; tests use this SDK setting for a localhost mock.

## Checks

```sh
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests use local `app_test`, apply Prisma migrations, and start Next.js on port 3011 and a mock OpenAI server on port 4011. `TEST_DATABASE_URL` can override the database only with a localhost name ending in `_test`. Tests cover the user flow, exact dimensions, ownership, CSRF origins, deduplication, concurrency, quotas, and deletion. Screenshots/traces are saved under ignored `test-results/`.

If Turbopack cannot open its compiler IPC port, use `npm run build -- --webpack` and `npm run dev -- --webpack`.
