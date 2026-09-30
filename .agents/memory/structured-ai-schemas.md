---
name: Structured AI schemas
description: OpenAI JSON-schema compatibility when using Zod with the Replit AI proxy
---
Keep the schema sent to OpenAI within its supported JSON-schema subset. Validate http(s) URLs using a runtime refinement instead of an emitted URI format.

**Why:** A valid Zod URL schema generated `format: uri`, which the live OpenAI structured-output endpoint rejected with HTTP 400.

**How to apply:** When changing AI extraction schemas, run one synthetic live-provider check as well as local schema tests. Local Zod validation alone cannot establish provider compatibility.