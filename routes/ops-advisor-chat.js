const express = require('express');
const https   = require('https');
const router  = express.Router();

// POST /api/ops-advisor-chat
// Proxies chat messages to Anthropic API server-side.
// Requires ANTHROPIC_API_KEY in Railway environment variables.
router.post('/', async (req, res) => {
  try {
    const { system, messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
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
          res.status(proxyRes.statusCode).json(JSON.parse(data));
        } catch(e) {
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
