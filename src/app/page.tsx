import fs from 'fs';
import path from 'path';
import Link from 'next/link';

function getDigests() {
  const contentDir = path.join(process.cwd(), 'content', 'digests');
  if (!fs.existsSync(contentDir)) return [];
  
  const files = fs.readdirSync(contentDir);
  return files
    .filter(file => file.endsWith('.md'))
    .map(file => {
      const date = file.replace('.md', '');
      return { date, file };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export default function Home() {
  const digests = getDigests();

  return (
    <main className="container">
      <header style={{ marginBottom: '5rem', textAlign: 'center' }}>
        <h1 className="gradient-text" style={{ fontSize: '4rem', marginBottom: '1rem', lineHeight: 1.1 }}>Daily Digest</h1>
        <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '1.25rem', maxWidth: '500px', margin: '0 auto' }}>
          Your personalized, AI-curated daily reading list. Strictly signal, zero noise.
        </p>
      </header>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {digests.length === 0 ? (
          <div className="glass" style={{ padding: '4rem', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>No digests found</h3>
            <p style={{ color: 'hsl(var(--muted-foreground))' }}>Run the daily script to generate your first digest!</p>
          </div>
        ) : (
          digests.map((digest) => (
            <Link key={digest.date} href={`/digest/${digest.date}`}>
              <article className="glass" style={{ padding: '2.5rem', transition: 'all 0.3s ease', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Edition</span>
                    <h2 style={{ fontSize: '1.75rem', marginTop: '0.25rem' }}>{digest.date}</h2>
                  </div>
                  <div style={{ color: 'hsl(var(--primary))', fontSize: '1.5rem' }}>
                    &rarr;
                  </div>
                </div>
              </article>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
