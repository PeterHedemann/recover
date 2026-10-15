# Recover: iOS frontend implementation guide

This document describes the backend implemented in this repository, inspected on 2026-10-15. Paths are relative to the deployed site's origin. It is a source-based integration guide; a deployed server was not exercised while preparing it.

## Product and screens

Recover is a private book-cover library. Users upload a flat cover image, choose an ebook-reader output resolution, and ask the server to enhance the image and extend its artwork to fit. The server uses OpenAI to read the title/author and generate the artwork, then exports a JPEG with book metadata. Users can review original/result images, correct book details, download images, delete covers, and send a finished cover directly to a BOOX reader on their local network.

Implement these native screens:

- Sign up / sign in, plus persistent session restoration and sign out.
- Library: paginated thumbnails, title (fall back to filename), author, status, creation date, and saved-cover count/limit.
- Upload: pick one image, preview it, choose a saved resolution, upload, start processing, and show progress.
- Cover detail: original/result comparison, progress/errors, editable title/author after completion, retry for failed/queued covers, download/share, delete confirmation, and optional BOOX transfer.
- Settings: saved output resolutions, locally stored BOOX address, account display name/password, and optional passkey management.

The backend is Next.js with Better Auth, Prisma, and MySQL. All images and account data stay behind authenticated endpoints; the server alone needs database/OpenAI credentials. Use the HTTP API rather than scraping pages or invoking Next.js Server Actions.

## Base URL and native authentication

Configure one backend origin, e.g. `https://your-recover-host.example`, matching the server's `BETTER_AUTH_URL`. No production hostname is specified in the repository. Local development defaults to `http://localhost:3000`; a physical phone needs a reachable development host instead of its own localhost.

Email/password auth already supports native sessions through Better Auth's bearer plugin:

1. Send the sign-in or sign-up JSON request below.
2. Read the successful response's **`set-auth-token` header** and save its entire value in the iOS Keychain. Preserve signatures/encoding; do not split, decode, or reconstruct it from the JSON body.
3. Send `Authorization: Bearer <stored-token>` on authenticated requests, including image downloads.
4. Inspect subsequent auth responses for `set-auth-token` and replace the saved value when present. This includes session renewal and password changes. There is no separate refresh-token endpoint or JWT decoding requirement.
5. On `GET /api/auth/get-session` returning JSON `null`, or an application API returning `401`, clear the session and request sign-in.
6. Sign out on the server, then remove local credentials and account-specific in-memory data.

Use a dedicated native HTTP session with cookie storage and automatic cookie handling disabled, including for auth calls. Do not send even an empty `Cookie` header. Normal native bearer requests can omit `Origin`; cookie-bearing Better Auth requests require a trusted origin. Application mutations also reject an explicitly supplied untrusted `Origin`, even with a bearer token. Valid bearer headers on application endpoints prevent fallback to an ambient browser cookie session.

For JSON requests use `Content-Type: application/json`. For multipart requests let the multipart encoder supply the content type and boundary. Never put bearer tokens in query strings or send them to a BOOX device. Keep credentials out of logs.

### Core auth and account endpoints

All paths in this table start with `/api/auth`. These are Better Auth endpoints exposed by the catch-all handler, not custom upload endpoints.

| Method / path | Request | Successful result / purpose |
| --- | --- | --- |
| `POST /sign-up/email` | `{ "name": "Reader", "email": "reader@example.com", "password": "a-strong-password" }` | Creates an account and, with the current configuration, signs in. HTTP 200, user/token JSON and `set-auth-token`. |
| `POST /sign-in/email` | `{ "email": "reader@example.com", "password": "a-strong-password" }` | HTTP 200, user/token JSON and `set-auth-token`. Use the header as the native credential. |
| `GET /get-session` | Bearer header | HTTP 200 with `{ "session": { ... }, "user": { ... } }`, or `null` when unauthenticated. Use for launch/session restoration and refreshing account data. |
| `POST /sign-out` | Bearer header and `{}` | Revokes the current session; HTTP 200 with success indication. |
| `POST /update-user` | Bearer header and `{ "name": "New name" }` | Updates display name; HTTP 200, `{ "status": true }`. Match the website's validation: trimmed, nonempty, at most 100 characters. Refresh session/user afterward. |
| `POST /change-password` | Bearer header and `{ "currentPassword": "old-password", "newPassword": "new-password", "revokeOtherSessions": true }` | HTTP 200, `{ "token": ..., "user": { ... } }`. With `revokeOtherSessions: true`, the installed library revokes existing sessions and creates a replacement current session. Persist the new `set-auth-token` header before making further requests. |

