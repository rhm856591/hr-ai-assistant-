import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('video') as File;

        if (!file) {
            return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const storagePath = process.env.STORAGE_PATH || './storage/recordings';
        const absolutePath = path.resolve(process.cwd(), storagePath);

        // Create directory if it doesn't exist
        if (!fs.existsSync(absolutePath)) {
            fs.mkdirSync(absolutePath, { recursive: true });
        }

        const fileName = `interview_${Date.now()}.webm`;
        const filePath = path.join(absolutePath, fileName);

        fs.writeFileSync(filePath, buffer);

        console.log(`Video saved to ${filePath}`);

        return NextResponse.json({
            success: true,
            message: 'Video saved locally',
            path: filePath
        });
    } catch (error) {
        console.error('Error saving video:', error);
        return NextResponse.json({ error: 'Failed to save video' }, { status: 500 });
    }
}
