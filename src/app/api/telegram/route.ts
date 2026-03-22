import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenRouter for conversational replies
const ai = new OpenAI({ 
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Telegram sends message objects on updates
    const message = body.message;
    if (!message || !message.text) {
      return NextResponse.json({ status: 'ignored' });
    }

    const chatId = message.chat.id;
    const userText = message.text as string;
    const tgToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!tgToken) {
      console.error("Missing TELEGRAM_BOT_TOKEN");
      return NextResponse.json({ error: 'Missing token' }, { status: 500 });
    }

    // Acknowledge receipt to Telegram by showing "typing..."
    await fetch(`https://api.telegram.org/bot${tgToken}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' })
    });

    // Handle basic commands
    if (userText.startsWith('/start')) {
      await sendMessage(tgToken, chatId, "Welcome to your Interactive Daily Digest! I am your AI curator. If you ever want a deeper dive into an article, just ask!");
      return NextResponse.json({ status: 'ok' });
    }

    // Process user query as a deep dive / question against their digest context
    // For V2, we just use a smart model to answer them conversationally
    const prompt = `
You are the user's personal AI Daily Digest Assistant. 
The user is asking you a question via Telegram: "${userText}"
Please provide a helpful, concise, and analytical response. Format your response beautifully using Markdown.
`;

    const aiResponse = await ai.chat.completions.create({
      model: 'anthropic/claude-3.7-sonnet',
      messages: [{ role: 'user', content: prompt }]
    });

    const replyText = aiResponse.choices[0].message?.content || "I couldn't process that request right now.";

    await sendMessage(tgToken, chatId, replyText);
    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function sendMessage(token: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    })
  });
}
