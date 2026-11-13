"""Post-deploy checks for CPMS. Credentials are never printed.

    python3 deploy/smoke_test.py SERVICE_URL

Exits non-zero if a check fails. Public checks retry 5 times, 3 s apart (Cloud Run cold start).
  1. GET /api/health -> {"ok": true}
  2. GET /api/ready  -> {"database": "up"}   (PostgreSQL answers)
  3. GET /           -> HTML (built React app served by Express)
  4. Optional, only if SMOKE_EMAIL and SMOKE_PASSWORD are both set: login, /api/auth/me, logout.
     Session is a cookie; it is always logged out, even if a check fails.
Standard library only. Offline tests: deploy/tests/test_smoke.py
"""
import http.cookiejar
import json
import os
import sys
import time
import urllib.error
import urllib.request

opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


def request(base, path, data=None):
    headers = {'Content-Type': 'application/json'} if data is not None else {}
    req = urllib.request.Request(base + path, headers=headers,
        data=json.dumps(data).encode() if data is not None else None)
    with opener.open(req, timeout=30) as response:
        return response.read()


def check(base):
    for path, predicate in (
        ('/api/health', lambda b: json.loads(b).get('ok') is True),
        ('/api/ready', lambda b: json.loads(b).get('database') == 'up'),
        ('/', lambda b: b'<html' in b.lower()),
    ):
        for attempt in range(5):
            try:
                if not predicate(request(base, path)):
                    raise ValueError('Unexpected response')
                break
            except (urllib.error.URLError, TimeoutError, ValueError):
                if attempt == 4:
                    raise RuntimeError('Smoke check failed: ' + path) from None
                time.sleep(3)
        print('PASS ' + path)

    email, password = os.getenv('SMOKE_EMAIL'), os.getenv('SMOKE_PASSWORD')
    if bool(email) != bool(password):
        raise RuntimeError('Set both SMOKE_EMAIL and SMOKE_PASSWORD, or neither.')
    if not email:
        print('SKIP login: optional smoke credentials not configured')
        return
    logged_in = False
    try:
        request(base, '/api/auth/login', {'email': email, 'password': password})
        logged_in = True
        if 'user' not in json.loads(request(base, '/api/auth/me')):
            raise ValueError('No user')
        print('PASS login and authenticated /api/auth/me')
    except (urllib.error.URLError, TimeoutError, ValueError):
        raise RuntimeError('Login smoke check failed') from None
    finally:
        if logged_in:
            request(base, '/api/auth/logout', data={})
            print('PASS logout')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('Usage: python3 deploy/smoke_test.py SERVICE_URL')
    check(sys.argv[1].rstrip('/'))
