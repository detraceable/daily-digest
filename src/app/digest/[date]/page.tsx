import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { marked } from 'marked';

export async function generateStaticParams() {
  const contentDir = path.join(process.cwd(), 'content', 'digests');
  if (!fs.existsSync(contentDir)) return [];
  
  const files = fs.readdirSync(contentDir);
  return files
    .filter(file => file.endsWith('.md'))
    .map(file => ({
      date: file.replace('.md', ''),
    }));
}

export default async function DigestPage({ params }: { params: { date: string } }) {
  const contentDir = path.join(process.cwd(), 'content', 'digests');
  const filePath = path.join(contentDir, `${params.date}.md`);
  
  let content = "Digest not found.";
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf-8');
  }

  // Convert markdown to HTML securely using marked
  const htmlContent = marked.parse(content);

  return (
    <main className="container">
      <Link href="/" style={{ color: 'hsl(var(--primary))', fontWeight: 600, marginBottom: '2rem', display: 'inline-block', transition: 'opacity 0.2s' }}>
        &larr; Back to all digests
      </Link>
      
      <article className="glass markdown-content" style={{ padding: '3.5rem' }}>
        <h1 style={{ marginBottom: '2.5rem', fontSize: '3rem', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '1.5rem' }}>
          {params.date} Edition
        </h1>
        
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
      </article>
    </main>
  );
}