Use valid email addresses and passwords of 8–128 characters (the installed Better Auth defaults). Repeat/confirm password fields are client-side UI checks and are not sent. Match website password changes by revoking other sessions. User fields include `id`, `name`, `email`, `emailVerified`, nullable `image`, `createdAt`, and `updatedAt`; session fields include `id`, `userId`, and `expiresAt`. Treat IDs as opaque strings and dates as ISO 8601 timestamps. Decode only the fields the app needs; do not persist the entire session response as the bearer credential.

Auth errors have Better Auth's own JSON shape, typically `{ "code": "...", "message": "..." }`, rather than the application API's `{ "error": "..." }`. Handle both formats and non-JSON proxy/network errors. Auth rate limiting is separate from processing quotas.

There is no configured password-reset email delivery, email verification delivery, social/Apple sign-in provider, or enabled account-deletion flow. Do not present these as working backend features without adding support.

## Application API conventions and models

Every `/api/uploads...` and `/api/resolutions` operation requires authentication and scopes data to the current user. Missing and other users' cover/image IDs return `404`. JSON successes and errors use `Cache-Control: private, no-store`.

### Cover JSON

Upload creation, detail reads, successful processing, and metadata updates return this same object directly, without a wrapper:

```json
{
  "id": "a-client-generated-uuid",
  "filename": "cover.png",
  "status": "queued",
  "stage": null,
  "title": null,
  "author": null,
  "error": null,
  "metadataWarning": null,
  "createdAt": "2026-10-15T10:00:00.000Z",
  "finishedAt": null,
  "attemptCount": 0,
  "outputWidth": 1072,
  "outputHeight": 1448
}
```

- `status`: `queued`, `processing`, `finished`, or `failed`.
- `stage`: nullable string. Current values are `preparing`, `extending`, and `exporting`. Display a generic processing label for unknown values.
- Title, author, error, metadataWarning, finishedAt, and output dimensions are nullable. Legacy null dimensions use 1072 × 1448 when processed.
- `attemptCount` counts processing starts for this cover, including failed attempts. It is not the account's remaining daily allowance.
- A finished image may still have missing metadata and a `metadataWarning`. This is a successful transformation with correctable book details.
- Image bytes, image URLs, original dimensions, lease/token internals, and `updatedAt` are not included. Construct authenticated image URLs from the cover ID.

### Endpoint inventory

| Method / path | Purpose | Success |
| --- | --- | --- |
| `GET /api/uploads?page=1` | Read library page | 200, library object described below |
| `POST /api/uploads` | Save original image and initial thumbnail | 201, Cover |
| `GET /api/uploads/{id}` | Read one cover/status | 200, Cover |
| `POST /api/uploads/{id}/process` | Start processing or manually retry | 200, finished Cover after synchronous work |
| `PATCH /api/uploads/{id}` | Correct finished cover metadata | 200, Cover |
| `DELETE /api/uploads/{id}` | Delete cover and all its images | 200, `{ "deleted": true }` |
| `GET /api/uploads/{id}/image/{kind}` | Read image bytes; kind is `original`, `result`, or `thumbnail` | 200, binary image |
| `GET /api/resolutions` | List/initialize saved output presets | 200, Resolution array |
| `POST /api/resolutions` | Create preset or rename matching dimensions | 201, Resolution |
| `DELETE /api/resolutions` | Delete preset specified in JSON body | 200, `{ "ok": true }` |

### Library and detail reads

`GET /api/uploads?page=1` returns:

```json
{ "items": [], "total": 0, "page": 1, "pages": 1, "limit": 50 }
```

`items` contains Cover objects. Page size is fixed at **12**. Sorting is creation time descending, then ID descending. Page must be an integer from 1 to 10000; invalid values return `400`. `pages` is at least 1, even for an empty library. A page beyond the available data returns an empty `items` array. There is no cursor, search, filter, or configurable page-size API. `limit` is the maximum number of saved covers, not the page size.

