export const config = {
  sources: {
    rss: [
      { id: 'techcrunch', url: 'https://techcrunch.com/feed/', category: 'Technology' },
      { id: 'hackernews', url: 'https://hnrss.org/frontpage', category: 'Tech News' },
      { id: 'verge', url: 'https://www.theverge.com/rss/index.xml', category: 'Technology' }
    ]
  },
  ai: {
    // Fast, cheap model for mapping/scoring (guaranteed JSON compatibility)
    modelFlash: 'openai/gpt-4o-mini',
    // The current state-of-the-art model for premium writing and synthesis
    modelPro: 'anthropic/claude-3.7-sonnet',
    relevanceThreshold: 6,
  },
  delivery: {
    emailFrom: 'Digest <digest@yourdomain.com>',
    emailTo: process.env.DELIVERY_EMAIL || '',
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: process.env.TELEGRAM_CHAT_ID || ''
    }
  }
};
