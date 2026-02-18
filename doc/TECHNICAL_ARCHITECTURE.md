# AI Recruiter Assistant - Technical Architecture

## Technology Stack
- **Frontend**: Next.js (App Router), React, Tailwind CSS.  
- **Voice AI**: Vapi (Web SDK) + ElevenLabs (Voice Generation) + OpenAI GPT-4o (LLM).  
- **Backend**: Next.js API Routes (`/api/*`).  
- **Data Storage**: JSON flat files (`/data/*.json`) for candidates, JDs, pending reschedules.  
- **Styling**: Tailwind CSS + Shadcn-like components (lucide-react icons).  
- **Media**: `MediaRecorder` API for video/audio capture, stored locally on the server.  

## File Structure Overview
- `src/app/page.tsx`: The main interview interface.
- `src/components/InterviewInterface.tsx`: The core component handling Vapi, MediaRecorder, and UI states.
- `src/app/api/config/route.ts`: API to fetch candidate details and specific JD question.
- `src/app/api/feedback/route.ts`: API to save interview feedback JSON.
- `src/app/api/reschedule/route.ts`: API to save callback requests.
- `src/app/api/upload/route.ts`: API to handle video/audio file uploads.
- `data/candidates.json`: List of invited candidates and their statuses.
- `data/jds/*.json`: Job descriptions, role details, and specific questions.
- `data/reschedules.json`: Stores reschedule requests.
- `storage/`: Directory where uploaded video recordings are saved.
- `instruction.md`: The system prompt for the AI persona ("Priya").

## Data Flow
### 1. Initialization (`/api/config`)
- **GET request** with `email` and `jdId`.
- Reads `data/candidates.json` to verify the candidate.
- Reads `data/jds/{jdId}.json` to get role details.
- Reads `instruction.md` for the system prompt.
- **Dynamic Prompt Engineering**: Replaces placeholders (`{candidateName}`, `{roleName}`, `{jdSpecificQuestion}`, etc.) in the prompt with actual data.
- Returns the processed instructions and candidate metadata to the frontend.

### 2. Voice Call (Vapi Integration)
- **Frontend (`InterviewInterface.tsx`)** initializes Vapi with the public key.
- Sends the `instruction` prompt to Vapi.
- **Vapi** handles:
    - Text-to-Speech (TTS) using ElevenLabs ("shimmer" voice).
    - Speech-to-Text (STT) using Deepgram ("nova-2").
    - LLM Processing using GPT-4o.
- **Tool Calling**: The LLM can call predefined tools:
    - `submit_interview_summary`: Triggered at the end of a successful interview.
    - `reschedule_call`: Triggered if the candidate is busy.
    - `end_call`: Triggered to gracefully end the connection.

### 3. Media Recording (`MediaRecorder`)
- The browser requests camera/microphone access.
- **Audio Mixing**:
    - Captures the user's microphone stream.
    - Captures the AI's audio stream (via Vapi's `daily-participant-updated` event) using `AudioContext`.
    - Mixes both streams into a single destination.
- **Video Recording**: Combines the camera video track with the mixed audio track.
- **Upload**: Once recording stops, the blob is sent to `/api/upload`.

### 4. Feedback Loop (`/api/feedback`)
- When `submit_interview_summary` is called by the AI, the tool arguments (JSON) are sent to the frontend via Vapi's `message` event.
- The frontend forwards this JSON to `/api/feedback`.
- The backend saves the feedback to a JSON file (or database).

### 5. Rescheduling (`/api/reschedule`)
- When `reschedule_call` is triggered, the frontend captures the preferred time.
- Sends a POST request to `/api/reschedule`.
- The backend appends the request to `data/reschedules.json`.

## Database Design (JSON Based)
### `candidates.json`
```json
[
  { "email": "user@example.com", "name": "John Doe", "status": "invited" }
]
```

### `reschedules.json`
```json
[
  {
    "id": "reschedule_123456789",
    "candidateName": "John Doe",
    "email": "user@example.com",
    "jdId": "frontend-dev",
    "preferredTime": "Monday morning",
    "notes": "Calling back later",
    "status": "pending_reschedule",
    "createdAt": "2024-05-20T10:00:00Z"
  }
]
```
