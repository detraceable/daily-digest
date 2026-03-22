import fs from 'fs';
import path from 'path';
import Parser from 'rss-parser';
import OpenAI from 'openai';
import { Resend } from 'resend';
import { marked } from 'marked';
import * as cheerio from 'cheerio';
import { config } from '../src/config.js';

// OpenRouter for text generation
const ai = new OpenAI({ 
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/daily-digest',
    'X-Title': 'Daily Digest Pipeline'
  }
});

const ttsAi = process.env.OPENAI_API_KEY_AUDIO ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY_AUDIO }) : null;

const parser = new Parser();

interface RawArticle {
  title: string;
  link: string;
  source: string;
  contentSnippet: string;
  pubDate: string;
}

interface ProcessedArticle extends RawArticle {
  score: number;
  summary: string;
  deepContent?: string;
}

// 1. Fetch RSS
async function fetchRSSConfig(): Promise<RawArticle[]> {
  const articles: RawArticle[] = [];
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  for (const source of config.sources.rss) {
    try {
      console.log(`Fetching ${source.id}...`);
      const feed = await parser.parseURL(source.url);
      
      feed.items.forEach(item => {
        const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
        if (pubDate >= oneDayAgo) {
          articles.push({
            title: item.title || 'Untitled',
            link: item.link || '',
            source: source.id,
            contentSnippet: (item.contentSnippet || item.content || '').substring(0, 500),
            pubDate: pubDate.toISOString()
          });
        }
      });
    } catch (err) {
      console.error(`Failed to fetch ${source.id}:`, err);
    }
  }
  return articles;
}

// 2. Fetch Reddit
async function fetchRedditConfig(): Promise<RawArticle[]> {
  const articles: RawArticle[] = [];
  if (!config.sources.reddit) return articles;

  console.log(`Fetching top tech Reddit posts...`);
  for (const sub of config.sources.reddit) {
    try {
      const res = await fetch(`https://www.reddit.com/r/${sub}/top.json?t=day&limit=3`, {
        headers: { 'User-Agent': 'DailyDigestBot/1.0' }
      });
      if (!res.ok) continue;
      
      const data = await res.json();
      const posts = data.data?.children || [];

      for (const p of posts) {
        const post = p.data;
        if (!post.title) continue;
        articles.push({
          title: `[Reddit ${sub}] ${post.title}`,
          link: `https://reddit.com${post.permalink}`,
          source: `r/${sub}`,
          contentSnippet: (post.selftext || "External link/Media").substring(0, 500),
          pubDate: new Date(post.created_utc * 1000).toISOString()
        });
      }
    } catch (err) {
      console.error(`Failed to fetch reddit /r/${sub}:`, err);
    }
  }
  return articles;
}

// 3. Map & Score
async function mapAndScore(articles: RawArticle[]): Promise<ProcessedArticle[]> {
  const processed: ProcessedArticle[] = [];
  console.log(`Scoring ${articles.length} total items with ${config.ai.modelFlash}...`);
  
  for (const article of articles) {
    try {
      const prompt = `
You are a content curator. Evaluate this piece of information for a technology enthusiast.
Title: ${article.title}
Snippet: ${article.contentSnippet}

Provide your response in JSON format exactly like this:
{
  "score": <number 1-10 based on relevance to tech/AI/programming>,
  "summary": "<a punchy, engaging 1-2 sentence summary>"
}`;

      const response = await ai.chat.completions.create({
        model: config.ai.modelFlash,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" }
      });
      
      const text = response.choices[0].message?.content;
      if (!text) continue;
      
      const result = JSON.parse(text);
      processed.push({
        ...article,
        score: result.score || 1,
        summary: result.summary || 'No summary generated.'
      });
      
    } catch (err) {
      console.error(`Failed to process article: ${article.title}`);
    }
  }
  return processed;
}

