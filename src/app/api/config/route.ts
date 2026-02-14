import { NextResponse } from 'next/server';
import { parseInterviewConfig } from '@/lib/config-parser';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const jdId = searchParams.get('jdId');

    if (!email || !jdId) {
        return NextResponse.json({ error: 'Missing email or jdId in parameters' }, { status: 400 });
    }

    try {
        // 1. Verify Candidate
        const candidatesPath = path.join(process.cwd(), 'data', 'candidates.json');
        const candidates = JSON.parse(fs.readFileSync(candidatesPath, 'utf8'));
        const candidate = candidates.find((c: any) => c.email.toLowerCase() === email.toLowerCase());

        if (!candidate) {
            return NextResponse.json({ error: 'Candidate not found or unauthorized' }, { status: 401 });
        }

        // 2. Load JD
        const jdPath = path.join(process.cwd(), 'data', 'jds', `${jdId}.json`);
        if (!fs.existsSync(jdPath)) {
            return NextResponse.json({ error: 'Job Description (JD) not found' }, { status: 404 });
        }
        const jd = JSON.parse(fs.readFileSync(jdPath, 'utf8'));

        // 3. Parse Instruction Template
        const config = parseInterviewConfig();

        // 4. Dynamic Replacement
        // Pick a random specific question from the JD if multiple exist
        const specificQuestion = jd.specificQuestions[Math.floor(Math.random() * jd.specificQuestions.length)];

        let processedInstructions = config.instructions
            .replaceAll('{candidateName}', candidate.name)
            .replaceAll('{roleName}', jd.roleName)
            .replaceAll('{companyName}', jd.companyName)
            .replaceAll('{targetLocation}', jd.targetLocation)
            .replaceAll('{jdSpecificQuestion}', specificQuestion);

        return NextResponse.json({
            ...config,
            instructions: processedInstructions,
            candidateName: candidate.name,
            roleName: jd.roleName,
            companyName: jd.companyName
        });

    } catch (error) {
        console.error('Error parsing dynamic config:', error);
        return NextResponse.json({ error: 'Failed to process dynamic config' }, { status: 500 });
    }
}
