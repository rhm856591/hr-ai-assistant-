import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { candidateName, email, jdId, preferredTime, notes } = body;

        if (!candidateName || !preferredTime) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const reschedulesPath = path.join(process.cwd(), 'data', 'reschedules.json');

        // Load existing reschedules
        let reschedules = [];
        if (fs.existsSync(reschedulesPath)) {
            const raw = fs.readFileSync(reschedulesPath, 'utf8');
            reschedules = JSON.parse(raw);
        }

        const newEntry = {
            id: `reschedule_${Date.now()}`,
            candidateName,
            email: email || null,
            jdId: jdId || null,
            preferredTime,
            notes: notes || null,
            status: 'pending_reschedule',
            createdAt: new Date().toISOString(),
        };

        reschedules.push(newEntry);
        fs.writeFileSync(reschedulesPath, JSON.stringify(reschedules, null, 2));

        console.log('Reschedule saved:', newEntry);
        return NextResponse.json({ success: true, entry: newEntry });

    } catch (error) {
        console.error('Error saving reschedule:', error);
        return NextResponse.json({ error: 'Failed to save reschedule' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const reschedulesPath = path.join(process.cwd(), 'data', 'reschedules.json');
        if (!fs.existsSync(reschedulesPath)) {
            return NextResponse.json([]);
        }
        const raw = fs.readFileSync(reschedulesPath, 'utf8');
        return NextResponse.json(JSON.parse(raw));
    } catch (error) {
        console.error('Error reading reschedules:', error);
        return NextResponse.json({ error: 'Failed to read reschedules' }, { status: 500 });
    }
}
