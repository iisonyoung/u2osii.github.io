# U2 Vector Memory Service Protocol

The browser keeps the original keyword memory locally. The external service is optional and only receives structured memory entries, not the complete chat history.

Configure the service root URL from the standalone `设置 -> 向量记忆` entry. The browser sends `Authorization: Bearer <API Key>` when a key is configured, and also sends `X-U2-Vector-Memory-Protocol: u2-vector-memory/v1`.

## Required endpoints

`GET /health`

Return any JSON 2xx response.

`POST /v1/memories/upsert`

```json
{
  "protocol": "u2-vector-memory/v1",
  "namespace": "imessage",
  "embedding": {
    "model": "bge-m3",
    "dimensions": 1024,
    "revision": "r1"
  },
  "records": [
    {
      "id": "u2:friend-1:long:memory-1",
      "content": "标题：饮食偏好\n喜欢蘑菇披萨",
      "metadata": {
        "friend_id": "friend-1",
        "source_entry_id": "memory-1",
        "memory_type": "long",
        "chat_scope": "single_chat",
        "tags": ["披萨"]
      }
    }
  ]
}
```

`POST /v1/memories/search`

```json
{
  "protocol": "u2-vector-memory/v1",
  "namespace": "imessage",
  "query": "周五想吃什么？",
  "top_k": 4,
  "embedding": { "model": "bge-m3", "dimensions": 1024 },
  "filters": {
    "friend_id": "friend-1",
    "chat_scope": "single_chat"
  }
}
```

Return only record IDs and scores:

```json
{
  "results": [
    { "id": "u2:friend-1:long:memory-1", "score": 0.91 }
  ]
}
```

`POST /v1/memories/delete`

```json
{
  "protocol": "u2-vector-memory/v1",
  "namespace": "imessage",
  "ids": ["u2:friend-1:long:memory-1"]
}
```

## Model discovery

The “拉取向量模型” button calls `GET /v1/memory/capabilities`. If that endpoint is unavailable, it falls back to `GET /v1/memory/models`.

```json
{
  "embedding": {
    "active_model": "bge-m3",
    "requires_reindex_on_change": true,
    "models": [
      {
        "id": "bge-m3",
        "label": "BGE-M3",
        "dimensions": 1024,
        "revision": "r1"
      }
    ]
  }
}
```

When the selected model changes, the server should re-embed all records in the affected namespace before using the new model for search. Do not search vectors produced by incompatible embedding models together.

The service must allow the application's origin through CORS.
