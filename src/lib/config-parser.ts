import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface InterviewConfig {
  instructions: string;
}

export function parseInterviewConfig(): InterviewConfig {
  const filePath = path.join(process.cwd(), 'instruction.md');
  
  if (!fs.existsSync(filePath)) {
    throw new Error('instruction.md not found');
  }

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const { content } = matter(fileContent);

  return {
    instructions: content,
  };
}