Library/detail reads also recover expired processing leases by marking those covers failed. Read the current state after interrupted requests and when the app returns to the foreground.

### Resolution presets

Resolution JSON is `{ "id": "opaque-id", "name": "My reader", "width": 1072, "height": 1448 }`.

- `GET /api/resolutions` returns a plain array. If the account has no presets, it seeds **1072 × 1448** automatically. That preset comes first when present; other presets sort by width then height ascending.
- `POST /api/resolutions` accepts `{ "name": "My reader", "width": 1072, "height": 1448 }`. Name is trimmed, 1–80 characters. Dimensions must be JSON numbers, integers, each **256–4096 inclusive**. The JSON request body is capped at 2048 bytes.
- Width/height pairs are unique per account. Posting an existing pair updates its name and returns its existing ID; it does not create a duplicate. There is no separate PATCH operation.
- `DELETE /api/resolutions` accepts `{ "id": "preset-id" }`. Unknown/unowned ID returns `404`; deleting the last preset returns `409`.
- An upload stores a snapshot of the selected dimensions. Renaming/deleting presets does not change existing cover outputs. There is no endpoint to change an existing upload's resolution; create a new upload with a new UUID.

### Create upload

`POST /api/uploads` uses multipart form data with all of these fields:

| Field | Value |
| --- | --- |
| `id` | Client-generated UUID string. Generate once for the chosen upload and reuse when retrying its submission. |
| `resolutionId` | ID of one of this user's saved resolutions. Fetch presets before uploading. |
| `image` | Exactly one file, with filename and JPEG/PNG/WebP content. |

The actual image is decoded/validated server-side. Restrictions: **4,000,000 bytes** per file, **4,100,000 bytes** for the complete multipart request, at most **20,000,000 pixels**, and single-frame JPEG/PNG/WebP only. HEIC is not accepted; convert iOS photo selections to an accepted format and fit these limits before upload. Filenames are stored up to 255 characters.

Success is `201` with a queued Cover; uploading alone does **not** start processing. The server preserves original bytes and creates a JPEG thumbnail. Reusing an existing UUID belonging to the same user returns that existing Cover with `201`, without replacing its file or dimensions. The request still must contain a valid image and currently owned resolution before this deduplication check. Another user's UUID returns `409`.

The saved-cover limit defaults to 50 and can be configured server-side. All saved statuses count. At the limit, new creation returns `409`; delete a cover to free space. Use the library's `limit` value instead of hardcoding 50.

### Start processing and handle interruptions

`POST /api/uploads/{id}/process` requires no body. It holds the HTTP request open and returns the finished Cover on success. It is **not** a job-enqueue endpoint and does not return a job ID or `202`.

- Start it after creating a queued upload, or explicitly when the user retries a failed cover.
- Poll `GET /api/uploads/{id}` approximately every 3 seconds while the processing request runs. Stages are descriptive, not numeric percentages.
- Only one cover can process at a time per account, across devices/server instances. Another processing start returns `409`.
- Default daily quota is **10 processing attempts per account**, configurable on the server. Attempts reset at **midnight UTC**. Failures/retries consume attempts; deleting covers does not restore quota. There is no usage/remaining-attempt endpoint.
- A finished cover's process call returns the existing finished Cover without another attempt. It cannot regenerate a finished image. The route currently initializes the provider client before that check, so missing server provider configuration can still return `503`.
- The application deadline is **240 seconds**; the route's hosting duration is **300 seconds**. Give the native processing request a timeout comfortably above 240 seconds. The database lease is **310 seconds**; a subsequent read can mark an interrupted attempt failed after expiration.
- There is no durable queue, push notification, SSE, WebSocket, cancellation endpoint, or guaranteed completion after iOS suspends the app or a connection/host is interrupted. Polling does not itself start work.
- On timeout or lost response, fetch the cover first. If finished, use it; if processing, continue observing; if queued/failed, offer an explicit start/retry. Avoid automatic retries of processing POSTs because they can spend another attempt.

Processing failures normally return `{ "error": "human-readable message", "id": "upload-id" }` with `502` or an application-specific status, and mark the cover failed. Failures before a claim use the normal `{ "error": "..." }` shape and may leave it queued. Refresh detail to reconcile UI state.

