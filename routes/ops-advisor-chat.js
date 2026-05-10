const express = require('express');
const https   = require('https');
const router  = express.Router();

// POST /api/ops-advisor-chat
router.post('/', async (req, res) => {
  try {
    const { system, messages } = req.body;

    console.log('ops-advisor-chat called, messages count:', messages ? messages.length : 'none');

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('Invalid messages:', messages);
      return res.status(400).json({ error: 'messages array required and must not be empty' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in environment' });
    }

    const body = JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system:     system || '',
      messages:   messages,
    });

    const options = {
      hostname: 'api.anthropic.com',
      port:     443,
      path:     '/v1/messages',
      method:   'POST',
      headers: {
        'Content-Type':      'application/json',
        'Content-Length':    Buffer.byteLength(body),
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
    };

    const proxyReq = https.request(options, (proxyRes) => {
      let data = '';
      proxyRes.on('data', chunk => data += chunk);
      proxyRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log('Anthropic response status:', proxyRes.statusCode);
          res.status(proxyRes.statusCode).json(parsed);
        } catch(e) {
          console.error('Parse error:', e.message, 'Raw:', data.slice(0, 200));
          res.status(500).json({ error: 'Failed to parse Anthropic response' });
        }
      });
    });

    proxyReq.on('error', (err) => {
      console.error('Anthropic proxy error:', err);
      res.status(500).json({ error: err.message });
    });

    proxyReq.write(body);
    proxyReq.end();

  } catch (err) {
    console.error('ops-advisor-chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
