import json
import unittest
from urllib.parse import urlparse

from product_media import Document, ROOT, media, products_in_schema, replace, run, synchronize


class ProductMediaTests(unittest.TestCase):
    def test_all_product_pairs_are_real_and_consistent(self):
        files = sorted((ROOT / 'products').glob('*/index.html'))
        self.assertEqual(len(files), 269)
        for en in files:
            code = en.parent.name
            english = en.read_text()
            chinese = (ROOT / 'zh/products' / code / 'index.html').read_text()
            a, b = media(english), media(chinese)
            self.assertEqual(a['main'], b['main'], code)
            self.assertEqual([(x['src'], x['thumb']) for x in a['thumbs']], [(x['src'], x['thumb']) for x in b['thumbs']], code)
            self.assertEqual(a['drawings'], b['drawings'], code)
            for source, prefix in [(english, ''), (chinese, 'zh/')]:
                doc = Document(source)
                self.assertEqual(doc.find('html')[0]['attrs']['lang'], 'zh-Hant' if prefix else 'en')
                self.assertEqual(doc.find('link', rel='canonical')[0]['attrs']['href'], f'https://www.gdchengda.hk/{prefix}products/{code}/')
                self.assertTrue(doc.find('link', rel='alternate', hreflang='zh-Hant'))
                self.assertNotIn('new Image()', source)
                self.assertNotIn('autoTimer', source)
                urls = [a['main']] + a['drawings']
                urls += [x[k] for x in a['thumbs'] for k in ('src', 'thumb')]
                for meta in doc.find('meta'):
                    if meta['attrs'].get('property') == 'og:image' or meta['attrs'].get('name') == 'twitter:image':
                        urls.append(meta['attrs']['content'])
                for node in doc.find('script', type='application/ld+json'):
                    data = json.loads(source[node['open_end']:node['close_start']])
                    for product in products_in_schema(data):
                        self.assertNotIn('_placeholder', json.dumps(product.get('image')), code)
                for preload in doc.find('link', rel='preload', **{'as': 'image'}):
                    self.assertEqual(preload['attrs']['href'], a['main'], code)
                for url in urls:
                    self.assertNotIn('_placeholder', url, code)
                    asset = urlparse(url).path
                    self.assertTrue(asset.startswith(f'/assets/products/{code}/'), (code, asset))
                    self.assertTrue((ROOT / asset.lstrip('/')).is_file(), asset)

    def test_sync_is_reproducible(self):
        self.assertEqual(run(False), [])

    def test_incorrect_art_basin_descriptions_cannot_return(self):
        for file in (ROOT / 'products').glob('A*/index.html'):
            source = file.read_text()
            doc = Document(source)
            for meta in doc.find('meta'):
                if (meta['attrs'].get('name') or meta['attrs'].get('property')) in ('description', 'og:description', 'twitter:description'):
                    self.assertNotIn('ceramic undercounter basin', meta['attrs'].get('content', ''), str(file))

    def test_parser_handles_nested_elements_and_rejects_overlapping_edits(self):
        source = '<div class="pd-media"><div><img id="pd-main" src="/a.webp" /></div></div><p>Kept</p>'
        doc = Document(source)
        node = doc.find(cls='pd-media')[0]
        self.assertEqual(doc.raw(node), source[:source.index('<p>')])
        self.assertEqual(replace(source, [(node['start'], node['end'], '<div>New</div>')]), '<div>New</div><p>Kept</p>')
        with self.assertRaises(ValueError):
            replace(source, [(0, 20, ''), (5, 10, '')])

    def test_sync_changes_only_image_and_description_schema_fields(self):
        source = (ROOT / 'products/A101/index.html').read_text()
        source = source.replace('A101 ceramic art basin', 'A101 ceramic undercounter basin')
        for meta in ('og:image', 'twitter:image'):
            source = source.replace(f'{meta}" content="https://www.gdchengda.hk/assets/products/A101/gallery/lead.webp', f'{meta}" content="https://www.gdchengda.hk/assets/products/_placeholder/card.webp')
        before = Document(source)
        result = synchronize(source, 'A101', None, False)
        after = Document(result)
        for cls in ('pd-specs', 'pd-tech-specs', 'pd-cols'):
            self.assertEqual(before.raw(before.find(cls=cls)[0]), after.raw(after.find(cls=cls)[0]))
        original_json = [json.loads(source[n['open_end']:n['close_start']]) for n in before.find('script', type='application/ld+json')]
        final_json = [json.loads(result[n['open_end']:n['close_start']]) for n in after.find('script', type='application/ld+json')]
        for values in (original_json, final_json):
            for data in values:
                for product in products_in_schema(data):
                    product.pop('image', None)
                    product.pop('description', None)
        self.assertEqual(original_json, final_json)


if __name__ == '__main__':
    unittest.main()
