# AI Recruiter Assistant - Conversation Logic (Prompt Engineering)

## Overview
The logic for the AI's behavior is driven by a comprehensive system prompt defined in `instruction.md`. This file acts as the "brain" of the persona "Priya". It dictates the conversation flow, personality, data extraction rules, and tool usage.

## Persona "Priya"
- **Role**: HR Recruitment Associate.
- **Tone**: Warm, professional, casual yet efficient.
- **Style**: Uses natural fillers ("Ah," "I see") and active listening ("That's interesting!") to mimic human conversation.
- **Constraint**: Strict adherence to the script sequence (Stage 1 -> Stage 7).

## Conversation Stages
1. **Introduction**:
    - Greeting and role verification.
    - **Early Exit Rule**: If the candidate is unavailable ("No"), the AI *must* ask for a callback time, then immediately call `reschedule_call` and `end_call`.
2. **Experience & Tech Stack**:
    - Open-ended question about current role.
    - Follow-up on specific tools/languages.
3. **JD-Specific Technical Check**:
    - Dynamic question inserted from `data/jds/{jdId}.json` (e.g., "Explain React Hooks").
4. **Logistics**:
    - Notice period & LWD (Last Working Day).
    - Current location & willingness to relocate (logic handles Remote vs On-site).
5. **Compensation**:
    - Current CTC (Cost to Company).
    - Expected CTC.
6. **Soft Skills Scenario**:
    - Situational question (e.g., "Tell me about a conflict...").
7. **Conclusion**:
    - Thank you message.
    - **Silent Handover**: The AI must stop speaking immediately after the closing line and trigger the `submit_interview_summary` tool.

## Dynamic Placeholders
The `instruction.md` file uses placeholders that are replaced at runtime by `/api/config`:
- `{candidateName}`: The candidate's full name.
- `{roleName}`: The job title (e.g., "Senior Backend Engineer").
- `{companyName}`: The hiring company.
- `{targetLocation}`: The job location (e.g., "Bengaluru").
- `{jdSpecificQuestion}`: A technical question relevant to the JD.

## Data Extraction (Internal Thoughts)
The AI is instructed to "internally extract" structured data from the conversation without speaking it aloud. This data includes:
- `candidate_name`
- `current_role`
- `primary_domain`
- `core_tech_stack`
- `notice_period`
- `current_location`
- `comfortable_relocating`
- `current_ctc`
- `expected_ctc`
- `soft_skills_assessment` (Honesty, Integrity, Commitment, Confidence, Communication)
- `overall_summary`
- `hiring_recommendation` ("Strong Hire", "Hire", "Neutral", "Do Not Hire")

## Tool Usage Rules
- **`submit_interview_summary`**:
    - **Trigger**: Immediately after Stage 7 (Conclusion).
    - **Condition**: Silent execution. Do not announce "I am submitting the summary."
- **`reschedule_call`**:
    - **Trigger**: When the candidate says they are busy or unavailable.
    - **Condition**: Must capture `preferred_time` first. Fires in parallel with `end_call`.
- **`end_call`**:
    - **Trigger**: After `reschedule_call` OR if the candidate explicitly ends the call.
