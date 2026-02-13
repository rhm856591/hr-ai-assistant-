# AWS S3 Integration Instructions

To move from local storage to AWS S3, follow these steps:

### 1. Install AWS SDK
```bash
npm install @aws-sdk/client-s3
```

### 2. Update .env.local
Add your AWS credentials:
```env
AWS_REGION=your-region
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=your-bucket-name
```

### 3. Update src/app/api/upload/route.ts
Replace the local filesystem logic with S3 logic:

```typescript
import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('video') as File;

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `interviews/interview_${Date.now()}.webm`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: fileName,
        Body: buffer,
        ContentType: "video/webm"
      })
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Video uploaded to S3',
      path: fileName 
    });
  } catch (error) {
    console.error('Error uploading to S3:', error);
    return NextResponse.json({ error: 'Failed to upload video' }, { status: 500 });
  }
}
```

### 4. Verify Permissions
Ensure your IAM user has `s3:PutObject` permissions for the target bucket.
