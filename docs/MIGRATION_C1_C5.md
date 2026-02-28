# Migration Guides: C1 (Image Storage) & C5 (Rate Limiting)

Two infrastructure improvements deferred from the tech-debt audit.

---

## C1 — Replace Data-URL Images with R2 Object Storage

### Current State

Images uploaded via `ImagePickerModal` are encoded as base64
data URLs using `FileReader.readAsDataURL()` and stored directly in the
`ImageNode.src` field of the canvas spec.

**Affected files:**

| File | Behaviour |
|------|-----------|
| `src/components/ImagePickerModal.tsx` (L57, L78) | `reader.readAsDataURL(file)` — encodes user-uploaded image to data URL |
| `src/components/ImageAttributesPanel.tsx` (L41) | `URL.createObjectURL(file)` — ephemeral blob URL for preview (worse — breaks on tab close) |
| `src/canvas/utils/iconComponentUtils.ts` (L147) | `data:image/svg+xml;utf8,...` — icon SVGs (small, acceptable) |
| `src/theme/themeGenerator.ts` (L451-453) | Decodes/re-encodes SVG data URLs (icon recoloring — leave as-is) |

**Problems:**

1. **Spec bloat** — a single 1 MB image balloons the JSON spec to ~1.3 MB
   base64. Multiple images make autosave, undo history, and collaboration
   payloads massive.
2. **Collaboration overhead** — Yjs CRDT broadcasts the entire data URL string
   to all peers on every image insert.
3. **No CDN caching** — images are always re-transmitted inline.

### Target Architecture

```
User uploads image
         │
         ▼
  ImagePickerModal
         │  POST /api/images  (multipart/form-data)
         ▼
  workers/api handler
         │  R2.put(`images/${canvasId}/${uuid}.{ext}`)
         ▼
  Return public URL:  https://assets.vizail.io/images/{canvasId}/{uuid}.webp
         │
         ▼
  Store URL in ImageNode.src (replaces data URL)
```

### Implementation Steps

> **Status:** Steps 1–5 are implemented.
> - R2 binding: `workers/api/wrangler.toml`
> - Upload/delete routes: `workers/api/src/routes/images.ts`
> - Frontend utility: `src/utils/imageUpload.ts` (with offline fallback)
> - ImagePickerModal & ImageAttributesPanel: updated to use `uploadImageFile()`
> - Migration utility: `src/utils/migrateImages.ts`
> - Tests: `workers/api/src/routes/images.test.ts`, `src/utils/imageUpload.test.ts`, `src/utils/migrateImages.test.ts`

#### 1. Provision R2 Bucket

```toml
# wrangler.toml (workers/api)
[[r2_buckets]]
binding = "IMAGES"
bucket_name = "vizail-images"
```

Enable public-access via custom domain (`assets.vizail.io`) or an R2 public
bucket URL.

#### 2. Add Upload Endpoint

```ts
// workers/api/src/routes/images.ts
export async function handleImageUpload(
  request: Request,
  env: Env,
): Promise<Response> {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return new Response('Missing file', { status: 400 });

  // Validate: max 5 MB, image/* MIME
  if (file.size > 5 * 1024 * 1024) {
    return new Response('File too large (5 MB max)', { status: 413 });
  }
  if (!file.type.startsWith('image/')) {
    return new Response('Not an image', { status: 415 });
  }

  const ext = file.name.split('.').pop() ?? 'png';
  const key = `images/${crypto.randomUUID()}.${ext}`;

  await env.IMAGES.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  const publicUrl = `https://assets.vizail.io/${key}`;
  return Response.json({ url: publicUrl });
}
```

#### 3. Update ImagePickerModal

Replace `readAsDataURL` with an upload call:

```ts
// src/components/ImagePickerModal.tsx
const uploadImage = async (file: File): Promise<string> => {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/images', { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
  const { url } = await res.json();
  return url; // https://assets.vizail.io/images/...
};

