# whisper.cpp Service API Documentation

A REST API wrapper for whisper.cpp with async job-based transcription processing.

## Base URL

```
http://localhost:8009
```

## Authentication

Authentication is **optional**. If `WHISPERCPP_API_KEY` environment variable is set, include the Bearer token in requests:

```http
Authorization: Bearer <your-token>
```

---

## Endpoints

### Health Check

Check service health and model readiness.

**Endpoint:** `GET /health`

**Response:** `200 OK`

```json
{
  "ok": true,
  "model_ready": true,
  "model_path": "/models/ggml-small.bin",
  "whisper_cli": "/usr/local/bin/whisper-cli",
  "queue_size": 0,
  "model_error": null
}
```

| Field | Type | Description |
|-------|------|-------------|
| `ok` | boolean | Service operational status |
| `model_ready` | boolean | Whether the model is loaded and ready |
| `model_path` | string | Path to the loaded model file |
| `whisper_cli` | string | Path to whisper-cli binary |
| `queue_size` | integer | Number of jobs in the processing queue |
| `model_error` | string \| null | Error message if model failed to load |

---

### Create Transcription Job

Upload an audio file to transcribe. Returns a job ID for polling the result.

**Endpoint:** `POST /v1/transcriptions`

**Content-Type:** `multipart/form-data`

**Request Body:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | file | Yes | Audio file to transcribe |

**Supported Audio Formats:** mp3, m4a, aac, wav, flac, ogg, webm, avi, mov, mkv

**Response:** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "text": null,
  "error": null,
  "language": null,
  "created_at": "2026-02-19T10:30:00.000Z",
  "updated_at": "2026-02-19T10:30:00.000Z",
  "words": null
}
```

**Error Responses:**
- `400 Bad Request` - Uploaded file is empty
- `401 Unauthorized` - Invalid or missing authorization token
- `503 Service Unavailable` - Model is not ready

---

### Get Transcription Result

Poll for job status and retrieve the transcription result.

**Endpoint:** `GET /v1/transcriptions/{job_id}`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `job_id` | string | UUID returned from the create endpoint |

**Response:** `200 OK`

**Queued/Processing:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "text": null,
  "error": null,
  "language": null,
  "created_at": "2026-02-19T10:30:00.000Z",
  "updated_at": "2026-02-19T10:30:05.000Z",
  "words": null
}
```

**Completed:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "text": "Hello, this is a sample transcription of audio content.",
  "error": null,
  "language": null,
  "created_at": "2026-02-19T10:30:00.000Z",
  "updated_at": "2026-02-19T10:32:15.000Z",
  "words": [
    {
      "start": 0,
      "end": 500,
      "text": "Hello,",
      "confidence": 1.0
    },
    {
      "start": 500,
      "end": 1200,
      "text": "this",
      "confidence": 1.0
    }
  ]
}
```

**Error:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "error",
  "text": null,
  "error": "Audio conversion failed: Input file format not supported",
  "language": null,
  "created_at": "2026-02-19T10:30:00.000Z",
  "updated_at": "2026-02-19T10:30:05.000Z",
  "words": null
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Job UUID |
| `status` | string | One of: `queued`, `processing`, `completed`, `error` |
| `text` | string \| null | Full transcription text (when completed) |
| `error` | string \| null | Error message (when error) |
| `language` | string \| null | Detected language code (reserved for future use) |
| `created_at` | string | ISO 8601 timestamp |
| `updated_at` | string | ISO 8601 timestamp |
| `words` | array \| null | Word-level timestamps (when completed) |

**Word Object:**

| Field | Type | Description |
|-------|------|-------------|
| `start` | integer | Start time in milliseconds |
| `end` | integer | End time in milliseconds |
| `text` | string | Word text |
| `confidence` | float | Confidence score (0-1) |

**Error Responses:**
- `401 Unauthorized` - Invalid or missing authorization token
- `404 Not Found` - Job not found

---

## HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `400` | Bad Request (empty file) |
| `401` | Unauthorized (invalid API key) |
| `404` | Not Found (job doesn't exist) |
| `503` | Service Unavailable (model not ready) |

---

## Example Requests

### cURL

**Health Check:**

```bash
curl -X GET http://localhost:8009/health
```

**Create Transcription:**

```bash
curl -X POST http://localhost:8009/v1/transcriptions \
  -F "file=@/path/to/audio.mp3"
