const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const db = require('../db/database');
const validateToken = require('../middleware/validateToken');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const FREE_LIMIT = 10; // raised from 5 to 10 — builds habit before paywall

function detectContext(text) {
  const t = text.toLowerCase();
  if (/pricing|price|cost|quote|proposal|demo|interested in|tell me more|how much/.test(t)) return 'sales_inquiry';
  if (/unhappy|disappointed|refund|cancel|complaint|wrong|broken|issue|problem|frustrated/.test(t)) return 'complaint';
  if (/partner|supplier|vendor|wholesale|bulk|distribute|collaborate|opportunity/.test(t)) return 'vendor_outreach';
  if (/following up|just checking|circling back|any update|heard back|last email/.test(t)) return 'lead_followup';
  return 'general';
}

function contextLabel(context) {
  return {
    sales_inquiry: '📩 Sales Inquiry',
    complaint: '⚠️ Complaint',
    vendor_outreach: '🤝 Vendor Outreach',
    lead_followup: '🔄 Follow-up',
    general: '💬 General'
  }[context] || '💬 General';
}

router.post('/', validateToken, async (req, res) => {
  const { messageText, toneProfile, replyCount = 3, replyLength = 'medium', context = 'auto' } = req.body;

  if (!messageText || typeof messageText !== 'string' || messageText.trim().length < 5)
    return res.status(400).json({ error: 'Message text is required', code: 'NO_MESSAGE' });

  const user = req.user;

  if (user.plan === 'free' && user.use_count >= FREE_LIMIT) {
    return res.status(403).json({
      error: 'Free limit reached',
      code: 'FREE_LIMIT_REACHED',
      usesRemaining: 0,
      upgradeUrl: process.env.UPGRADE_URL || 'https://yourdomain.com/upgrade'
    });
  }

  // CHROME POLICY: never log messageText
  db.logEvent(user.id, 'reply_generated', { replyCount, replyLength, plan: user.plan });

  const detectedContext = context === 'auto' ? detectContext(messageText) : context;
  const lengthGuide = { short: '40-70 words', medium: '70-110 words', detailed: '110-160 words' }[replyLength] || '70-110 words';

  const hasToneProfile = toneProfile && toneProfile.trim().length > 0;
  const toneInstruction = hasToneProfile
    ? `The sender's personal communication style: "${toneProfile.trim()}". Match this tone very carefully in all replies.`
    : 'Use a professional, warm, and direct tone. The user has not set a personal tone profile.';

  const systemPrompt = `You are an expert business communication assistant.
${toneInstruction}
Message context: ${detectedContext}.
Generate exactly 3 distinct reply options with these styles:
- Reply 1: Direct and concise
- Reply 2: Warm and relationship-focused  
- Reply 3: Detailed and thorough

Each reply should be ${lengthGuide}.

Also rate each reply's match quality to the context (1-3 stars: 1=generic, 2=good match, 3=perfect match).

Return ONLY a raw JSON array — no markdown, no backticks, no explanation:
[{"text":"...","wordCount":N,"stars":N,"style":"Direct"},{"text":"...","wordCount":N,"stars":N,"style":"Friendly"},{"text":"...","wordCount":N,"stars":N,"style":"Detailed"}]`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1200,
      temperature: 0.75,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Reply to this message:\n\n${messageText.trim().slice(0, 2000)}` }
      ]
    });

    let replies;
    try {
      const raw = completion.choices[0].message.content.trim();
      replies = JSON.parse(raw.replace(/```json|```/g, '').trim());
      if (!Array.isArray(replies)) throw new Error('Not an array');
      // Ensure stars field exists
      replies = replies.map(r => ({ ...r, stars: r.stars || 2 }));
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse AI response. Please try again.', code: 'PARSE_ERROR' });
    }

    if (user.plan === 'free') db.incrementUseCount(user.id);
    const updatedUser = db.getUserById(user.id);
    const usesRemaining = user.plan === 'free' ? Math.max(0, FREE_LIMIT - (updatedUser?.use_count || 0)) : null;

    res.json({
      replies,
      detectedContext,
      contextLabel: contextLabel(detectedContext),
      usesRemaining,
      plan: user.plan,
      hasToneProfile
    });

  } catch (err) {
    if (err.name === 'AbortError' || err.message?.includes('timeout'))
      return res.status(504).json({ error: 'AI is taking too long. Please try again.', code: 'TIMEOUT' });
    console.error('Generate error:', err.message);
    res.status(500).json({ error: 'Something went wrong on our end. Please try again.', code: 'SERVER_ERROR' });
  }
});

module.exports = router;