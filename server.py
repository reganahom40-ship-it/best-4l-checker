import http.server
import socketserver
import urllib.request
import urllib.parse
import urllib.error
import json
import os
import sys
import random

PORT = int(os.environ.get('PORT', 3000))
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')

DISCORD_CLIENT_ID = os.environ.get('DISCORD_CLIENT_ID', '')
DISCORD_CLIENT_SECRET = os.environ.get('DISCORD_CLIENT_SECRET', '')
DISCORD_REDIRECT_URI = os.environ.get('DISCORD_REDIRECT_URI', '')

class SafeProxyHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def translate_path(self, path):
        clean_path = path.split('?')[0].split('#')[0]
        if clean_path == '/':
            clean_path = '/index.html'

        local_file_path = os.path.join(PUBLIC_DIR, clean_path.lstrip('/'))
        normalized_path = os.path.abspath(local_file_path)

        if not normalized_path.startswith(os.path.abspath(PUBLIC_DIR)):
            return os.path.join(PUBLIC_DIR, 'notfound')

        if os.path.exists(normalized_path) and os.path.isfile(normalized_path):
            return normalized_path
        
        return os.path.join(PUBLIC_DIR, 'index.html')

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query_params = urllib.parse.parse_qs(parsed_url.query)

        # 1. OAuth2 Config Info
        if path == '/api/auth/discord/config':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            host = self.headers.get('Host', f'localhost:{PORT}')
            proto = 'https' if 'onrender.com' in host or self.headers.get('X-Forwarded-Proto') == 'https' else 'http'
            default_redirect = f"{proto}://{host}/api/auth/discord/callback"
            
            payload = {
                'configured': bool(DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET),
                'client_id': DISCORD_CLIENT_ID,
                'redirect_uri': DISCORD_REDIRECT_URI or default_redirect
            }
            self.wfile.write(json.dumps(payload).encode('utf-8'))
            return

        # 2. OAuth2 Authorization Redirect
        if path == '/api/auth/discord/login':
            client_id = query_params.get('client_id', [DISCORD_CLIENT_ID])[0]
            host = self.headers.get('Host', f'localhost:{PORT}')
            proto = 'https' if 'onrender.com' in host or self.headers.get('X-Forwarded-Proto') == 'https' else 'http'
            default_redirect = f"{proto}://{host}/api/auth/discord/callback"
            redirect_uri = query_params.get('redirect_uri', [DISCORD_REDIRECT_URI or default_redirect])[0]
            
            if not client_id:
                self.send_response(400)
                self.send_header('Content-Type', 'text/html')
                self.end_headers()
                self.wfile.write(b"<h3>Error: Discord Client ID is required for OAuth2 flow.</h3>")
                return

            auth_params = {
                'client_id': client_id,
                'redirect_uri': redirect_uri,
                'response_type': 'code',
                'scope': 'identify'
            }
            auth_url = f"https://discord.com/api/oauth2/authorize?{urllib.parse.urlencode(auth_params)}"
            
            self.send_response(302)
            self.send_header('Location', auth_url)
            self.end_headers()
            return

        # 3. OAuth2 Callback Endpoint
        if path == '/api/auth/discord/callback':
            code = query_params.get('code', [None])[0]
            client_id = query_params.get('client_id', [DISCORD_CLIENT_ID])[0]
            client_secret = query_params.get('client_secret', [DISCORD_CLIENT_SECRET])[0]
            host = self.headers.get('Host', f'localhost:{PORT}')
            proto = 'https' if 'onrender.com' in host or self.headers.get('X-Forwarded-Proto') == 'https' else 'http'
            default_redirect = f"{proto}://{host}/api/auth/discord/callback"
            redirect_uri = query_params.get('redirect_uri', [DISCORD_REDIRECT_URI or default_redirect])[0]

            if not code:
                self.send_response(400)
                self.send_header('Content-Type', 'text/html')
                self.end_headers()
                error_msg = query_params.get('error_description', ['Authorization code missing'])[0]
                self.wfile.write(f"<h3>OAuth2 Error: {error_msg}</h3>".encode('utf-8'))
                return

            # Exchange code for token
            token_url = 'https://discord.com/api/oauth2/token'
            data = urllib.parse.urlencode({
                'client_id': client_id,
                'client_secret': client_secret,
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': redirect_uri
            }).encode('utf-8')

            token_req = urllib.request.Request(token_url, data=data, headers={
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Snowflake-Dashboard/4.5'
            })

            try:
                with urllib.request.urlopen(token_req) as resp:
                    token_res = json.loads(resp.read().decode('utf-8'))
                    access_token = token_res.get('access_token')
                    token_type = token_res.get('token_type', 'Bearer')
                    
                    # Fetch user metadata
                    user_req = urllib.request.Request('https://discord.com/api/users/@me', headers={
                        'Authorization': f"{token_type} {access_token}",
                        'User-Agent': 'Snowflake-Dashboard/4.5'
                    })
                    user_profile = {}
                    try:
                        with urllib.request.urlopen(user_req) as u_resp:
                            user_profile = json.loads(u_resp.read().decode('utf-8'))
                    except Exception:
                        pass

                    html_response = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Discord Authorization</title>
  <style>
    body {{ background: #07070b; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }}
    .box {{ background: #12121c; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 28px; text-align: center; max-width: 360px; }}
    h2 {{ color: #5865F2; margin-top: 0; }}
    p {{ color: #9ca3af; font-size: 0.85rem; }}
  </style>
</head>
<body>
  <div class="box">
    <h2>Authorization Complete</h2>
    <p>Connected account: <strong>@{user_profile.get('username', 'Discord User')}</strong></p>
    <p>Linking credentials to Snowflake Dashboard...</p>
  </div>
  <script>
    const payload = {{
      type: 'DISCORD_OAUTH_SUCCESS',
      token: "{token_type} {access_token}",
      user: {json.dumps(user_profile)}
    }};
    if (window.opener) {{
      window.opener.postMessage(payload, window.location.origin);
      setTimeout(() => window.close(), 1200);
    }} else {{
      localStorage.setItem('snowflake_oauth_creds', JSON.stringify(payload));
      setTimeout(() => {{ window.location.href = '/'; }}, 1200);
    }}
  </script>
</body>
</html>"""
                    self.send_response(200)
                    self.send_header('Content-Type', 'text/html; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(html_response.encode('utf-8'))
                    return

            except urllib.error.HTTPError as e:
                err_body = e.read().decode('utf-8', errors='replace')
                self.send_response(400)
                self.send_header('Content-Type', 'text/html')
                self.end_headers()
                self.wfile.write(f"<h3>OAuth2 Token Exchange Failed ({e.code}):</h3><pre>{err_body}</pre>".encode('utf-8'))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'text/html')
                self.end_headers()
                self.wfile.write(f"<h3>Internal OAuth2 Error: {str(e)}</h3>".encode('utf-8'))
                return

        # 4. Handle Mock API Endpoint: GET /api/mock-check/<id>
        if path.startswith('/api/mock-check/'):
            identifier = path[len('/api/mock-check/'):]
            if not identifier or len(identifier) < 3:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Identifier too short'}).encode('utf-8'))
                return

            if 'limit' in identifier.lower():
                self.send_response(429)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Retry-After', '5')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Rate limit exceeded on mock endpoint'}).encode('utf-8'))
                return

            if 'free' in identifier.lower() or 'val' in identifier.lower():
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'available', 'message': 'Identifier is available'}).encode('utf-8'))
                return

            is_available = random.random() > 0.5
            if is_available:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'available', 'message': 'Identifier is available'}).encode('utf-8'))
            else:
                self.send_response(409)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'taken', 'message': 'Identifier is already registered'}).encode('utf-8'))
            return

        super().do_GET()

    def do_POST(self):
        if self.path == '/api/proxy-check':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                payload = json.loads(post_data.decode('utf-8'))
                target_url = payload.get('url')
                method = payload.get('method', 'GET').upper()
                headers = payload.get('headers', {})
                body = payload.get('body')

                if not target_url:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'Target URL is required'}).encode('utf-8'))
                    return

                req_body = None
                if body is not None and method in ['POST', 'PUT', 'PATCH']:
                    if isinstance(body, (dict, list)):
                        req_body = json.dumps(body).encode('utf-8')
                        if 'Content-Type' not in headers and 'content-type' not in headers:
                            headers['Content-Type'] = 'application/json'
                    else:
                        req_body = str(body).encode('utf-8')

                if 'User-Agent' not in headers and 'user-agent' not in headers:
                    headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

                req = urllib.request.Request(target_url, data=req_body, headers=headers, method=method)
                
                proxy = payload.get('proxy')
                if proxy:
                    if not proxy.startswith('http://') and not proxy.startswith('https://'):
                        proxy = 'http://' + proxy
                    proxy_handler = urllib.request.ProxyHandler({'http': proxy, 'https': proxy})
                    opener = urllib.request.build_opener(proxy_handler)
                else:
                    opener = urllib.request.build_opener()

                try:
                    with opener.open(req, timeout=12) as resp:
                        resp_status = resp.status
                        resp_headers = dict(resp.headers)
                        resp_data = resp.read().decode('utf-8', errors='replace')
                except urllib.error.HTTPError as e:
                    resp_status = e.code
                    resp_headers = dict(e.headers)
                    resp_data = e.read().decode('utf-8', errors='replace')
                except Exception as e:
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'Proxy request failed', 'message': str(e)}).encode('utf-8'))
                    return

                exposed_headers = {}
                for key in ['retry-after', 'content-type', 'Retry-After', 'Content-Type']:
                    for hk, hv in resp_headers.items():
                        if hk.lower() == key.lower():
                            exposed_headers[key.lower()] = hv

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                
                response_payload = {
                    'status': resp_status,
                    'statusText': 'OK' if resp_status == 200 else 'HTTP Error',
                    'headers': exposed_headers,
                    'data': resp_data
                }
                self.wfile.write(json.dumps(response_payload).encode('utf-8'))

            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Malformed JSON payload', 'message': str(e)}).encode('utf-8'))
            return
        
        self.send_response(404)
        self.end_headers()

if __name__ == '__main__':
    if not os.path.exists(PUBLIC_DIR):
        os.makedirs(PUBLIC_DIR)
        
    handler = SafeProxyHandler
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"==================================================")
        print(f"Snowflake API Server with Discord OAuth2 on port {PORT}")
        print(f"OAuth2 Login: http://localhost:{PORT}/api/auth/discord/login")
        print(f"Dashboard interface: http://localhost:{PORT}")
        print(f"==================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            sys.exit(0)
