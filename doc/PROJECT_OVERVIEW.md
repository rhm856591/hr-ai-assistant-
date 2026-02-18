# AI Recruiter Assistant - Project Overview

## Introduction
This project is an AI-powered HR Recruiter Assistant named **"Priya"**. It is designed to conduct preliminary screening interviews with candidates via a web-based interface. The system uses advanced voice AI to simulate a natural, human-like conversation, ask relevant questions based on the job description (JD), and evaluate candidate responses in real-time.

## Key Features
- **AI Persona ("Priya")**: A friendly, professional, and empathetic HR associate.
- **Dynamic Conversations**: The AI adapts to the candidate's answers while following a structured interview script.
- **JD-Specific Questions**: Technical questions are dynamically injected based on the role the candidate applied for.
- **Video & Audio Recording**: The entire interview session is recorded for review.
- **Real-Time Assessment**: The AI evaluates soft skills (communication, confidence, honesty) during the call.
- **Automated Rescheduling**: If a candidate is busy, the AI can negotiate a callback time and save it.
- **Feedback Generation**: Generates a detailed JSON summary and hiring recommendation immediately after the call.

## User Flow
1. **Invitation**: The candidate receives a unique link with their email and JD ID as parameters (e.g., `?email=john@example.com&jdId=frontend-dev`).
2. **Verification**: The system verifies the candidate against `data/candidates.json` and loads the job description.
3. **Setup**: The candidate grants camera/microphone permissions.
4. **Interview**:
    - **Introduction**: Priya introduces herself and the role.
    - **Screening**: Asking about experience, tech stack, notice period, location, and compensation.
    - **Scenario**: A soft-skills situational question.
5. **Conclusion**:
    - If successful: The call ends with a thank you message.
    - If busy/unavailable: The candidate can reschedule, and the preferred time is saved.
6. **Result**: The candidate sees a confirmation screen ("Interview Completed" or "Call Rescheduled").

## Non-Technical Workflow Diagram
```mermaid
graph TD
    A[Candidate Opens Link] --> B{Verify Identity}
    B -- Valid --> C[Camera/Mic Check]
    B -- Invalid --> D[Error Screen]
    C --> E[Start Interview Button]
    E --> F[AI Voice Call Starts]
    F --> G{Is Candidate Available?}
    G -- No --> H[Reschedule Flow]
    H --> I[Save Callback Time]
    I --> J[Rescheduled Screen]
    G -- Yes --> K[Conduct Interview]
    K --> L[Ask Screening Questions]
    L --> M[Submit Feedback (Silent)]
    M --> N[End Call]
    N --> O[Success Screen]
```

## System Persona
**Name**: Priya
**Role**: HR Associate
**Tone**: Warm, polite, professional, yet conversational. Uses fillers like "I see," "That creates sense" to sound natural.
**Goal**: Screen candidates efficiently while providing a positive candidate experience.
