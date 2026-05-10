const express = require('express');
const https   = require('https');
const router  = express.Router();

// POST /api/ops-advisor-chat
router.post('/', async (req, res) => {
  try {
    const { system, messages } = req.body;

    console.log('ops-advisor-chat called, messages count:', messages ? messages.length : 'none');

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array required and must not be empty' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });
    }

    const body = JSON.stringify({
      model:      'claude-sonnet-4-5',
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
        console.log('Anthropic response status:', proxyRes.statusCode);
        if (proxyRes.statusCode !== 200) {
          console.error('Anthropic error body:', data.slice(0, 500));
        }
        try {
          res.status(proxyRes.statusCode).json(JSON.parse(data));
        } catch(e) {
          res.status(500).json({ error: 'Failed to parse Anthropic response', raw: data.slice(0, 200) });
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
