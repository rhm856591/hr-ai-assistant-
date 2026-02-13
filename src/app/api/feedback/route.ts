import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { candidateName, feedback } = body;

        if (!feedback) {
            return NextResponse.json({ error: 'No feedback data provided' }, { status: 400 });
        }

        const storagePath = process.env.STORAGE_PATH_FEEDBACK || './storage/feedback';
        const absolutePath = path.resolve(process.cwd(), storagePath);

        // Create directory if it doesn't exist
        if (!fs.existsSync(absolutePath)) {
            fs.mkdirSync(absolutePath, { recursive: true });
        }

        const fileName = `feedback_${candidateName || 'unknown'}_${Date.now()}.json`;
        const filePath = path.join(absolutePath, fileName);

        fs.writeFileSync(filePath, JSON.stringify(feedback, null, 2));

        console.log(`Feedback saved to ${filePath}`);

        return NextResponse.json({
            success: true,
            message: 'Feedback saved locally',
            path: filePath
        });
    } catch (error) {
        console.error('Error saving feedback:', error);
        return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
    }
}
