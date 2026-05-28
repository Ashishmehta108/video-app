import { Router } from 'express';
import axios from 'axios';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

const MOCK_RESPONSES = [
  'Based on the meeting context, I suggest summarizing key action items and assigning owners.',
  'You could schedule a follow-up to review the decisions made in this session.',
  'Consider enabling noise cancellation for clearer audio during discussions.',
  'The transcript shows good participation — you might want to export it for documentation.',
];

function getMockResponse(question) {
  const idx = Math.abs(question.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % MOCK_RESPONSES.length;
  return {
    answer: MOCK_RESPONSES[idx],
    source: 'mock',
    note: 'Sarvam API key not configured. Set SARVAM_API_KEY in .env for live responses.',
  };
}

router.post('/ask', async (req, res) => {
  try {
    const { question, context } = req.body;
    if (!question?.trim()) {
      return res.status(400).json({ error: 'Question required' });
    }

    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey || apiKey === 'your_key_here') {
      return res.json(getMockResponse(question));
    }

    try {
      const response = await axios.post(
        'https://api.sarvam.ai/v1/chat/completions',
        {
          model: 'sarvam-m',
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful meeting assistant. Answer concisely based on the meeting context provided.',
            },
            {
              role: 'user',
              content: context
                ? `Meeting context:\n${context}\n\nQuestion: ${question}`
                : question,
            },
          ],
        },
        {
          headers: {
            'api-subscription-key': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const answer =
        response.data?.choices?.[0]?.message?.content ||
        response.data?.answer ||
        'No response from Sarvam AI.';

      res.json({ answer, source: 'sarvam' });
    } catch (apiErr) {
      console.error('Sarvam API error:', apiErr.message);
      res.json({
        ...getMockResponse(question),
        note: 'Sarvam API request failed. Showing mock response.',
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'AI assistant error' });
  }
});

export default router;