### Edit and delete a cover

`PATCH /api/uploads/{id}` accepts exactly `{ "title": "Book title", "author": "Author name" }`. Both fields are required strings, trimmed, at most 500 characters each; additional keys are rejected. Send an empty string to clear a value (stored as null); do not send JSON null. Body limit is 10,000 bytes.

Editing requires `finished`, otherwise `409`. It updates the database and rewrites the result JPEG's EXIF/XMP metadata, clears `metadataWarning`, and returns the updated Cover. Fetch result bytes again after editing if displaying/sharing a previously loaded result. It does not regenerate artwork or change the original.

`DELETE /api/uploads/{id}` needs no body. It permanently removes the record, original, result, and thumbnail. A currently processing cover returns `409`; the route first expires stale leases. Confirm in the UI before deletion. Repeating deletion returns `404`.

### Images and downloads

Use `GET /api/uploads/{id}/image/original`, `/result`, or `/thumbnail`, each with the bearer header. Original/thumbnail exist after upload; result exists only after successful processing. The thumbnail changes to a result preview on completion. Finished thumbnails are 240 × 324 JPEG; initial thumbnails fit inside that box. Render with preserved aspect ratio.

Image responses contain raw bytes with `Content-Type`, `Content-Length`, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, and `Content-Disposition`. Original MIME type is JPEG/PNG/WebP; result is JPEG with the upload's exact saved dimensions and at most 4,000,000 bytes.

Append `?download=1` for attachment disposition. The presence of the `download` query key enables attachment behavior, regardless of its value. An optional single cosmetic filename segment is supported, e.g. `/api/uploads/{id}/image/result/book-author.jpg?download=1`; it does not select the image or determine the server filename. Filenames derive from a sanitized title/author, falling back to `cover-{id}`, with the actual MIME type's extension.

Fetch using an authenticated URL request and then display/save/share the data. A bare image URL handed to a loader or external browser without Authorization will fail. Prefer the response's filename for downloads. Keep image state scoped to the account, honor no-store, and replace loaded thumbnails after processing. Image failures return JSON, so check status and content type before decoding bytes.

## BOOX transfer: direct device API

This feature does **not** use a Recover backend proxy. The website stores the reader's `host:port` locally in the browser; there is no server endpoint for this preference. Store it locally in the iOS app, for example in UserDefaults, and require the reader to be reachable on the same network.

Mirror this existing protocol:

1. `GET http://{reader-address}/api/ping` with a roughly 3-second timeout. Require a successful status and response text whose trimmed value is `ok`.
2. Download the finished JPEG from Recover's authenticated `/api/uploads/{id}/image/result` endpoint.
3. Send `POST http://{reader-address}/api/storage/upload` with multipart field **`file`** containing the image and filename, plus text field **`dir`** equal to **`/storage/emulated/0/Screensaver`**. A successful HTTP status means upload success in the current website.

Use a separate HTTP client without Recover credentials for the reader. Local-network access and cleartext reader HTTP need appropriate iOS platform configuration. These reader endpoints depend on the device's running service; they are not implemented in this repository. An upload transfers the file; there is no API here to activate/select the screensaver on the reader.

## Errors and UI behavior

Application failures normally return `{ "error": "human-readable message" }`. Preserve useful server messages and handle:

| HTTP status | Meaning / response |
| --- | --- |
| `400` | Invalid input/image/page/preset; correct the request. |
| `401` | Missing/expired/invalid session; clear local credentials and sign in. |
| `403` | Invalid request origin; check cookie/Origin configuration. |
| `404` | Resource missing or not owned; refresh list/remove stale UI. |
| `409` | State conflict: account already processing, library full, metadata editing too early, deleting active processing, UUID collision, or last-preset deletion. Show the message and refresh relevant state. |
| `413` | File or request body too large; resize/re-encode the image or reduce payload. |
| `429` | Application processing-attempt quota reached; reset is midnight UTC. Auth may also rate-limit independently. |
| `500` | Unexpected backend failure. |
| `502` | Processing/provider/export failure. Refresh cover before offering retry. Provider quota failures may appear here with a descriptive message, rather than application `429`. |
| `503` | Image processing is not configured on the server. |