// In the onChange handler:
const url = await uploadImage(file);
onSelect(url); // stored in ImageNode.src
```

#### 4. Update ImageAttributesPanel

Replace `URL.createObjectURL` with the same upload flow.

#### 5. Migration Script (existing specs)

Convert existing data-URL images in saved designs:

```ts
function migrateDataUrls(spec: LayoutSpec): LayoutSpec {
  // Walk tree, for each ImageNode where src starts with 'data:'
  // upload to R2 and replace with URL
}
```

Run lazily on `loadDesign` or as a one-time batch migration.

#### 6. Cost Estimate

| Resource | Free Tier | Overage |
|----------|-----------|---------|
| R2 Storage | 10 GB/mo | $0.015/GB |
| R2 Class A ops (PUT) | 1M/mo | $4.50/M |
| R2 Class B ops (GET) | 10M/mo | $0.36/M |

For a small-to-medium project, this stays well within free tier.

---

## C5 — Replace In-Memory Rate Limiting with Cloudflare Rate Limiting

### Current State

`workers/api/src/rateLimit.ts` uses a `Map<string, { count, resetAt }>` stored
in worker module-scoped memory.

**Problems:**

1. **Not shared across isolates** — Cloudflare Workers run on many edge nodes.
   Each isolate has its own `Map`, so a user hitting different PoPs bypasses
   the limit entirely.
2. **Resets on eviction** — Workers may be evicted/restarted at any time,
   resetting all counters.
3. **Memory pressure** — The store grows unbounded until the 10K cleanup
   threshold.

### Option A: Cloudflare Rate Limiting (Recommended)

Cloudflare's built-in rate limiting runs at the edge before the Worker
executes, reducing both latency and compute cost.

#### Implementation Steps

1. **Define rate limiting rules in `wrangler.toml`** or the Cloudflare
   dashboard under Security → WAF → Rate limiting rules:

   | Rule | Match | Threshold | Action | Window |
   |------|-------|-----------|--------|--------|
   | Default API | `hostname eq api.vizail.io` | 100 req/min per IP | Block (429) | 60s |
   | Write ops | `method in {"POST" "PUT" "DELETE"}` | 50 req/min per IP | Block (429) | 60s |
   | Sensitive | `URI path contains "/agent-token" or "/members"` | 10 req/min per IP | Challenge or Block | 60s |

2. **Remove the in-memory implementation** — delete `rateLimit.ts` and the
   `checkRateLimit()` / `getRateLimitType()` calls from the API router.

3. **Add response headers** for client-side awareness:

   ```
   X-RateLimit-Limit: 100
   X-RateLimit-Remaining: 42
   X-RateLimit-Reset: 1719500000
   ```

   These are automatically added by Cloudflare Rate Limiting rules.

#### Cost

| Plan | Included Rules | Cost |
|------|---------------|------|
| Free | 1 rule | $0 |
| Pro | 5 rules | $20/mo (already covers many features) |
| Enterprise | Unlimited | Custom |

### Option B: Durable Objects Counter (if per-user tracking is needed)

If rate limiting needs to be **per authenticated user** (not per IP), use a
Durable Object per user:

```ts
// workers/api/src/RateLimitDO.ts
export class RateLimitDO implements DurableObject {
  private count = 0;
  private resetAt = 0;

  async fetch(request: Request): Promise<Response> {
    const now = Date.now();
    if (now > this.resetAt) {
      this.count = 0;
      this.resetAt = now + 60_000;
    }
    this.count++;
    const limit = 100;
    if (this.count > limit) {
      return new Response('Rate limited', { status: 429 });
    }
    return new Response('OK', {
      headers: {
        'X-RateLimit-Remaining': String(limit - this.count),
      },
    });
  }
}
```

Route the check through the DO before processing the API request:

```ts
const id = env.RATE_LIMIT.idFromName(userId);
const stub = env.RATE_LIMIT.get(id);
const check = await stub.fetch(request.clone());
if (check.status === 429) return check;
```

This gives globally consistent per-user counters. Cost is ~$0 for the
included 1M DO requests/month on the Workers Paid plan.

### Recommendation

**Use Option A** (Cloudflare Rate Limiting rules) for general API protection.
Add **Option B** only if per-user metering is required for billing or abuse
prevention beyond what IP-based rules provide.

### Migration Checklist

- [x] Configure Cloudflare Rate Limiting rules — documented in `workers/api/rate-limit-rules.md`
- [x] Remove `workers/api/src/rateLimit.ts` — deleted
- [x] Remove `checkRateLimit` and `getRateLimitType` imports from API router
- [x] Add `429` handling to `src/api/client.ts` (retry with exponential backoff, max 3 retries)
- [ ] Smoke-test rate limit responses from the edge
- [ ] Monitor rule hit rates in Cloudflare Analytics
