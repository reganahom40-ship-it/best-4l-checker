import http.server
import socketserver
import urllib.request
import urllib.parse
import urllib.error
import json
import os
import sys
import re

PORT = int(os.environ.get('PORT', 3000))
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')

def check_tiktok_live(handle, proxy=None):
    handle = handle.strip().lower()
    
    # Policy Rule 1: TikTok strictly restricts/bans all 3-character usernames from claim/registration
    if len(handle) < 4:
        return {'available': False, 'status': 'restricted', 'reason': 'TikTok restricts all 3L handles from registration'}

    url = f"https://www.tiktok.com/@{handle}"
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
    })
    
    opener = urllib.request.build_opener()
    if proxy:
        if not proxy.startswith('http://') and not proxy.startswith('https://'):
            proxy = 'http://' + proxy
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({'http': proxy, 'https': proxy}))

    try:
        with opener.open(req, timeout=8) as resp:
            data = resp.read().decode('utf-8', errors='replace')
            m = re.search(r'<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">([\s\S]*?)</script>', data)
            if m:
                parsed = json.loads(m.group(1))
                detail = parsed.get('__DEFAULT_SCOPE__', {}).get('webapp.user-detail', {})
                status_code = detail.get('statusCode')
                user_info = detail.get('userInfo')

                # Strict Rule: Only statusCode 10221 represents a completely clean, unregistered, claimable handle
                if status_code == 10221:
                    return {'available': True, 'status': 'available', 'reason': 'Clean unregistered handle'}
                elif status_code == 10202:
                    return {'available': False, 'status': 'banned_locked', 'reason': 'Deleted/banned account lock (unclaimable)'}
                elif status_code == 209002:
                    return {'available': False, 'status': 'reserved', 'reason': 'Reserved word (unclaimable)'}
                elif user_info and user_info.get('user', {}).get('uniqueId'):
                    return {'available': False, 'status': 'taken', 'reason': 'Active user profile'}
                else:
                    return {'available': False, 'status': 'taken', 'reason': f'Status {status_code}'}

            if 'verify-bar' in data or 'captcha' in data or 'tiktok-waf' in data:
                return {'available': False, 'status': 'rate_limited', 'reason': 'WAF / Captcha Challenge'}
            
            return {'available': False, 'status': 'taken', 'reason': 'Profile exists'}
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return {'available': False, 'status': 'restricted', 'reason': 'HTTP 404 on TikTok is restricted'}
        elif e.code == 429:
            return {'available': False, 'status': 'rate_limited', 'reason': 'HTTP 429 Rate Limited'}
        return {'available': False, 'status': 'error', 'reason': f'HTTP {e.code}'}
    except Exception as e:
        return {'available': False, 'status': 'error', 'reason': str(e)}

def check_discord_live(handle, proxy=None):
    handle = handle.strip().lower()
    url = "https://discord.com/api/v9/unique-username/username-attempt-unauthed"
    req = urllib.request.Request(url, data=json.dumps({"username": handle}).encode('utf-8'), headers={
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })
    opener = urllib.request.build_opener()
    if proxy:
        if not proxy.startswith('http://') and not proxy.startswith('https://'):
            proxy = 'http://' + proxy
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({'http': proxy, 'https': proxy}))

    try:
        with opener.open(req, timeout=6) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            is_taken = data.get('taken', True)
            return {'available': not is_taken, 'status': 'available' if not is_taken else 'taken', 'data': data}
    except urllib.error.HTTPError as e:
        if e.code == 429:
            return {'available': False, 'status': 'rate_limited', 'reason': 'Discord 429'}
        return {'available': False, 'status': 'taken' if e.code == 400 else 'error', 'reason': f'HTTP {e.code}'}
    except Exception as e:
        return {'available': False, 'status': 'error', 'reason': str(e)}

def check_kick_live(handle, proxy=None):
    handle = handle.strip().lower()
    url = f"https://kick.com/api/v2/channels/{handle}"
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
    })
    opener = urllib.request.build_opener()
    if proxy:
        if not proxy.startswith('http://') and not proxy.startswith('https://'):
            proxy = 'http://' + proxy
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({'http': proxy, 'https': proxy}))

    try:
        with opener.open(req, timeout=6) as resp:
            return {'available': False, 'status': 'taken', 'reason': 'Channel active (HTTP 200)'}
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return {'available': True, 'status': 'available', 'reason': 'Channel not found (HTTP 404)'}
        elif e.code == 429 or e.code == 403:
            return {'available': False, 'status': 'rate_limited', 'reason': f'HTTP {e.code}'}
        return {'available': False, 'status': 'error', 'reason': f'HTTP {e.code}'}
    except Exception as e:
        return {'available': False, 'status': 'error', 'reason': str(e)}

def check_twitch_live(handle, proxy=None):
    handle = handle.strip().lower()
    url = f"https://passport.twitch.tv/usernames/{handle}"
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
    })
    opener = urllib.request.build_opener()
    if proxy:
        if not proxy.startswith('http://') and not proxy.startswith('https://'):
            proxy = 'http://' + proxy
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({'http': proxy, 'https': proxy}))

    try:
        with opener.open(req, timeout=6) as resp:
            data = resp.read().decode('utf-8', errors='replace')
            if '"available":true' in data or resp.status == 204:
                return {'available': True, 'status': 'available', 'reason': 'Twitch username available'}
            return {'available': False, 'status': 'taken', 'reason': 'Username registered'}
    except urllib.error.HTTPError as e:
        if e.code == 404 or e.code == 204:
            return {'available': True, 'status': 'available', 'reason': 'Username available (404/204)'}
        elif e.code == 429:
            return {'available': False, 'status': 'rate_limited', 'reason': 'HTTP 429'}
        return {'available': False, 'status': 'error', 'reason': f'HTTP {e.code}'}
    except Exception as e:
        return {'available': False, 'status': 'error', 'reason': str(e)}

