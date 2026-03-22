import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { date: string } }) {
  // Extract date parameter carefully
  const date = params.date.replace('.mp3', '');
  const audioPath = path.join(process.cwd(), 'content', 'audio', `${date}.mp3`);
  
  if (!fs.existsSync(audioPath)) {
    return new NextResponse('Audio podcast not found for this date. Ensure your pipeline generated one.', { status: 404 });
  }

  const fileBuffer = fs.readFileSync(audioPath);

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': fileBuffer.length.toString(),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable'
    },
  });
}
