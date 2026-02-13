# AI-First Video Screening Platform: The Autonomous Recruiter

This is a headless AI Video Interview Agent that autonomously conducts screening interviews based on a configuration file.

## Features
- **Persona-as-Code**: The interview's personality and script are defined in `instruction.md`.
- **Voice-to-Voice**: Real-time interaction using Vapi.ai and GPT-4o-realtime.
- **Auto-Recording**: Automatically captures the video session and saves it locally.
- **Premium UI**: Modern dark-mode interface with glassmorphism.

## Tech Stack
- **Frontend**: Next.js (App Router), Tailwind CSS, Lucide React
- **Voice AI**: Vapi.ai
- **Parser**: gray-matter
- **Storage**: Local Filesystem (extendable to S3)

## Prerequisites
1. Get your Vapi Public Key and Private API Key from [Vapi.ai Dashboard](https://dashboard.vapi.ai).
2. Create a `.env.local` file in the root directory (use `.env.local` template provided).

## Environment Variables
```env
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_public_key
VAPI_API_KEY=your_private_api_key
STORAGE_PATH=./storage/recordings
```

## Setup Instructions
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.
4. Grant camera/mic permissions and click "Start Interview".

## Customizing the Interview
Edit `instruction.md` to change the AI's persona, questions, or rules. The application parses this file dynamically on every load.

## Storage
By default, recordings are saved to `storage/recordings/`.

### Moving to AWS S3
To use S3, install the AWS SDK:
```bash
npm install @aws-sdk/client-s3
```
Then update `src/app/api/upload/route.ts` to use `S3Client` and `PutObjectCommand`.

## License
MIT
