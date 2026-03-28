# VAPI.ai -- Comprehensive Developer Reference

## 1. What is VAPI

Vapi is a developer platform for building **voice AI agents**. It handles real-time voice-to-voice conversations by orchestrating three pipeline stages:

1. **Transcriber (STT)** -- Converts user speech to text
2. **LLM (Model)** -- Processes conversation, generates response text
3. **Voice (TTS)** -- Converts response text back to speech

Vapi manages latency optimization, scaling, streaming, and conversation flow. Target voice-to-voice round-trip latency is **500-700ms**.

---

## 2. Authentication

**API Base URL:** `https://api.vapi.ai`

**Two types of keys** (found at https://dashboard.vapi.ai):

| Key Type | Use Case | Where Used |
|----------|----------|------------|
| **Private API Key** (Bearer token) | Server-side REST API calls | `Authorization: Bearer <VAPI_API_KEY>` header |
| **Public API Key** | Client-side Web SDK initialization | Passed to `new Vapi('PUBLIC_KEY')` constructor |

**IMPORTANT:** Never expose your private API key in client-side code. The public key is safe for browsers.

**Authentication header for all REST API calls:**
```
Authorization: Bearer YOUR_PRIVATE_API_KEY
Content-Type: application/json
```

---

## 3. Creating an Assistant

### 3.1 REST API

```
POST https://api.vapi.ai/assistant
```

**Minimal request:**
```json
{
  "name": "My Assistant",
  "firstMessage": "Hello! How can I help you today?",
  "model": {
    "provider": "openai",
    "model": "gpt-4o",
    "messages": [
      {
        "role": "system",
        "content": "You are a friendly support assistant. Keep responses under 30 words."
      }
    ]
  },
  "voice": {
    "provider": "11labs",
    "voiceId": "21m00Tcm4TlvDq8ikWAM"
  },
  "transcriber": {
    "provider": "deepgram",
    "model": "nova-2",
    "language": "en"
  }
}
```

**Full assistant configuration fields:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name for the assistant |
| `firstMessage` | string | Greeting spoken when a call connects. If null, assistant waits for user to speak first. |
| `model` | object | LLM configuration (see section 4) |
| `voice` | object | TTS voice configuration (see section 5) |
| `transcriber` | object | STT configuration (see section 6) |
| `server` | object | `{ url, credentialId, timeoutSeconds }` -- webhook endpoint for events |
| `serverMessages` | string[] | Which events to send to server URL |
| `metadata` | object | Custom key-value pairs |
| `backgroundSound` | string | Background audio during calls (e.g., "office") |
| `silenceTimeoutSeconds` | number | Hang up after N seconds of silence |
| `maxDurationSeconds` | number | Maximum call length |
| `endCallMessage` | string | Message spoken before ending call |
| `analysisPlan` | object | Post-call analysis (summary, success evaluation, structured data) |

**Response (201 Created):**
```json
{
  "id": "asst_abc123...",
  "orgId": "org_xyz...",
  "name": "My Assistant",
  "firstMessage": "Hello! How can I help you today?",
  "model": { ... },
  "voice": { ... },
  "transcriber": { ... },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 3.2 Python SDK

```bash
pip install vapi_server_sdk
```

```python
from vapi import VapiClient

client = VapiClient(token="YOUR_PRIVATE_API_KEY")

assistant = client.assistants.create(
    name="Interview Bot",
    first_message="Hello! Welcome to your interview.",
    model={
        "provider": "openai",
        "model": "gpt-4o",
        "messages": [
            {
                "role": "system",
                "content": "You are a technical interviewer..."
            }
        ]
    },
    voice={
        "provider": "11labs",
        "voiceId": "21m00Tcm4TlvDq8ikWAM"
    },
    transcriber={
        "provider": "deepgram",
        "model": "nova-2",
        "language": "en"
    }
)

print("Assistant ID:", assistant.id)
```

### 3.3 Other Assistant REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/assistant` | List all assistants |
| `GET` | `/assistant/{id}` | Get single assistant |
| `PATCH` | `/assistant/{id}` | Update assistant |
| `DELETE` | `/assistant/{id}` | Delete assistant |

All list endpoints support pagination via `limit` (default 100, max 1000).

---

## 4. Model (LLM) Configuration

The `model` field on an assistant configures which LLM powers the conversation.

```json
{
  "model": {
    "provider": "openai",
    "model": "gpt-4o",
    "messages": [
      { "role": "system", "content": "Your system prompt here." }
    ],
    "temperature": 0.7,
    "maxTokens": 250
  }
}
```

### Supported LLM Providers and Models

| Provider value | Models (examples) |
|---------------|-------------------|
| `"openai"` | `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `gpt-3.5-turbo` |
| `"anthropic"` | `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`, `claude-3-haiku-20240307` |
| `"google"` | `gemini-1.5-pro`, `gemini-1.5-flash`, `gemini-2.0-flash` |
| `"groq"` | `llama-3.1-70b-versatile`, `llama-3.1-8b-instant` |
| `"together-ai"` | Various open-source models |
| `"openrouter"` | Aggregator -- access to many models |
| `"custom-llm"` | Your own LLM server via `model.url` |

### System Prompt

The system prompt goes in `model.messages` as a message with `role: "system"`:

```json
{
  "model": {
    "provider": "openai",
    "model": "gpt-4o",
    "messages": [
      {
        "role": "system",
        "content": "You are interviewing a candidate for a Python developer role.\n\nCandidate background: {github_summary}\n\nJob description: {job_description}\n\nConduct a realistic 10-minute technical interview."
      }
    ]
  }
}
```

### Tool / Function Calling

Define functions the assistant can invoke during conversation:

```json
{
  "model": {
    "provider": "openai",
    "model": "gpt-4o",
    "messages": [{ "role": "system", "content": "..." }],
    "functions": [
      {
        "name": "endInterview",
        "description": "Called when the interview is complete.",
        "parameters": {
          "type": "object",
          "properties": {
            "rating": { "type": "number", "description": "1-10 rating" },
            "feedback": { "type": "string", "description": "Brief feedback" }
          },
          "required": ["rating", "feedback"]
        }
      }
    ]
  }
}
```

When the LLM invokes a function, Vapi sends a `tool-calls` event to your server URL.

---

## 5. Voice (TTS) Configuration

```json
{
  "voice": {
    "provider": "11labs",
    "voiceId": "21m00Tcm4TlvDq8ikWAM",
    "stability": 0.5,
    "similarityBoost": 0.75
  }
}
```

### Supported Voice Providers

| Provider value | Notes |
|---------------|-------|
| `"11labs"` | ElevenLabs -- high quality, many voices. Popular voiceIds: `21m00Tcm4TlvDq8ikWAM` (Rachel), `EXAVITQu4vr4xnSDxMaL` (Bella) |
| `"playht"` | PlayHT -- quality voices |
| `"azure"` | Azure Cognitive Services TTS |
| `"cartesia"` | Cartesia -- fast, low-latency voices |
| `"deepgram"` | Deepgram Aura TTS |
| `"openai"` | OpenAI TTS: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer` |

---

## 6. Transcriber (STT) Configuration

```json
{
  "transcriber": {
    "provider": "deepgram",
    "model": "nova-2",
    "language": "en",
    "keywords": ["Vapi:2", "hackathon:1"]
  }
}
```

### Supported Transcriber Providers

| Provider value | Models | Notes |
|---------------|--------|-------|
| `"deepgram"` | `nova-2`, `nova`, `enhanced`, `base` | Most popular. Supports keywords boosting |
| `"assembly-ai"` | `best`, `nano` | Good accuracy |
| `"azure"` | `default` | 100+ language locales |
| `"google"` | Gemini variants | Multilingual |
| `"openai"` | `gpt-4o-transcribe` | |

---

## 7. Making Calls

### 7.1 Web Call (Browser -- using @vapi-ai/web SDK)

**Install:**
```bash
npm install @vapi-ai/web
```

**Initialize and start a call:**
```typescript
import Vapi from '@vapi-ai/web';

// Use your PUBLIC key (not private!)
const vapi = new Vapi('YOUR_PUBLIC_API_KEY');

// Start call with a pre-created assistant
vapi.start('YOUR_ASSISTANT_ID');

// OR start with an inline (transient) assistant config:
vapi.start({
  model: {
    provider: "openai",
    model: "gpt-4o",
    messages: [{ role: "system", content: "You are a helpful assistant." }]
  },
  voice: {
    provider: "11labs",
    voiceId: "21m00Tcm4TlvDq8ikWAM"
  },
  firstMessage: "Hi there! How can I help?"
});

// Stop the call
vapi.stop();
```

**Event listeners:**
```typescript
vapi.on('call-start', () => {
  console.log('Call has started - WebRTC connected');
});

vapi.on('call-end', () => {
  console.log('Call has ended');
});

vapi.on('speech-start', () => {
  console.log('Assistant started speaking');
});

vapi.on('speech-end', () => {
  console.log('Assistant stopped speaking');
});

vapi.on('message', (message) => {
  if (message.type === 'transcript') {
    console.log(`${message.role}: ${message.transcript}`);
    // message.role is 'user' or 'assistant'
    // message.transcriptType is 'partial' or 'final'
  }
});

vapi.on('error', (error) => {
  console.error('Vapi error:', error);
});
```

### 7.2 Phone Call (Outbound via API)

```
POST https://api.vapi.ai/call
```
```json
{
  "assistantId": "asst_abc123",
  "phoneNumberId": "pn_xyz789",
  "customer": {
    "number": "+14155551234"
  }
}
```

### 7.3 Web Call vs Phone Call Differences

| Aspect | Web Call | Phone Call |
|--------|---------|------------|
| Requires phone number | No | Yes |
| Transport | WebRTC (browser) | PSTN / SIP |
| Initiated by | Client SDK `vapi.start()` | REST API `POST /call` |
| Authentication | Public key (client-side) | Private key (server-side) |
| Audio quality | High (WebRTC adaptive) | Standard telephony |
| Cost | Lower (no telephony) | Higher (telephony minutes) |

---

## 8. Getting Call Transcripts

### 8.1 After a call ends -- REST API

```
GET https://api.vapi.ai/call/{callId}
```

**Response includes:**
```json
{
  "id": "call_abc123",
  "type": "webCall",
  "status": "ended",
  "startedAt": "2024-01-01T00:00:00.000Z",
  "endedAt": "2024-01-01T00:05:00.000Z",
  "endedReason": "hangup",
  "duration": 300,
  "artifact": {
    "transcript": "AI: Hello! How can I help?\nUser: I need to reset my password.\nAI: I can help with that...",
    "recordingUrl": "https://...",
    "messages": [
      { "role": "assistant", "message": "Hello! How can I help?", "time": 1000, "duration": 1500 },
      { "role": "user", "message": "I need to reset my password.", "time": 3000, "duration": 2000 },
      { "role": "assistant", "message": "I can help with that...", "time": 5500, "duration": 2500 }
    ]
  },
  "costs": [
    { "type": "transcriber", "minutes": 5.0, "cost": 0.05 },
    { "type": "model", "promptTokens": 1200, "completionTokens": 800, "cost": 0.03 },
    { "type": "voice", "characters": 500, "cost": 0.02 },
    { "type": "vapi", "minutes": 5.0, "cost": 0.05 }
  ],
  "analysis": {
    "summary": "User called to reset their password...",
    "successEvaluation": "true"
  }
}
```

**List calls with filtering:**
```
GET https://api.vapi.ai/call?assistantId=asst_abc123&limit=50
```

### 8.2 Real-time during a call (Web SDK)

```typescript
vapi.on('message', (message) => {
  if (message.type === 'transcript') {
    // message.transcriptType: 'partial' or 'final'
    // message.role: 'user' or 'assistant'
    // message.transcript: the text
    console.log(`[${message.role}]: ${message.transcript}`);
  }
});
```

### 8.3 Via webhook (end-of-call-report)

Your server URL receives `end-of-call-report` automatically after each call:

```json
{
  "message": {
    "type": "end-of-call-report",
    "endedReason": "hangup",
    "call": { "id": "call_abc123" },
    "artifact": {
      "transcript": "AI: Hello! ...",
      "messages": [ ... ]
    }
  }
}
```

---

## 9. Webhooks / Server URLs

### 9.1 Configuration

Set on the assistant:
```json
{
  "server": {
    "url": "https://your-server.com/webhook"
  }
}
```

### 9.2 Events That REQUIRE a Response

#### `assistant-request`
**When:** Inbound call arrives with no pre-assigned assistant.
**You must respond within 7.5 seconds.**

```json
// Response option 1 -- existing assistant:
{ "assistantId": "asst_abc123" }

// Response option 2 -- inline assistant:
{
  "assistant": {
    "firstMessage": "Hello!",
    "model": { "provider": "openai", "model": "gpt-4o", "messages": [{ "role": "system", "content": "..." }] },
    "voice": { "provider": "11labs", "voiceId": "21m00Tcm4TlvDq8ikWAM" }
  }
}
```

#### `tool-calls`
**When:** Assistant invokes a function/tool during conversation.

```json
// Incoming:
{
  "message": {
    "type": "tool-calls",
    "toolCallList": [
      { "id": "tc_abc", "name": "endInterview", "parameters": { "rating": 8, "feedback": "Strong candidate" } }
    ]
  }
}

// Response:
{
  "results": [
    { "name": "endInterview", "toolCallId": "tc_abc", "result": "{\"status\": \"recorded\"}" }
  ]
}
```

### 9.3 Informational Events (no response required)

| Event Type | When it fires | Key payload fields |
|-----------|--------------|-------------------|
| `status-update` | Call status changes | `status`: scheduled, queued, ringing, in-progress, ended |
| `end-of-call-report` | Call ends | `artifact.transcript`, `artifact.messages`, `endedReason` |
| `transcript` | Real-time transcription | `role`, `transcript`, `transcriptType` (partial/final) |
| `speech-update` | Speaking starts/stops | `status` (started/stopped), `role` |

### 9.4 Example FastAPI Webhook Server

```python
from fastapi import FastAPI, Request

app = FastAPI()

@app.post("/webhook")
async def vapi_webhook(request: Request):
    body = await request.json()
    message = body.get("message", {})
    msg_type = message.get("type")

    if msg_type == "tool-calls":
        results = []
        for tc in message.get("toolCallList", []):
            if tc["name"] == "endInterview":
                # Save interview results to database
                results.append({
                    "name": tc["name"],
                    "toolCallId": tc["id"],
                    "result": '{"status": "recorded"}'
                })
        return {"results": results}

    elif msg_type == "end-of-call-report":
        transcript = message.get("artifact", {}).get("transcript", "")
        call_id = message.get("call", {}).get("id")
        # Save transcript to database
        print(f"Call {call_id} ended. Transcript length: {len(transcript)}")
        return {}

    elif msg_type == "status-update":
        print(f"Call status: {message.get('status')}")
        return {}

    return {}
```

---

## 10. Full End-to-End Example Flow

### Interview App Flow: Create Assistant -> Browser Call -> Get Transcript

**Step 1: Create assistant (server-side Python):**

```python
import requests

VAPI_API_KEY = "your_private_key"
headers = {
    "Authorization": f"Bearer {VAPI_API_KEY}",
    "Content-Type": "application/json"
}

# Create an interview assistant with candidate + job context
assistant_data = {
    "name": f"Interview - {candidate_name} - {job_title}",
    "firstMessage": f"Hello {candidate_name}! Welcome to your interview for the {job_title} position at {company_name}. I'll be conducting your technical interview today. Shall we begin?",
    "model": {
        "provider": "openai",
        "model": "gpt-4o",
        "messages": [{
            "role": "system",
            "content": f"""You are a professional technical interviewer conducting an interview for:

Company: {company_name}
Position: {job_title}
Required Skills: {', '.join(required_skills)}

Candidate Background:
- Name: {candidate_name}
- Top Languages: {', '.join(top_languages)}
- Notable Projects: {projects_summary}
- Experience: {experience_summary}

Interview Guidelines:
- Ask 4-5 technical questions related to the required skills
- Tailor questions based on the candidate's actual experience
- Start with easier questions, gradually increase difficulty
- Ask follow-up questions based on their answers
- Be professional, encouraging, and constructive
- After all questions, thank them and end the interview
- Keep the interview to about 10 minutes"""
        }]
    },
    "voice": {
        "provider": "11labs",
        "voiceId": "21m00Tcm4TlvDq8ikWAM"
    },
    "transcriber": {
        "provider": "deepgram",
        "model": "nova-2",
        "language": "en"
    },
    "maxDurationSeconds": 900,
    "silenceTimeoutSeconds": 30,
    "server": {
        "url": "https://your-server.com/webhook"
    }
}

resp = requests.post(
    "https://api.vapi.ai/assistant",
    headers=headers,
    json=assistant_data
)
assistant = resp.json()
assistant_id = assistant["id"]
```

**Step 2: Start call from browser (React component):**

```jsx
import Vapi from '@vapi-ai/web';
import { useState, useRef } from 'react';

function InterviewRoom({ assistantId }) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const vapiRef = useRef(null);

  const startInterview = () => {
    const vapi = new Vapi('YOUR_PUBLIC_KEY');
    vapiRef.current = vapi;

    vapi.on('call-start', () => setIsCallActive(true));
    vapi.on('call-end', () => {
      setIsCallActive(false);
      // Fetch final transcript from backend
    });
    vapi.on('speech-start', () => setIsSpeaking(true));
    vapi.on('speech-end', () => setIsSpeaking(false));
    vapi.on('message', (msg) => {
      if (msg.type === 'transcript' && msg.transcriptType === 'final') {
        setTranscript(prev => [...prev, {
          role: msg.role,
          text: msg.transcript
        }]);
      }
    });

    vapi.start(assistantId);
  };

  const endInterview = () => {
    vapiRef.current?.stop();
  };

  return (
    <div>
      {!isCallActive ? (
        <button onClick={startInterview}>Start Interview</button>
      ) : (
        <button onClick={endInterview}>End Interview</button>
      )}
      {isSpeaking && <p>Interviewer is speaking...</p>}
      <div>
        {transcript.map((t, i) => (
          <p key={i}><strong>{t.role}:</strong> {t.text}</p>
        ))}
      </div>
    </div>
  );
}
```

**Step 3: Get transcript after call (server-side):**

```python
import requests

def get_call_transcript(call_id):
    resp = requests.get(
        f"https://api.vapi.ai/call/{call_id}",
        headers={"Authorization": f"Bearer {VAPI_API_KEY}"}
    )
    call_data = resp.json()
    return {
        "transcript": call_data.get("artifact", {}).get("transcript", ""),
        "messages": call_data.get("artifact", {}).get("messages", []),
        "duration": call_data.get("duration"),
        "summary": call_data.get("analysis", {}).get("summary"),
    }
```

---

## 11. Call Object Reference

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique call identifier |
| `type` | enum | `inboundPhoneCall`, `outboundPhoneCall`, `webCall` |
| `status` | enum | `queued`, `ringing`, `in-progress`, `ended` |
| `endedReason` | string | `hangup`, `silence-timed-out`, `max-duration-reached` |
| `startedAt` | datetime | Call start time |
| `endedAt` | datetime | Call end time |
| `duration` | number | Duration in seconds |
| `artifact.transcript` | string | Full text transcript |
| `artifact.recordingUrl` | string | URL to audio recording |
| `artifact.messages` | array | Structured messages with role, text, timing |
| `costs` | array | Itemized cost breakdown |
| `analysis.summary` | string | AI-generated call summary |

---

## 12. Important Gotchas and Tips

1. **Public vs Private keys:** Use the **public** key in browser code (`@vapi-ai/web`). Use the **private** key for server-side REST API calls. Mixing them up will cause auth failures.

2. **assistant-request timeout:** You have exactly **7.5 seconds** to respond to `assistant-request` webhooks.

3. **firstMessage = null means the assistant listens first.** If you want the bot to greet the caller, always set `firstMessage`.

4. **System prompt length matters for latency.** Shorter system prompts = faster first response. Keep it concise for voice.

5. **WebRTC browser requirements:** The Web SDK needs microphone permission. Handle the permission prompt UX gracefully.

6. **Cost awareness:** Every call component costs money -- transcription, LLM tokens, TTS characters, and platform fees all add up. Use `gpt-4o-mini` during development.

7. **The `server.url` field replaces the deprecated `serverUrl` field.** Use the nested object form.

8. **Pagination defaults to 100 items.** Maximum is 1000.

---

## 13. Quick Reference -- All Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/assistant` | Create assistant |
| `GET` | `/assistant` | List assistants |
| `GET` | `/assistant/{id}` | Get assistant |
| `PATCH` | `/assistant/{id}` | Update assistant |
| `DELETE` | `/assistant/{id}` | Delete assistant |
| `POST` | `/call` | Create call (outbound phone or web) |
| `GET` | `/call` | List calls |
| `GET` | `/call/{id}` | Get call (with transcript, recording, costs) |
| `POST` | `/phone-number` | Create/provision phone number |
| `GET` | `/phone-number` | List phone numbers |

**All endpoints use base URL:** `https://api.vapi.ai`

---

## 14. SDK Packages

| Platform | Package | Install |
|----------|---------|---------|
| Web (browser) | `@vapi-ai/web` | `npm install @vapi-ai/web` |
| Server (Node.js) | `@vapi-ai/server-sdk` | `npm install @vapi-ai/server-sdk` |
| Server (Python) | `vapi_server_sdk` | `pip install vapi_server_sdk` |
| React Native | `@vapi-ai/react-native` | `npm install @vapi-ai/react-native` |
