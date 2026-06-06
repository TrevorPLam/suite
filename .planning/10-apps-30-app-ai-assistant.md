# AI Assistant App Architecture

This document defines the architecture for the AI Assistant application in the Sovereign Suite, covering model selection, deployment on VPS, zero-knowledge RAG pipeline, SSE streaming API, WebGPU fallback, and rate limiting.

---

## Overview

The AI Assistant app provides AI-powered assistance across the Sovereign Suite while maintaining zero-knowledge guarantees. The AI model never sees plaintext user content—all decryption happens client-side before content enters the LLM context.

---

## Model Selection

### Options for VPS with 8 GB RAM (No GPU)

| Model | Parameters | VRAM Required | RAM Required | Performance | Recommendation |
|-------|-----------|---------------|--------------|-------------|----------------|
| Phi-4 Mini | 3.8B | 2.5 GB | 4.5 GB | Fast, excellent quality | ✅ Recommended |
| Llama 3.2 3B | 3B | 2 GB | 4 GB | Fast, good quality | ⚠️ Fallback |
| Mistral 7B | 7B | 4 GB | 6 GB | Slower, better quality | ⚠️ Borderline |

### Recommended Model: Phi-4 Mini

- **Reason**: Superior quality to Llama 3.2 at similar size, with strong math and reasoning performance
- **Performance**: Fast inference (< 500ms per token)
- **Quality**: Excellent for productivity tasks, outperforms similar-sized models
- **License**: MIT (commercial use allowed)

### Alternative: Llama 3.2 3B

- **Reason**: Fallback option if Phi-4 Mini is unavailable
- **Performance**: Slightly faster but lower quality
- **License**: Apache 2.0 (commercial use allowed)

---

## Deployment: Ollama on VPS

### Docker Compose Configuration

```yaml
# docker-compose.yml
services:
  ollama:
    image: ollama/ollama:0.30.5
    container_name: ollama
    ports:
      - "11434:11434"
    volumes:
      - ./ollama-data:/root/.ollama
    environment:
      - OLLAMA_NUM_GPU=0  # No GPU available
      - OLLAMA_NUM_THREAD=4
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 6G
        reservations:
          memory: 4G
```

### Pull and Run Model

```bash
# Pull Phi-4 Mini
docker exec -it ollama ollama pull phi4-mini

# Verify model is loaded
docker exec -it ollama ollama list

# Test inference
docker exec -it ollama ollama run phi4-mini "Hello, world!"
```

### Ollama API

Ollama provides a REST API for inference:

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "phi4-mini",
  "prompt": "Hello, world!",
  "stream": false
}'
```

---

## Zero-Knowledge RAG Pipeline

### Architecture

```
Encrypted Data in PostgreSQL → Client Decryption → LLM Context → Encrypted Response
```

### Step 1: Retrieve Encrypted Data

```typescript
// packages/domain-ai/src/lib/retrieve-context.ts
export async function retrieveContext(
  tenantId: string,
  query: string
): Promise<EncryptedContext[]> {
  // Use blind indexes to find relevant documents
  const searchTokens = generateBlindIndexTokens(query);
  
  const results = await db.query(
    `SELECT resource_type, resource_id, encrypted_blob
     FROM search.blind_indexes
     WHERE tenant_id = $1
       AND hmac_token = ANY($2)
     LIMIT 10`,
    [tenantId, searchTokens]
  );
  
  return results.rows;
}
```

### Step 2: Client-Side Decryption

```typescript
// apps/ai/web/src/lib/assemble-context.ts
import { decrypt } from '@suite/crypto';