```

**With API Key:**

```bash
curl -X POST http://localhost:8009/v1/transcriptions \
  -H "Authorization: Bearer your-token" \
  -F "file=@/path/to/audio.mp3"
```

**Poll for Result:**

```bash
curl -X GET http://localhost:8009/v1/transcriptions/550e8400-e29b-41d4-a716-446655440000
```

---

### JavaScript / TypeScript

```typescript
const ENDPOINT = "http://localhost:8009";
const API_KEY = undefined; // or "your-token"

interface Word {
  start: number;
  end: number;
  text: string;
  confidence: number;
}

interface JobResponse {
  id: string;
  status: "queued" | "processing" | "completed" | "error";
  text: string | null;
  error: string | null;
  language: string | null;
  created_at: string;
  updated_at: string;
  words: Word[] | null;
}

async function createTranscription(file: File): Promise<JobResponse> {
  const formData = new FormData();
  formData.append("file", file, file.name);

  const headers: Record<string, string> = {};
  if (API_KEY) {
    headers["Authorization"] = `Bearer ${API_KEY}`;
  }

  const response = await fetch(`${ENDPOINT}/v1/transcriptions`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function pollTranscription(jobId: string, intervalMs = 2000): Promise<JobResponse> {
  const headers: Record<string, string> = {};
  if (API_KEY) {
    headers["Authorization"] = `Bearer ${API_KEY}`;
  }

  while (true) {
    const response = await fetch(`${ENDPOINT}/v1/transcriptions/${jobId}`, { headers });
    
    if (!response.ok) {
      throw new Error(`Poll failed: ${response.status}`);
    }

    const job: JobResponse = await response.json();

    if (job.status === "completed" || job.status === "error") {
      return job;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

// Usage
async function main() {
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  if (!fileInput.files?.length) return;

  const file = fileInput.files[0];
  
  console.log("Uploading...");
  const job = await createTranscription(file);
  console.log(`Job ID: ${job.id}`);
  
  console.log("Transcribing...");
  const result = await pollTranscription(job.id);
  
  if (result.status === "completed") {
    console.log("Transcript:", result.text);
    console.log("Words:", result.words);
  } else {
    console.error("Error:", result.error);
  }
}
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WHISPERCPP_MODEL` | `small` | Model size: `base`, `small`, `medium`, `large-v3` |
| `WHISPERCPP_MODEL_PATH` | `/models/ggml-{model}.bin` | Explicit model file path |
| `WHISPERCPP_AUTO_DOWNLOAD_MODEL` | `true` | Auto-download model if missing |
| `WHISPERCPP_MODEL_BASE_URL` | HuggingFace URL | Base URL for model downloads |
| `WHISPERCPP_THREADS` | `4` | Number of CPU threads for inference |
| `WHISPERCPP_LANGUAGE` | (empty) | Language code or `auto` for detection |
| `WHISPERCPP_API_KEY` | (none) | Optional API key for authentication |
| `WHISPERCPP_CORS_ORIGINS` | `*` | Comma-separated allowed CORS origins |
| `WHISPERCPP_TEMP_DIR` | `/tmp/whispercpp` | Temporary files directory |
| `WHISPERCPP_BIN` | `/usr/local/bin/whisper-cli` | Path to whisper-cli binary |

---

## OpenAPI Schema

The service exposes an OpenAPI schema at:

- **Swagger UI:** `http://localhost:8009/docs`
- **Raw Schema:** `http://localhost:8009/openapi.json`

---

## Quick Start (Docker)

```bash
# CPU version
docker compose -f docker-compose.cpu.yml up --build

# GPU version (requires NVIDIA Docker)
docker compose -f docker-compose.gpu.yml up --build
```

Service runs on `http://localhost:8009`.
