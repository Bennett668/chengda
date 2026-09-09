"""Audit tracked website pages and repair only the GA4 CSP allowlist."""

import argparse
from collections import Counter
from html.parser import HTMLParser
import json
from pathlib import Path
import subprocess

REPO = Path(__file__).resolve().parents[1]
MEASUREMENT_ID = 'G-J7PPP48QXC'
TAG = '''<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-J7PPP48QXC"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-J7PPP48QXC');
</script>
'''
REQUIRED = {
    'script-src': ['https://www.googletagmanager.com'],
    'connect-src': [
        'https://*.google-analytics.com',
        'https://*.analytics.google.com',
        'https://www.googletagmanager.com',
    ],
}


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.policies = []
        self.tags = []
        self.redirect = False
        self.canonical = ''
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonical = attrs.get('href', '')
        if tag == 'meta':
            equiv = attrs.get('http-equiv', '').lower()
            if equiv == 'content-security-policy':
                self.policies.append((self.get_starttag_text(), attrs['content']))
            if equiv == 'refresh':
                self.redirect = True
        if tag == 'script' and 'googletagmanager.com/gtag/js' in attrs.get('src', ''):
            self.tags.append(attrs['src'])


def directives(policy):
    result = {}
    for part in policy.split(';'):
        bits = part.split()
        if bits:
            if bits[0] in result:
                raise ValueError('Duplicate CSP directive: ' + bits[0])
            result[bits[0]] = bits[1:]
    return result


def run(fix=False):
    names = subprocess.check_output(
        ['git', '-C', str(REPO), 'ls-files', '-z', '*.html']
    ).decode().split('\0')
    counts = Counter()
    problems = []
    changed = []
    for name in filter(None, names):
        path = REPO / name
        source = path.read_text()
        page = Page(source)
        original = source
        counts['tracked_html'] += 1
        if not page.tags:
            counts['without_ga_tag'] += 1
            if page.redirect or '<head' not in source.lower():
                continue
            if fix and page.canonical.startswith('https://www.gdchengda.hk/') and source.count('</head>') == 1:
                source = source.replace('</head>', TAG + '</head>', 1)
                page = Page(source)
                counts['added_ga_tag'] += 1
            else:
                problems.append({'page': name, 'issue': 'missing_ga_tag'})
                continue
        counts['with_ga_tag'] += 1
        if len(page.tags) != 1 or MEASUREMENT_ID not in page.tags[0]:
            problems.append({'page': name, 'issue': 'unexpected_ga_tag'})
        new_source = source
        for raw, policy in page.policies:
            parsed = directives(policy)
            missing = {}
            for directive, hosts in REQUIRED.items():
                existing = parsed.get(directive, parsed.get('default-src', []))
                absent = [host for host in hosts if host not in existing]
                if absent:
                    missing[directive] = absent
                    parsed[directive] = [*existing, *absent]
            if 'script-src-elem' in parsed:
                host = REQUIRED['script-src'][0]
                if host not in parsed['script-src-elem']:
                    missing['script-src-elem'] = [host]
                    parsed['script-src-elem'].append(host)
            if missing:
                if fix:
                    updated = '; '.join(' '.join([key, *values]) for key, values in parsed.items())
                    new_source = new_source.replace(raw, raw.replace(policy, updated), 1)
                else:
                    problems.append({'page': name, 'issue': 'ga_csp_blocked', 'missing': missing})
        if new_source != original:
            path.write_text(new_source)
            changed.append(name)
    return {'counts': counts, 'changed': changed, 'problems': problems}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--fix', action='store_true')
    args = parser.parse_args()
    result = run(args.fix)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(bool(result['problems']))
