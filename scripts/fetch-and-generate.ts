import fs from 'fs';
import path from 'path';
import Parser from 'rss-parser';
import OpenAI from 'openai';
import { Resend } from 'resend';
import { marked } from 'marked';
import { config } from '../src/config.js';

// 1. Initialize
const ai = new OpenAI({ 
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/daily-digest',
    'X-Title': 'Daily Digest Pipeline'
  }
});
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
}

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

async function mapAndScore(articles: RawArticle[]): Promise<ProcessedArticle[]> {
  const processed: ProcessedArticle[] = [];
  console.log(`Scoring ${articles.length} articles with ${config.ai.modelFlash}...`);
  
  for (const article of articles) {
    try {
      const prompt = `
You are a content curator. Evaluate this article for a technology enthusiast.
Title: ${article.title}
Snippet: ${article.contentSnippet}

Provide your response in JSON format exactly like this:
{
  "score": <number 1-10 based on relevance to tech/AI/programming>,
  "summary": "<a punchy, engaging 1-2 sentence summary of the article>"
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

async function synthesizeDigest(articles: ProcessedArticle[]): Promise<string> {
  console.log(`Synthesizing final digest with ${config.ai.modelPro} from ${articles.length} top articles...`);
  
  let contentList = articles.map(a => 
    `Source: ${a.source}\nTitle: ${a.title}\nLink: ${a.link}\nSummary: ${a.summary}\n---`
  ).join('\n');

  const prompt = `
You are an elite Tech Newsletter Editor. 
I am turning these curated, highly relevant articles from the last 24 hours into my personal daily digest.

Here are the articles:
${contentList}

Write a premium, highly readable Daily Digest in Markdown format.
Structure the digest as follows:
- Catchy Headline: Give this edition a creative, insightful title (e.g. ## **AI Models Shrink While Capabilities Explode**)
- Executive Summary: A short introductory paragraph highlighting the overall theme of the day.
- Top Stories: For the 3-4 absolute most important articles, write a cohesive, insightful 1-paragraph synthesis each. Include the Markdown hyperlink [Title](Link) naturally in the text.
- Quick Hits: A bulleted list of the remaining interesting articles, using their summaries. Format: - [Title](Link): Summary.

DO NOT use an overall Markdown # Heading 1 for the title because the frontend already renders the Date Header. Keep the styling clean and engaging.
`;

  const response = await ai.chat.completions.create({
    model: config.ai.modelPro,
    messages: [{ role: 'user', content: prompt }]
  });
  
  return response.choices[0].message?.content || "Failed to generate digest.";
}

async function main() {
  console.log('--- Starting Daily Digest Pipeline ---');
  
  const rawArticles = await fetchRSSConfig();
  console.log(`Found ${rawArticles.length} articles from the last 24 hours.`);
  if (rawArticles.length === 0) return;

  const processedArticles = await mapAndScore(rawArticles);
  
  const filteredArticles = processedArticles
    .filter(a => a.score >= config.ai.relevanceThreshold)
    .sort((a, b) => b.score - a.score);
    
  console.log(`Filtered down to ${filteredArticles.length} highly relevant articles.`);
  if (filteredArticles.length === 0) return;

  const markdownDigest = await synthesizeDigest(filteredArticles);
  
  const dateStr = new Date().toISOString().split('T')[0];
  const outDir = path.join(process.cwd(), 'content', 'digests');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, `${dateStr}.md`);
  fs.writeFileSync(outPath, markdownDigest);
  console.log(`\nSuccess! Digest saved to ${outPath}`);

  // ------------- DELIVERY ------------- 

  // 1. Email via Resend
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && config.delivery.emailTo) {
    console.log('Sending email digest via Resend...');
    const resend = new Resend(resendApiKey);
    const htmlDigest = await marked.parse(markdownDigest);
    
    try {
      await resend.emails.send({
        from: config.delivery.emailFrom,
        to: config.delivery.emailTo,
        subject: `Daily Digest: ${dateStr}`,
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">${htmlDigest}</div>`
      });
      console.log('Email sent successfully!');
    } catch (e) {
      console.error('Failed to send email:', e);
    }
  }

  // 2. Telegram Bot
  const tgToken = config.delivery.telegram.botToken;
  const tgChatId = config.delivery.telegram.chatId;
  
  if (tgToken && tgChatId) {
    console.log('Sending digest to Telegram...');
    try {
      let textToSend = markdownDigest;
      // Telegram has a 4096 char limit. Truncate if necessary.
      if (textToSend.length > 4000) {
        textToSend = textToSend.substring(0, 4000) + '\n\n...[Read the rest on the full site]';
      }
      
      const res = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: tgChatId,
          text: textToSend,
          parse_mode: 'Markdown'
        })
      });
      
      if (!res.ok) {
        console.error('Telegram API error:', await res.text());
      } else {
        console.log('Successfully sent to Telegram!');
      }
    } catch (e) {
      console.error('Failed to send to Telegram:', e);
    }
  }
}

main().catch(console.error);