// 4. Synthesize with Deep Context & Auto-Tweeter
async function synthesizeDigest(articles: ProcessedArticle[]): Promise<string> {
  console.log(`Synthesizing massive digest with ${config.ai.modelPro} from full HTML contexts...`);
  
  let contentList = articles.map(a => 
    `Source: ${a.source}\nTitle: ${a.title}\nLink: ${a.link}\nDeep Content/Summary:\n${a.deepContent || a.summary}\n---`
  ).join('\n');

  const prompt = `
You are an elite Tech Newsletter Editor. 
I am turning these curated, heavily context-rich articles from the last 24 hours into my personal daily digest.

Here is the deep-scraped text for today's top stories:
${contentList}

Write a premium, highly readable Daily Digest in Markdown format.
Structure the digest as follows:
- Executive Summary: A short introductory paragraph highlighting the overall theme of the day.
- Top Stories: For the top articles, write a cohesive, insightful 1-paragraph synthesis each. Include the Markdown hyperlink [Title](Link) naturally in the text.
- Quick Hits: A bulleted list of the remaining interesting articles. Format: - [Title](Link): Summary.

CRITICAL V5 INSTRUCTION (DIGITAL TWIN PROTOCOL):
At the absolute bottom of your digest, add a horizontal rule \`---\`.
Below it, write a single, highly engaging, slightly visionary Tweet (under 280 chars) summarizing your most impactful takeaway. 
Format it EXACTLY like this so the script can parse it:
**Auto-Tweet:** <the tweet text goes here>
`;

  const response = await ai.chat.completions.create({
    model: config.ai.modelPro,
    messages: [{ role: 'user', content: prompt }]
  });
  
  return response.choices[0].message?.content || "Failed to generate digest.";
}

