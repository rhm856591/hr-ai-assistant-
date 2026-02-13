import { NextResponse } from 'next/server';
import { parseInterviewConfig } from '@/lib/config-parser';

export async function GET() {
    try {
        const config = parseInterviewConfig();
        return NextResponse.json(config);
    } catch (error) {
        console.error('Error parsing config:', error);
        return NextResponse.json({ error: 'Failed to parse config' }, { status: 500 });
    }
}
