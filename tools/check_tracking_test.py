import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import check_tracking as tracking


POLICY = (
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; "
    "style-src 'self'; img-src 'self' data: https:; "
    "connect-src 'self' https://formsubmit.co https://*.google-analytics.com "
    "https://*.analytics.google.com https://www.googletagmanager.com; "
    "form-action 'self' https://formsubmit.co; base-uri 'self'; object-src 'none'"
)
EXTRA = 'https://*.google.com'


class TrackingCspTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.names = ['index.html', 'zh/index.html', 'analytics-preferences/index.html', 'redirect.html']
        for name in self.names:
            target = self.root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            if name == 'analytics-preferences/index.html':
                source = '<meta name="robots" content="noindex, nofollow" />'
            elif name == 'redirect.html':
                source = '<meta http-equiv="refresh" content="0;url=/" />'
            else:
                source = ('<html><head><link rel="canonical" href="https://www.gdchengda.hk/' + name + '" />'
                          '<meta http-equiv="Content-Security-Policy" content="' + POLICY + '" />\n'
                          + tracking.GUARD + tracking.TAG + '</head><body>Unchanged copy</body></html>')
            target.write_text(source)
        self.original = {name: (self.root / name).read_text() for name in self.names}

    def run_audit(self, fix):
        output = ('\0'.join(self.names) + '\0').encode()
        with patch.object(tracking, 'REPO', self.root), patch.object(tracking.subprocess, 'check_output', return_value=output):
            return tracking.run(fix)

    def test_check_reports_non_ads_transport_gap_without_writing(self):
        result = self.run_audit(False)
        self.assertEqual(result['changed'], [])
        self.assertEqual(len(result['problems']), 2)
        for problem in result['problems']:
            self.assertEqual(problem['missing'], {'connect-src': [EXTRA]})
        for name, source in self.original.items():
            self.assertEqual((self.root / name).read_text(), source)

    def test_fix_adds_only_required_connect_source(self):
        result = self.run_audit(True)
        self.assertEqual(result['problems'], [])
        self.assertEqual(result['changed'], ['index.html', 'zh/index.html'])
        for name in result['changed']:
            source = (self.root / name).read_text()
            before = tracking.directives(POLICY)
            after = tracking.directives(tracking.Page(source).policies[0][1])
            self.assertEqual(after['connect-src'], before['connect-src'] + [EXTRA])
            self.assertEqual({k: v for k, v in after.items() if k != 'connect-src'},
                             {k: v for k, v in before.items() if k != 'connect-src'})
            self.assertEqual(source.replace(tracking.Page(source).policies[0][1], POLICY, 1), self.original[name])
            self.assertNotIn('unsafe-eval', source)
            for host in ('doubleclick.net', 'googleadservices.com', 'googlesyndication.com'):
                self.assertNotIn(host, source)

    def test_fix_is_idempotent_and_excluded_pages_stay_unchanged(self):
        self.run_audit(True)
        self.assertEqual(self.run_audit(True)['changed'], [])
        self.assertEqual(self.run_audit(False)['problems'], [])
        for name in ('analytics-preferences/index.html', 'redirect.html'):
            self.assertEqual((self.root / name).read_text(), self.original[name])


if __name__ == '__main__':
    unittest.main()
