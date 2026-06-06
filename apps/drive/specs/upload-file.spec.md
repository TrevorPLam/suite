# Upload File

One-sentence summary: Drive users can upload a file with a name and size metadata, and the API should validate the request before handing it to the Drive domain.

## User story

As a Drive user, I want to upload a file so I can store and later retrieve my documents.

## Scope

- Upload a single file record.
- Validate the request payload at the API boundary.
- Return a file object that the Drive web app can list immediately.

## API contract

- `POST /api/v1/files`
- Request body:
  - `name: string`
  - `size: number`
- Response 201:
  - `id: string`
  - `name: string`
  - `size: number`

## Validation rules

- `name` must be present and trimmed.
- `size` must be a non-negative integer.
- The API should reject zero-byte uploads only if product requirements later demand it; for now they are allowed.

## Failure cases

- 400: malformed or invalid payload.
- 413: payload too large if upload transport limits are enforced later.
- 500: storage or domain failure.

## Out of scope

- Chunked uploads.
- Folder hierarchies.
- Sharing and permissions.
- Virus scanning.
- Preview generation.

## Acceptance criteria

- The API validates payloads before domain execution.
- The domain layer returns a stable file record with an `id`.
- The contract can later expand into list, download, and sharing flows without changing the create shape.