def check_instagram_live(handle, proxy=None):
    handle = handle.strip().lower()
    url = f"https://www.instagram.com/api/v1/users/web_profile_info/?username={handle}"
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'x-ig-app-id': '936619743392459',
        'Accept': 'application/json'
    })
    opener = urllib.request.build_opener()
    if proxy:
        if not proxy.startswith('http://') and not proxy.startswith('https://'):
            proxy = 'http://' + proxy
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({'http': proxy, 'https': proxy}))

    try:
        with opener.open(req, timeout=6) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            user = data.get('data', {}).get('user')
            if user:
                return {'available': False, 'status': 'taken', 'reason': 'User profile active'}
            return {'available': True, 'status': 'available', 'reason': 'User not found'}
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return {'available': True, 'status': 'available', 'reason': 'HTTP 404 Not Found'}
        elif e.code in [302, 429, 403]:
            return {'available': False, 'status': 'rate_limited', 'reason': f'HTTP {e.code} Challenge'}
        return {'available': False, 'status': 'error', 'reason': f'HTTP {e.code}'}
    except Exception as e:
        return {'available': False, 'status': 'error', 'reason': str(e)}

def check_twitter_live(handle, proxy=None):
    handle = handle.strip().lower()
    url = f"https://api.twitter.com/i/users/username_available.json?username={handle}"
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
    })
    opener = urllib.request.build_opener()
    if proxy:
        if not proxy.startswith('http://') and not proxy.startswith('https://'):
            proxy = 'http://' + proxy
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({'http': proxy, 'https': proxy}))

    try:
        with opener.open(req, timeout=6) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            is_valid = data.get('valid', False)
            return {'available': is_valid, 'status': 'available' if is_valid else 'taken', 'data': data}
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return {'available': True, 'status': 'available', 'reason': 'HTTP 404'}
        elif e.code == 429:
            return {'available': False, 'status': 'rate_limited', 'reason': 'HTTP 429'}
        return {'available': False, 'status': 'error', 'reason': f'HTTP {e.code}'}
    except Exception as e:
        return {'available': False, 'status': 'error', 'reason': str(e)}


class SafeProxyHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
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

    def do_POST(self):
        clean_path = self.path.split('?')[0].rstrip('/')
        
        # 1. Dedicated Master Handle Check Endpoint (Absolute Precision)
        if clean_path == '/api/check-handle':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                payload = json.loads(post_data.decode('utf-8'))
                platform = payload.get('platform', 'tiktok').lower()
                handle = payload.get('handle', '').strip()
                proxy = payload.get('proxy')

                if not handle:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'Handle parameter required'}).encode('utf-8'))
                    return

                if platform == 'tiktok':
                    result = check_tiktok_live(handle, proxy)
                elif platform == 'discord':
                    result = check_discord_live(handle, proxy)
                elif platform == 'kick':
                    result = check_kick_live(handle, proxy)
                elif platform == 'twitch':
                    result = check_twitch_live(handle, proxy)
                elif platform == 'instagram':
                    result = check_instagram_live(handle, proxy)
                elif platform == 'twitter':
                    result = check_twitter_live(handle, proxy)
                else:
                    result = {'available': False, 'status': 'error', 'reason': f'Unknown platform: {platform}'}

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode('utf-8'))
                return

            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
                return

        # 2. General Proxy Check Endpoint
        if clean_path == '/api/proxy-check':
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
                    with opener.open(req, timeout=8) as resp:
                        resp_status = resp.status
                        resp_headers = dict(resp.headers)
                        resp_data = resp.read().decode('utf-8', errors='replace')
                except urllib.error.HTTPError as e:
                    resp_status = e.code
                    resp_headers = dict(e.headers)
                    resp_data = e.read().decode('utf-8', errors='replace')
                except Exception as proxy_err:
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'Request failed', 'message': str(proxy_err)}).encode('utf-8'))
                    return

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                
                response_payload = {
                    'status': resp_status,
                    'statusText': 'OK' if resp_status == 200 else 'HTTP Error',
                    'data': resp_data
                }
                self.wfile.write(json.dumps(response_payload).encode('utf-8'))
                return

            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Malformed JSON payload', 'message': str(e)}).encode('utf-8'))
                return

        # 3. Discord Test Webhook Endpoint
        if clean_path == '/api/discord-test':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                payload = json.loads(post_data.decode('utf-8'))
                url = payload.get('url')
                content = payload.get('content', '⚡ **ONYX APEX** — Discord Webhook Connected!')
                if url:
                    d_req = urllib.request.Request(url, data=json.dumps({'content': content}).encode('utf-8'), headers={
                        'Content-Type': 'application/json',
                        'User-Agent': 'ONYX-APEX-Scanner/2.4'
                    })
                    try:
                        with urllib.request.urlopen(d_req, timeout=5) as resp:
                            pass
                    except Exception:
                        pass
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'sent'}).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
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
        print(f"ONYX APEX Master Engine Server running on port {PORT}")
        print(f"Dashboard interface: http://localhost:{PORT}")
        print(f"==================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            sys.exit(0)
