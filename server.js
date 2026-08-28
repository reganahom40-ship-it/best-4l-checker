const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Helper to serve static files
function serveStaticFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // CORS Headers for accessibility
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  // 1. Mock API Endpoint: GET /api/mock-check/:id
  if (pathname.startsWith('/api/mock-check/') && req.method === 'GET') {
    const id = pathname.substring('/api/mock-check/'.length);

    if (!id || id.length < 3) {
      res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ error: 'Identifier too short' }));
      return;
    }

    // Simulate Rate Limit (429) if requested identifier contains "limit"
    if (id.toLowerCase().includes('limit')) {
      res.writeHead(429, { 
        'Content-Type': 'application/json',
        'Retry-After': '5',
        ...corsHeaders 
      });
      res.end(JSON.stringify({ error: 'Rate limit exceeded on mock endpoint' }));
      return;
    }

    // Simulate Available (200) if contains "free" or "val"
    if (id.toLowerCase().includes('free') || id.toLowerCase().includes('val')) {
      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ status: 'available', message: 'Identifier is available' }));
      return;
    }

    // Otherwise, simulate a 50/50 mix of Taken (409) and Available (200)
    const isAvailable = Math.random() > 0.5;
    if (isAvailable) {
      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ status: 'available', message: 'Identifier is available' }));
    } else {
      res.writeHead(409, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ status: 'taken', message: 'Identifier is already registered' }));
    }
    return;
  }

  // 2. Proxy Route: POST /api/proxy-check
  if (pathname === '/api/proxy-check' && req.method === 'POST') {
    let bodyData = '';
    req.on('data', chunk => {
      bodyData += chunk;
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(bodyData || '{}');
        const { url: targetUrl, method = 'GET', headers = {}, body = null } = payload;

        if (!targetUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ error: 'Target URL is required' }));
          return;
        }

        const fetchOptions = {
          method,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            ...headers
          }
        };

        if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
          fetchOptions.body = typeof body === 'object' ? JSON.stringify(body) : body;
        }

        const response = await fetch(targetUrl, fetchOptions);
        const responseText = await response.text();

        // Copy relevant headers to send back to front-end
        const responseHeaders = {};
        if (response.headers.has('retry-after')) {
          responseHeaders['retry-after'] = response.headers.get('retry-after');
        }
        if (response.headers.has('content-type')) {
          responseHeaders['content-type'] = response.headers.get('content-type');
        }

        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          data: responseText
        }));

      } catch (error) {
        console.error('Proxy request error:', error.message);
        res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({
          error: 'Proxy request failed',
          message: error.message
        }));
      }
    });
    return;
  }

  // 3. Static File Server
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  
  // Safe-guard to prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Denied');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    let contentType = 'text/html';
    if (filePath.endsWith('.js')) {
      contentType = 'application/javascript';
    } else if (filePath.endsWith('.css')) {
      contentType = 'text/css';
    } else if (filePath.endsWith('.json')) {
      contentType = 'application/json';
    }
    serveStaticFile(res, filePath, contentType);
  } else {
    // Default fallback to index.html for SPA behavior
    serveStaticFile(res, path.join(PUBLIC_DIR, 'index.html'), 'text/html');
  }
});

server.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`Generic API Checker Server listening on port ${PORT}`);
  console.log(`Mock endpoint: http://localhost:${PORT}/api/mock-check/:id`);
  console.log(`Dashboard interface: http://localhost:${PORT}`);
  console.log(`==================================================`);
});