// MAIN EXECUTION
async function main() {
  console.log('--- Starting Daily Digest V5 Pipeline ---');
  
  const rawRss = await fetchRSSConfig();
  const rawReddit = await fetchRedditConfig();
  const rawArticles = [...rawRss, ...rawReddit];
  
  console.log(`Found ${rawArticles.length} combined items from the last 24 hours.`);
  if (rawArticles.length === 0) return;

  const processedArticles = await mapAndScore(rawArticles);
  
  const filteredArticles = processedArticles
    .filter(a => a.score >= config.ai.relevanceThreshold)
    .sort((a, b) => b.score - a.score);
    
  console.log(`Filtered down to ${filteredArticles.length} highly relevant articles. Initiating Kinetic Deep Scrape...`);
  if (filteredArticles.length === 0) return;

  // V5 Kinetic Scraper: Deep fetch the top 4 articles for maximum PhD-level context
  const deepArticles = [];
  for (const article of filteredArticles.slice(0, 4)) {
    try {
      console.log(`Deep scraping full HTML context for: ${article.title}`);
      const res = await fetch(article.link, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
      const html = await res.text();
      const $ = cheerio.load(html);
      
      // Strip navigation, ads, and scripts to isolate core article body
      $('script, style, nav, footer, iframe, img, aside, header').remove();
      const fullText = $('body').text().replace(/\\s+/g, ' ').trim().substring(0, 6000); // 6k chars is approx 1500 tokens
      
      deepArticles.push({ ...article, deepContent: fullText || article.contentSnippet });
    } catch(e) {
      console.error(`Scrape failed for ${article.link}, falling back to RSS snippet.`);
      deepArticles.push({ ...article, deepContent: article.contentSnippet });
    }
  }
  
  // Add remaining non-deep scraped items for Quick Hits
  for (const article of filteredArticles.slice(4)) {
    deepArticles.push({ ...article, deepContent: article.contentSnippet });
  }

  const markdownDigest = await synthesizeDigest(deepArticles);
  const dateStr = new Date().toISOString().split('T')[0];
  
  const outDir = path.join(process.cwd(), 'content', 'digests');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // 1. Save Markdown
  const outPath = path.join(outDir, `${dateStr}.md`);
  fs.writeFileSync(outPath, markdownDigest);
  console.log(`Saved Markdown to ${outPath}`);

  // 2. Generate Audio TTS 
  let audioBuffer: Buffer | null = null;
  if (ttsAi) {
    try {
      console.log('Generating podcast audio via OpenAI TTS...');
      const cleanText = markdownDigest.replace(/[\\#\\*\\[\\]\\(\\)\\-]/g, ''); 
      const mp3Response = await ttsAi.audio.speech.create({
        model: 'tts-1-hd',
        voice: 'alloy',
        input: `Welcome to your Daily Digest for ${dateStr}. ${cleanText.substring(0, 4000)}` 
      });
      audioBuffer = Buffer.from(await mp3Response.arrayBuffer());
      
      const audioDir = path.join(process.cwd(), 'content', 'audio');
      if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
      const audioPath = path.join(audioDir, `${dateStr}.mp3`);
      fs.writeFileSync(audioPath, audioBuffer);
      console.log(`Saved Podcast to ${audioPath}`);
    } catch (e) {
      console.error('Failed to generate audio TTS:', e);
    }
  }

  // 3. Telegram Delivery with Native Auto-Tweeter
  const tgToken = config.delivery.telegram.botToken;
  const tgChatId = config.delivery.telegram.chatId;
  
  if (tgToken && tgChatId) {
    console.log('Sending V5 digest to Telegram...');
    try {
      let textToSend = markdownDigest;
      
      // Extract the Auto-Tweet to build the intent URL
      const tweetMatch = markdownDigest.match(/\\*\\*Auto-Tweet:\\*\\*\\s*(.+)/);
      if (tweetMatch && tweetMatch[1]) {
        const rawTweet = tweetMatch[1].trim();
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(rawTweet)}`;
        textToSend += `\\n\\n[🐦 **Tap to Publish as your Digital Twin**](${tweetUrl})`;
        console.log('Successfully generated Auto-Tweet deep-link.');
      }

      if (textToSend.length > 4000) {
        textToSend = textToSend.substring(0, 4000) + '\\n\\n...[Read the rest on the full site]';
      }
      
      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tgChatId, text: textToSend, parse_mode: 'Markdown' })
      });
      
      if (audioBuffer) {
        const formData = new FormData();
        formData.append('chat_id', tgChatId);
        formData.append('audio', new Blob([audioBuffer], { type: 'audio/mpeg' }), `${dateStr}_Podcast.mp3`);
        
        await fetch(`https://api.telegram.org/bot${tgToken}/sendAudio`, {
          method: 'POST',
          body: formData as any
        });
      }
      console.log('Successfully delivered to Telegram!');
    } catch (e) {
      console.error('Failed to send to Telegram:', e);
    }
  }

  // 4. Obsidian Local Injection
  try {
    const obsidianVault = path.join(process.env.HOME || '/Users/youssef', 'Library', 'Mobile Documents', 'iCloud~md~obsidian', 'Documents', 'first');
    if (fs.existsSync(obsidianVault)) {
      console.log("Obsidian vault detected locally! Scanning for today's Daily Note...");
      let targetFile = '';
      const searchForNote = (dir: string) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          if (fs.statSync(fullPath).isDirectory() && !file.startsWith('.')) {
            searchForNote(fullPath);
          } else if (file === `${dateStr}.md`) {
            targetFile = fullPath;
          }
        }
      };
      searchForNote(obsidianVault);

      const appendBlock = `\\n\\n## Automated Intelligence\\n*Synthesized context inserted by Daily Digest Pipeline:*\\n\\n${markdownDigest}\\n`;

      if (targetFile) {
        fs.appendFileSync(targetFile, appendBlock);
        console.log(`Successfully injected digest directly into your Obsidian Daily Note: ${targetFile}`);
      } else {
        const newNotePath = path.join(obsidianVault, `${dateStr}.md`);
        fs.writeFileSync(newNotePath, `# Daily Note: ${dateStr}${appendBlock}`);
        console.log(`Created new Obsidian Daily Note and injected digest: ${newNotePath}`);
      }
    }
  } catch (e) {
    console.error('Obsidian injection failed:', e);
  }
}

main().catch(console.error);