export async function assembleContext(
  encryptedContext: EncryptedContext[],
  decryptionKey: CryptoKey
): Promise<string> {
  const decryptedItems = await Promise.all(
    encryptedContext.map(async (item) => {
      const plaintext = await decrypt(item.encrypted_blob, decryptionKey);
      return `[${item.resource_type}:${item.resource_id}] ${plaintext}`;
    })
  );
  
  return decryptedItems.join('\n\n');
}
```

### Step 3: Assemble Prompt

```typescript
// apps/ai/web/src/lib/assemble-prompt.ts
export function assemblePrompt(
  userQuery: string,
  context: string
): string {
  return `
You are an AI assistant for the Sovereign Suite productivity platform.
You have access to the user's calendar events, files, tasks, and emails.
Use the following context to answer the user's question.

Context:
${context}

User Question:
${userQuery}

Answer:
`;
}
```

### Step 4: Send to LLM

```typescript
// apps/ai/web/src/lib/query-llm.ts
export async function queryLLM(prompt: string): Promise<string> {
  const response = await fetch('http://vps.yourdomain.com:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'phi4-mini',
      prompt,
      stream: true,
    }),
  });
  
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';
  
  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(Boolean);
    
    for (const line of lines) {
      const json = JSON.parse(line);
      if (json.response) {
        fullResponse += json.response;
      }
    }
  }
  
  return fullResponse;
}
```

---

## SSE Streaming API

### Hono SSE Endpoint

```typescript
// apps/ai/api/src/index.ts
app.post('/api/ai/query', async (c) => {
  const { query, context } = await c.req.json();
  const tenantId = c.get('tenantId');
  
  // Check rate limit
  const rateLimit = await checkAIRateLimit(tenantId);
  if (!rateLimit.allowed) {
    return c.json({
      error: {
        code: 'ai_rate_limited',
        message: 'You have exceeded the daily AI request limit',
      },
    }, 429);
  }
  
  // Stream response from Ollama
  const ollamaResponse = await fetch('http://vps.yourdomain.com:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'phi4-mini',
      prompt: assemblePrompt(query, context),
      stream: true,
    }),
  });
  
  // Stream to client
  const stream = new ReadableStream({
    async start(controller) {
      const reader = ollamaResponse.body?.getReader();
      const decoder = new TextDecoder();
      
      try {
        while (true) {
          const { done, value } = await reader!.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(Boolean);
          
          for (const line of lines) {
            const json = JSON.parse(line);
            if (json.response) {
              controller.enqueue(`data: ${JSON.stringify({ token: json.response })}\n\n`);
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});
```

### Client-Side SSE Consumption

```typescript
// apps/ai/web/src/hooks/use-ai-query.ts
export function useAIQuery() {
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const query = async (userQuery: string, context: string) => {
    setIsLoading(true);
    setResponse('');
    
    const eventSource = new EventSource('/api/ai/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: userQuery, context }),
    });
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setResponse((prev) => prev + data.token);
    };
    
    eventSource.onerror = () => {
      eventSource.close();
      setIsLoading(false);
    };
    
    eventSource.addEventListener('done', () => {
      eventSource.close();
      setIsLoading(false);
    });
  };
  
  return { response, isLoading, query };
}
```

---

## WebGPU Fallback Decision Tree

### When to Use WebGPU

WebGPU allows on-device inference with zero cost and zero trust (data never leaves the device).

### Decision Logic

```typescript
// apps/ai/web/src/lib/inference-strategy.ts
export async function selectInferenceStrategy(): Promise<'webgpu' | 'vps'> {
  // Check if WebGPU is available
  if (!navigator.gpu) {
    return 'vps';
  }
  
  // Check if device has sufficient GPU memory
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    return 'vps';
  }
  
  const info = await adapter.requestAdapterInfo();
  
  // Require at least 2 GB GPU memory
  if (info.description?.includes('2GB') || info.description?.includes('4GB')) {
    return 'webgpu';
  }
  
  // Fall back to VPS for devices with insufficient GPU
  return 'vps';
}
```

### WebGPU Inference Implementation

```typescript
// apps/ai/web/src/lib/webgpu-inference.ts
export async function runWebGPUInference(prompt: string): Promise<string> {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter!.requestDevice();
  
  // Load quantized model (e.g., GGUF format)
  const model = await loadQuantizedModel(device);
  
  // Run inference
  const output = await model.generate(prompt);
  
  return output;
}
```

### Transparent Switching

```typescript
// apps/ai/web/src/lib/query-ai.ts
export async function queryAI(query: string, context: string): Promise<string> {
  const strategy = await selectInferenceStrategy();
  
  if (strategy === 'webgpu') {
    return await runWebGPUInference(assemblePrompt(query, context));
  } else {
    return await queryLLM(assemblePrompt(query, context));
  }
}
```

---

## Rate Limiting and Plan Gating

### Free Tier Limits

| Plan | Requests per Day | Context Size | Model |
|------|------------------|--------------|-------|
| Free | 10 | 2K tokens | Phi-4 Mini |
| Pro | 100 | 8K tokens | Phi-4 Mini |
| Enterprise | Unlimited | 32K tokens | Mistral 7B |

### Rate Limit Implementation

```typescript
// apps/ai/api/src/middleware/rate-limit.ts
export const aiRateLimit = createMiddleware(async (c, next) => {
  const tenantId = c.get('tenantId');
  const plan = await getTenantPlan(tenantId);
  
  const limits = {
    free: 10,
    pro: 100,
    enterprise: Infinity,
  };
  
  const dailyLimit = limits[plan] || limits.free;
  
  const key = `ai:requests:${tenantId}:${new Date().toISOString().split('T')[0]}`;
  const count = await c.env.KV.get(key, { type: 'json' }) || 0;
  
  if (count >= dailyLimit) {
    return c.json({
      error: {
        code: 'ai_rate_limited',
        message: `You have exceeded the daily AI request limit (${dailyLimit})`,
      },
    }, 429);
  }
  
  await c.env.KV.put(key, count + 1, { expirationTtl: 86400 });
  
  c.set('aiRequestCount', count + 1);
  
  await next();
});
```

---

## AI Assistant Database Schema

### `ai.conversations`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key |
| `tenant_id` | `UUID` | No | - | Tenant ID |
| `user_id` | `UUID` | No | - | User ID |
| `title` | `TEXT` | Yes | - | Conversation title |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last update timestamp |

### `ai.messages`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key |
| `conversation_id` | `UUID` | No | - | Parent conversation |
| `role` | `TEXT` | No | - | Role (user, assistant, system) |
| `encrypted_blob` | `BYTEA` | No | - | Encrypted message content |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Creation timestamp |

---

## AI Assistant API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/conversations` | GET | List conversations |
| `/api/ai/conversations` | POST | Create conversation |
| `/api/ai/conversations/:id` | GET | Get conversation |
| `/api/ai/conversations/:id/messages` | GET | List messages |
| `/api/ai/query` | POST | Query AI (SSE stream) |

---

## Security Considerations

### Zero-Knowledge Guarantee

- **Decryption happens client-side**: The LLM never sees plaintext encryption keys
- **VPS isolation**: Ollama runs on a dedicated VPS, not shared with other services
- **No data retention**: LLM context is not stored after inference
- **Encrypted storage**: All conversation history is encrypted in PostgreSQL

### TEE Option (Future)

For enterprise customers requiring stronger guarantees, consider deploying Ollama in a Trusted Execution Environment (TEE) such as AWS Nitro Enclaves or AMD SEV-SNP.

---

## Monitoring and Observability

### Metrics

Track the following metrics:

- AI request rate (requests per minute)
- AI request latency (p50, p95, p99)
- WebGPU vs VPS inference split
- Rate limit rejections
- Ollama error rate

### Alerts

| Metric | Threshold | Action |
|--------|-----------|--------|
| Ollama error rate | > 5% | Page on-call |
| AI request latency p95 | > 5s | Alert (Slack) |
| Rate limit rejections | > 10/min | Alert (Slack) |

---

## Deployment Checklist

- [ ] Deploy Ollama on VPS via Docker
- [ ] Pull and test Llama 3.2 3B model
- [ ] Configure Ollama API access from Workers
- [ ] Implement zero-knowledge RAG pipeline
- [ ] Implement SSE streaming endpoint
- [ ] Implement WebGPU fallback
- [ ] Implement rate limiting
- [ ] Set up monitoring and alerting
- [ ] Test end-to-end AI query flow
- [ ] Test WebGPU inference on supported devices
- [ ] Test rate limiting enforcement

---

*This document must be updated when the AI Assistant architecture changes or when new models are added.*
