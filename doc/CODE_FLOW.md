# AI Recruiter Assistant - Code Flow

## Interview Interface Logic (`src/components/InterviewInterface.tsx`)

This component manages the entire interview session, including UI states, media streams, and Vapi integration.

### State Management
- `isCalling`: Whether the AI call is currently active.
- `isLoading`: Whether the config or media permissions are being initialized.
- `stream`: The user's camera/microphone stream (`MediaStream`).
- `interviewConfig`: The parsed instructions and candidate data from `/api/config`.
- `feedbackData`: The final interview summary JSON returned by the AI tool call.
- `isRescheduled`: Flag if the candidate requested a callback time.
- `rescheduleData`: Stores the preferred callback time and notes.

### Initialization Sequence
1. **`useEffect` (Main Hook)**:
    - Checks for `email` and `jdId` in search params.
    - Fetches `/api/config`:
        - Loads candidate data.
        - Loads JD details.
        - Parses `instruction.md` template.
    - Sets `interviewConfig`.
    - Initializes the Vapi client (`vapi.currrent`).
2. **`setupMedia` function**:
    - Requests `navigator.mediaDevices.getUserMedia({ audio: true, video: true })`.
    - Stores the `MediaStream` in `stream` and `videoRef.current`.
3. **`handleStart` function**:
    - Ensures permissions are granted.
    - Sets up **Audio Mixing**:
        - Creates an `AudioContext`.
        - Connects the user's microphone (`MediaStreamAudioSourceNode`) to a `MediaStreamAudioDestinationNode`.
        - Captures the mixed audio stream.
    - Starts `MediaRecorder` with the mixed audio stream + video track.
    - Uploads the recording locally to `/api/upload` when stopped.
    - Starts the Vapi call using `vapi.current.start(payload)`.

### Vapi Integration
- **`startPayload`**:
    - Contains the system prompt (`interviewConfig.instructions`).
    - Defines the tool definitions:
        - `submit_interview_summary`: JSON tool to finalize the interview.
        - `reschedule_call`: Tool to save callback requests.
        - `end_call`: Tool to gracefully disconnect.
    - Sets the AI voice provider (ElevenLabs/OpenAI) and language model (GPT-4o).
    - Sets the `firstMessage` ("Hi! I'm Priya...").

### Event Handlers (`onMessage`)
- Listens for `tool-calls` from Vapi.
- **`submit_interview_summary`**:
    - Receives the JSON arguments (summary, soft skills, hiring recommendation).
    - Updates `feedbackData` state.
    - Sends a tool result back to Vapi ("JSON_SUBMITTED_SILENTLY...").
    - POSTs the JSON to `/api/feedback`.
    - Stops the Vapi call after an 8-second delay (to allow the AI to finish speaking).
- **`reschedule_call`**:
    - Receives `preferred_time` and `notes` arguments.
    - Updates `rescheduleData` state.
    - Sends tool result back ("RESCHEDULE_SAVED...").
    - POSTs the data to `/api/reschedule`.
    - Sets `isRescheduled(true)` and stops the call after 3 seconds.
- **`end_call`**:
    - Sends "DISCONNECTING" result.
    - Stops the call after a 2-second delay.

### UI Rendering Logic
- If `isRescheduled`: Show the confirm reschedule screen (blue theme).
- If `isInterviewEnded`: Show the success screen (green theme).
- Else: Show the live video feed with overlay controls (mute/unmute/end call).
