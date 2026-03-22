import fs from 'fs';
import path from 'path';
import Link from 'next/link';

function getDigests() {
  const contentDir = path.join(process.cwd(), 'content', 'digests');
  if (!fs.existsSync(contentDir)) return [];
  const files = fs.readdirSync(contentDir);
  return files.filter(f => f.endsWith('.md')).map(f => f.replace('.md', '')).sort().reverse();
}

function getStats() {
  const contentDir = path.join(process.cwd(), 'content', 'digests');
  if (!fs.existsSync(contentDir)) return { count: 0, words: 0 };
  const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'));
  let words = 0;
  files.forEach(f => {
    words += fs.readFileSync(path.join(contentDir, f), 'utf-8').split(/\s+/).length;
  });
  return { count: files.length, words };
}

export default function Dashboard() {
  const digests = getDigests();
  const stats = getStats();
  const latest = digests[0];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sleek Sidebar Navigation */}
      <aside style={{ width: '300px', borderRight: '1px solid hsl(var(--border))', background: 'rgba(5, 5, 8, 0.4)', padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column' }}>
        <h1 className="gradient-text" style={{ fontSize: '1.75rem', marginBottom: '3rem', letterSpacing: '-0.03em' }}>Neuro<span style={{color: 'hsl(var(--foreground))'}}>Digest</span></h1>
        
        <div style={{ marginBottom: '3rem' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.1em', fontWeight: 600 }}>Analytics</span>
          <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem' }}>
            <div className="glass" style={{ padding: '1.25rem', borderRadius: '0.75rem', borderLeft: '3px solid hsl(var(--primary))' }}>
              <div style={{ fontSize: '2.25rem', fontWeight: 700, lineHeight: 1 }}>{stats.count}</div>
              <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.25rem' }}>Total Editions Synthesized</div>
            </div>
            <div className="glass" style={{ padding: '1.25rem', borderRadius: '0.75rem', borderLeft: '3px solid hsl(var(--accent))' }}>
              <div style={{ fontSize: '2.25rem', fontWeight: 700, lineHeight: 1 }}>{Math.round(stats.words / 1000)}k</div>
              <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.25rem' }}>Tokens of Value Processed</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.1em', fontWeight: 600 }}>Archive</span>
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {digests.slice(0, 10).map(d => (
              <Link key={d} href={`/digest/${d}`} style={{ 
                padding: '0.85rem 1rem', 
                borderRadius: '0.5rem', 
                background: d === latest ? 'hsl(var(--primary) / 0.15)' : 'transparent', 
                color: d === latest ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', 
                transition: 'all 0.2s', 
                fontSize: '0.9rem',
                fontWeight: d === latest ? 600 : 400
              }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: d === latest ? 'hsl(var(--primary))' : 'transparent', marginRight: '8px' }}/>
                {d} Edition
              </Link>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Intelligence View */}
      <main style={{ flex: 1, padding: '5rem 4rem', overflowY: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '5rem' }}>
          <div>
            <span style={{ color: 'hsl(var(--primary))', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.05em' }}>SYSTEM OPERATIONAL</span>
            <h2 style={{ fontSize: '3rem', marginBottom: '0.5rem', marginTop: '0.5rem' }}>Intelligence Overview</h2>
            <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '1.2rem' }}>Welcome to your personal autonomous operations center.</p>
          </div>
        </header>

        {latest ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) 1fr', gap: '2.5rem' }}>
             
             {/* Read latest Action Card */}
             <div className="glass" style={{ padding: '3.5rem', position: 'relative', overflow: 'hidden', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.08)' }}>
               {/* Ambient Glow */}
               <div style={{ position: 'absolute', top: 0, right: 0, width: '400px', height: '400px', background: 'radial-gradient(circle, hsl(var(--primary) / 0.2) 0%, transparent 60%)', transform: 'translate(20%, -30%)' }} />
               
               <span style={{ display: 'inline-block', padding: '0.35rem 1rem', background: 'hsl(var(--primary) / 0.2)', color: 'hsl(var(--primary))', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '2rem', letterSpacing: '0.05em' }}>LATEST INTELLIGENCE</span>
               <h3 style={{ fontSize: '2.5rem', marginBottom: '1rem', lineHeight: 1.2 }}>{latest} Edition</h3>
               <p style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '2.5rem', lineHeight: 1.8, fontSize: '1.1rem', maxWidth: '80%' }}>
                 Your automated agent has synthesized the top developments from the last 24 hours across algorithmic intelligence, systems, and global technology.
               </p>
               <Link href={`/digest/${latest}`} style={{ display: 'inline-block', padding: '1rem 2.5rem', background: 'hsl(var(--primary))', color: '#fff', borderRadius: '0.75rem', fontWeight: 600, transition: 'all 0.2s', boxShadow: '0 4px 20px hsl(var(--primary) / 0.3)' }}>
                 Read Complete Digest &rarr;
               </Link>
             </div>

             {/* Web Podcast Player Control Panel */}
             <div className="glass" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', borderRadius: '1.5rem' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>Daily Podcast</h4>
                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', marginBottom: '2rem' }}>Studio-quality AI Text-To-Speech</p>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '1rem', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.05)', padding: '2rem' }}>
                   {/* Visualizer Mockup */}
                   <div style={{ display: 'flex', gap: '4px', height: '40px', alignItems: 'center', marginBottom: '2rem' }}>
                     {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
                       <div key={i} style={{ width: '6px', height: `${Math.max(10, Math.random() * 40)}px`, background: 'hsl(var(--primary))', borderRadius: '4px', opacity: 0.7 }} />
                     ))}
                   </div>
                   
                   {/* Standard DOM Audio Element */}
                   <audio controls src={`/api/audio/${latest}`} style={{ width: '100%', outline: 'none' }} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>Model</div>
                    <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>tts-1-hd</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>Voice</div>
                    <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>Alloy</div>
                  </div>
                </div>
             </div>
          </div>
        ) : (
          <div className="glass" style={{ padding: '5rem', textAlign: 'center', borderRadius: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.75rem' }}>Awaiting Intelligence</h3>
            <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '1.1rem' }}>The automation pipeline has not generated records yet. Trigger the GitHub Action.</p>
          </div>
        )}
      </main>
    </div>
  );
}