Requests interrupted by a proxy/hosting limit may return non-JSON or no response. Handle those separately from JSON decoding errors. Mutating operations can have completed despite a lost response; reconcile via GET before retrying. Image upload retries should reuse the UUID; processing retries should be a deliberate user action.

## Integration acceptance checklist

- Sign up/sign in from a cookie-free client, save `set-auth-token`, relaunch, and restore via get-session.
- List presets before the first upload; create/rename/delete a preset and respect the last-preset restriction.
- Select/convert an image, submit all three multipart fields, persist its UUID, and verify deduplication after a simulated lost response.
- Start one processing request, show polling stages, reconcile after backgrounding/interruption, and display a successful result even if metadata extraction warned.
- Correct metadata, refetch/share the resulting JPEG, and confirm the configured dimensions.
- Exercise expired/revoked sessions, cross-account privacy, library-full/concurrent-processing/quota responses, and deletion.
- Change password with session revocation, persist the replacement token, and verify sign-out revokes backend access.
- If BOOX transfer is included, test it on a physical device/local network without forwarding Recover credentials.

## Optional passkeys and current integration gaps

The website enables Better Auth passkeys. Installed plugin routes under `/api/auth` are:

| Method / path | Purpose / input |
| --- | --- |
| `GET /passkey/generate-register-options` | Get WebAuthn registration options; current configuration requires a fresh authenticated session. |
| `POST /passkey/verify-registration` | Register credential with `{ "response": <WebAuthn registration response>, "name": "My device" }`. |
| `GET /passkey/generate-authenticate-options` | Get WebAuthn authentication options. |
| `POST /passkey/verify-authentication` | Sign in with `{ "response": <WebAuthn authentication response> }`; persist resulting `set-auth-token`. |
| `GET /passkey/list-user-passkeys` | List the signed-in user's registered passkeys. |
| `POST /passkey/update-passkey` | Rename with `{ "id": "passkey-id", "name": "New name" }`. |
| `POST /passkey/delete-passkey` | Remove with `{ "id": "passkey-id" }`. |

Do not assume the email/password bearer-only recipe implements a native passkey ceremony. The installed verification handlers require a signed challenge cookie from the options request and an Origin, and validate WebAuthn responses against the configured relying party (deployed hostname, or localhost for loopback development). Native passkey origin/associated-domain support requires separate integration and verification; no Apple associated-domain file or native passkey bridge is provided here. Keep any ceremony cookie handling separate from the regular cookie-free API client. Email/password is the existing tested native path.

Other gaps to account for when scoping the app: no server-synced BOOX address, no daily-usage read API, no processing cancellation/background-job API, no batch uploads, and no existing-upload resolution change. Do not invent endpoints for these features. Account deletion would require enabling/implementing backend support.

## Source map for the implementing AI

- `app/api/uploads/**/route.ts`: upload/history/detail/process/image contracts.
- `app/api/resolutions/route.ts`, `lib/covers/resolutions.ts`: presets and lazy default creation.
- `lib/covers/types.ts`, `store.ts`, `http.ts`, `limits.ts`, `images.ts`, `openai.ts`: serialized models, state machine, ownership/origin rules, quotas, image constraints, and provider behavior.
- `lib/auth.ts`, `app/api/auth/[...all]/route.ts`: Better Auth configuration and HTTP handler.
- Installed `node_modules/better-auth/dist/api/routes/`, `node_modules/better-auth/dist/plugins/bearer/`, and `node_modules/@better-auth/passkey/dist/`: actual dependency endpoint behavior; revisit after upgrades.
- `lib/actions/account.ts`, `lib/actions/passkeys.ts`: website-specific validation/behavior to reproduce using the HTTP auth endpoints.
- `components/upload-form.tsx`, `components/cover-detail.tsx`, `app/settings/boox-settings.tsx`: current client orchestration and reader transfer protocol.
- `tests/e2e/mobile-sessions.spec.ts`: existing bearer-session test coverage (auth, reads, preset writes, origin rules, and revocation); it does not establish full native passkey or iOS lifecycle support.
- `README.md`, `.env.example`: operations and configuration. The README's abbreviated upload description omits required `resolutionId`; route source is authoritative. The current server supports custom dimensions, not only the README's default 1072 × 1448 output.
