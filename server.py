import http.server
import socketserver
import urllib.request
import urllib.error
import json
import os
import sys
import random

PORT = 3000
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')

class SafeProxyHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        # Handle Mock API Endpoint: GET /api/mock-check/<id>
        if self.path.startswith('/api/mock-check/'):
            identifier = self.path[len('/api/mock-check/'):]
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

        # Serve static files from public/ folder
        clean_path = self.path.split('?')[0].split('#')[0]
        if clean_path == '/':
            clean_path = '/index.html'

        local_file_path = os.path.join(PUBLIC_DIR, clean_path.lstrip('/'))
        normalized_path = os.path.abspath(local_file_path)

        if not normalized_path.startswith(os.path.abspath(PUBLIC_DIR)):
            self.send_response(403)
            self.end_headers()
            self.wfile.write(b'Access Denied')
            return

        if os.path.exists(normalized_path) and os.path.isfile(normalized_path):
            self.path = clean_path
            original_dir = os.getcwd()
            os.chdir(PUBLIC_DIR)
            try:
                super().do_GET()
            finally:
                os.chdir(original_dir)
        else:
            # SPA Fallback
            self.path = '/index.html'
            original_dir = os.getcwd()
            os.chdir(PUBLIC_DIR)
            try:
                super().do_GET()
            finally:
                os.chdir(original_dir)

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
                
                try:
                    with urllib.request.urlopen(req) as resp:
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
        print(f"Generic API Checker Python Server on port {PORT}")
        print(f"Mock endpoint: http://localhost:{PORT}/api/mock-check/<id>")
        print(f"Dashboard interface: http://localhost:{PORT}")
        print(f"==================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            sys.exit(0)
