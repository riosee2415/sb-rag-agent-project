# API Reference — SV Dev RAG Agent

Base URL: `http://{EC2_IP}:{PORT}/api/v1`

Authentication: Every endpoint requires the `X-API-Secret` header. Some endpoints additionally require a JWT via `Authorization: Bearer {jwt}`.

---

### GET /health

Health check. No authentication required.

**Response 200**

| Field  | Type   | Description  |
|--------|--------|--------------|
| status | string | Always "ok"  |

**Status Codes**: 200

---

### POST /api/v1/chat

Submit a RAG query against the video knowledge base.

**Headers (Required)**

| Header       | Value                |
|--------------|----------------------|
| X-API-Secret | {shared secret}      |

**Headers (Conditional)**

| Header        | Value            | When Required                     |
|---------------|------------------|-----------------------------------|
| Authorization | Bearer {jwt}     | When saving conversation history  |

**Request Body**

| Field            | Type    | Required | Description                           |
|------------------|---------|----------|---------------------------------------|
| query            | string  | Yes      | User question (min length: 1)         |
| conversation_id  | UUID    | No       | Continue an existing conversation     |
| include_history  | boolean | No       | Include prior turns (default: true)   |

**Response 200**

| Field           | Type           | Description                              |
|-----------------|----------------|------------------------------------------|
| answer          | string         | Generated answer                         |
| sources         | SourceItem[]   | Cited video sources with timestamps      |
| confidence      | float          | Answer confidence score [0.0, 1.0]       |
| conversation_id | UUID \| null   | Conversation UUID (set if user authed)   |
| cached          | boolean        | Whether response was served from cache   |

**SourceItem**

| Field           | Type   | Description                         |
|-----------------|--------|-------------------------------------|
| video_title     | string | Title of the source video           |
| timestamp_label | string | Human-readable time range (e.g. "1:23 - 1:45") |
| timestamp_url   | string | YouTube deep link with ?t= param    |
| excerpt         | string | Relevant text snippet (up to 200 chars) |

**Status Codes**: 200 / 403 / 422 / 503

---

### POST /api/v1/videos

List all ingested videos and their statuses.

**Headers (Required)**

| Header       | Value           |
|--------------|-----------------|
| X-API-Secret | {shared secret} |

**Request Body**: None required (empty body accepted)

**Response 200**

| Field  | Type        | Description               |
|--------|-------------|---------------------------|
| videos | VideoItem[] | List of all videos        |
| total  | integer     | Total count               |

**VideoItem**

| Field        | Type            | Description                         |
|--------------|-----------------|-------------------------------------|
| video_id     | string          | YouTube video ID                    |
| title        | string          | Video title                         |
| duration_sec | integer \| null | Duration in seconds                 |
| published_at | datetime \| null | ISO 8601 publish date              |
| status       | string          | pending / done / error              |

**Status Codes**: 200 / 403

---

### POST /api/v1/ingest

Trigger a full channel ingestion pipeline job.

**Headers (Required)**

| Header       | Value           |
|--------------|-----------------|
| X-API-Secret | {shared secret} |

**Request Body**: None required

**Response 200**

| Field  | Type   | Description                                 |
|--------|--------|---------------------------------------------|
| job_id | string | Job identifier (UUID or "duplicate")        |
| status | string | queued / started / already_running          |

**Status Codes**: 200 / 403

---

### POST /api/v1/status

Get current ingestion status counts.

**Headers (Required)**

| Header       | Value           |
|--------------|-----------------|
| X-API-Secret | {shared secret} |

**Request Body**: None required

**Response 200**

| Field        | Type     | Description                          |
|--------------|----------|--------------------------------------|
| total_videos | integer  | Total number of videos               |
| done         | integer  | Videos fully ingested                |
| pending      | integer  | Videos awaiting ingestion            |
| error        | integer  | Videos that failed ingestion         |
| last_updated | datetime | UTC timestamp of last count          |

**Status Codes**: 200 / 403

---

### POST /api/v1/conversations/list

List all conversations for the authenticated user.

**Headers (Required)**

| Header        | Value            |
|---------------|------------------|
| X-API-Secret  | {shared secret}  |
| Authorization | Bearer {jwt}     |

**Request Body**: None required

**Response 200**

| Field         | Type                | Description               |
|---------------|---------------------|---------------------------|
| conversations | ConversationItem[]  | User's conversation list  |

**ConversationItem**

| Field       | Type          | Description                          |
|-------------|---------------|--------------------------------------|
| id          | UUID          | Conversation identifier              |
| title       | string        | Conversation title                   |
| device_hint | string \| null | Client device type hint             |
| updated_at  | datetime      | Last activity timestamp (UTC)        |

**Status Codes**: 200 / 401 / 403

---

### POST /api/v1/conversations

Create a new conversation.

**Headers (Required)**

| Header        | Value            |
|---------------|------------------|
| X-API-Secret  | {shared secret}  |
| Authorization | Bearer {jwt}     |

**Request Body**

| Field       | Type   | Required | Description               |
|-------------|--------|----------|---------------------------|
| title       | string | No       | Conversation title        |
| device_hint | string | No       | Client device type hint   |

**Response 200**: ConversationItem (see above)

**Status Codes**: 200 / 401 / 403

---

### POST /api/v1/conversations/{id}/messages

Retrieve all messages in a conversation.

**Headers (Required)**

| Header        | Value            |
|---------------|------------------|
| X-API-Secret  | {shared secret}  |
| Authorization | Bearer {jwt}     |

**Path Parameters**

| Parameter | Type | Description        |
|-----------|------|--------------------|
| id        | UUID | Conversation UUID  |

**Request Body**: None required

**Response 200**

| Field    | Type          | Description              |
|----------|---------------|--------------------------|
| messages | MessageItem[] | Ordered list of messages |

**MessageItem**

| Field      | Type                  | Description                        |
|------------|-----------------------|------------------------------------|
| id         | UUID                  | Message identifier                 |
| role       | string                | "user" or "assistant"              |
| content    | string                | Message text                       |
| sources    | SourceItem[] \| null  | Cited sources (assistant only)     |
| created_at | datetime              | UTC creation timestamp             |

**Status Codes**: 200 / 401 / 403

---

### DELETE /api/v1/conversations/{id}

Delete a conversation and all its messages.

**Headers (Required)**

| Header        | Value            |
|---------------|------------------|
| X-API-Secret  | {shared secret}  |
| Authorization | Bearer {jwt}     |

**Path Parameters**

| Parameter | Type | Description        |
|-----------|------|--------------------|
| id        | UUID | Conversation UUID  |

**Response**: 204 No Content

**Status Codes**: 204 / 401 / 403
