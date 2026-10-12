"""Source-preserving product media parsing and synchronization (stdlib only)."""
import argparse
import html
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
VOID = set('area base br col embed hr img input link meta param source track wbr'.split())
CSS = '/assets/product-media.css?v=' + json.loads((ROOT / 'tools/shared-assets.json').read_text())['/assets/product-media.css']


class Document(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.source, self.nodes, self.stack = source, [], []
        self.lines = [0]
        for match in re.finditer('\n', source):
            self.lines.append(match.end())
        self.feed(source)

    def source_offset(self):
        line, column = self.getpos()
        return self.lines[line - 1] + column

    def start(self, tag, attrs, closed=False):
        start = self.source_offset()
        end = start + len(self.get_starttag_text())
        node = dict(tag=tag, attrs=dict(attrs), start=start, open_end=end, end=end,
                    parent=self.stack[-1] if self.stack else None)
        self.nodes.append(node)
        if tag not in VOID and not closed:
            self.stack.append(node)

    def handle_starttag(self, tag, attrs):
        self.start(tag, attrs)

    def handle_startendtag(self, tag, attrs):
        self.start(tag, attrs, True)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index]['tag'] == tag:
                node = self.stack[index]
                node['close_start'] = self.source_offset()
                node['end'] = self.source.index('>', self.source_offset()) + 1
                del self.stack[index:]
                break

    def find(self, tag=None, cls=None, **attrs):
        return [n for n in self.nodes if (not tag or n['tag'] == tag)
                and (not cls or cls in n['attrs'].get('class', '').split())
                and all(n['attrs'].get(k) == v for k, v in attrs.items())]

    def raw(self, node):
        return self.source[node['start']:node['end']]

    def inside(self, node):
        return [n for n in self.nodes if node['open_end'] <= n['start'] < node['end']]


def replace(source, edits):
    boundary = len(source)
    for start, end, value in sorted(edits, reverse=True):
        if end > boundary:
            raise ValueError('Overlapping source edits')
        source = source[:start] + value + source[end:]
        boundary = start
    return source


def attribute(doc, node, key, value):
    tag = doc.source[node['start']:node['open_end']]
    escaped = html.escape(value, quote=True)
    pattern = rf'(\b{re.escape(key)}\s*=\s*)([\"\x27])(.*?)\2'
    if re.search(pattern, tag):
        tag = re.sub(pattern, lambda m: m[1] + '"' + escaped + '"', tag, count=1)
    else:
        tag = re.sub(r'\s*/?>$', lambda m: f' {key}="{escaped}"' + m[0], tag)
    return node['start'], node['open_end'], tag


def media(source):
    doc = Document(source)
    main = doc.find('img', id='pd-main')[0]['attrs']['src']
    thumbs = []
    for node in doc.find(cls='pd-thumb'):
        image = next(n for n in doc.inside(node) if n['tag'] == 'img')
        thumbs.append({'src': node['attrs']['data-src'], 'thumb': image['attrs']['src'],
                       'alt': node['attrs'].get('data-alt', '')})
    draws = []
    for node in doc.find(cls='pd-tech-draws'):
        draws += [n['attrs']['src'] for n in doc.inside(node) if n['tag'] == 'img']
    return {'main': main, 'thumbs': thumbs, 'drawings': draws}


def gallery_block(code, entry, chinese):
    esc = lambda value: html.escape(value, quote=True)
    lead_alt = f'{code} 產品主圖' if chinese else f'{code} product image'
    result = f'<div class="pd-media">\n        <div class="pd-hero">\n          <img id="pd-main" src="{esc(entry["main"])}" alt="{lead_alt}" fetchpriority="high" />\n        </div>'
    if entry['gallery']:
        prev, nxt, label = ('上一張', '下一張', '產品照片') if chinese else ('Previous photo', 'Next photo', 'product photos')
        result += f'\n        <div class="pd-thumbs-wrap">\n          <button class="pd-arrow prev" aria-label="{prev}">&#8249;</button>\n          <div class="pd-thumbs" role="tablist" aria-label="{code} {label}">'
        for i, photo in enumerate(entry['gallery']):
            alt = photo['zhAlt'] if chinese else photo['alt']
            active = ' is-active' if i == 0 else ''
            result += f'\n            <button type="button" class="pd-thumb{active}" role="tab" aria-selected="{str(i == 0).lower()}" data-src="{esc(photo["src"])}" data-alt="{esc(alt)}"><img src="{esc(photo["thumb"])}" alt="" loading="lazy" /></button>'
        result += f'\n          </div>\n          <button class="pd-arrow next" aria-label="{nxt}">&#8250;</button>\n        </div>'
    return result + '\n      </div>'


def products_in_schema(value):
    if isinstance(value, dict):
        types = value.get('@type', [])
        if types == 'Product' or isinstance(types, list) and 'Product' in types:
            yield value
        for child in value.values():
            yield from products_in_schema(child)
    elif isinstance(value, list):
        for child in value:
            yield from products_in_schema(child)


def synchronize(source, code, entry, chinese):
    doc = Document(source)
    edits = []
    if entry:
        block = doc.find(cls='pd-media')[0]
        edits.append((block['start'], block['end'], gallery_block(code, entry, chinese)))
        if entry.get('drawings'):
            block = doc.find(cls='pd-tech-draws')[0]
            label = '技術尺寸圖' if chinese else 'Technical drawing'
            count = len(entry['drawings'])
            # Keep original assets and all specification rows outside this media block.
            markup = '<div class="pd-tech-draws product-drawings">' + ''.join(
                f'\n            <div class="pd-tech-draw"><img src="{html.escape(url, quote=True)}" alt="{code} {label} {i+1}/{count}" loading="lazy" /></div>'
                for i, url in enumerate(entry['drawings'])) + '\n          </div>'
            edits.append((block['start'], block['end'], markup))
        styles = [n for n in doc.find('link') if n['attrs'].get('href', '').split('?')[0] == '/assets/product-media.css']
        if styles:
            if len(styles) != 1:
                raise ValueError('Duplicate product media stylesheet')
            if styles[0]['attrs']['href'] != CSS:
                edits.append(attribute(doc, styles[0], 'href', CSS))
        else:
            end = source.index('</head>')
            edits.append((end, end, f'<link rel="stylesheet" href="{CSS}" />\n'))
    main = entry['main'] if entry else doc.find('img', id='pd-main')[0]['attrs']['src']
    representative = 'https://www.gdchengda.hk' + main
    description = None
    if not chinese and re.fullmatch(r'A(?:10[1-6]|20[1-8]|30[1-9]|310)', code):
        kind = 'wall-mounted art basin' if code.startswith('A3') else 'art basin'
        description = f'{code} ceramic {kind} — OEM/ODM from Chengda, Chaozhou.'
    for node in doc.find('meta'):
        key = node['attrs'].get('name') or node['attrs'].get('property')
        value = node['attrs'].get('content', '')
        if key in ('og:image', 'twitter:image') and '_placeholder' in value:
            edits.append(attribute(doc, node, 'content', representative))
        elif description and key in ('description', 'og:description', 'twitter:description'):
            edits.append(attribute(doc, node, 'content', description))
    for node in doc.find('link', rel='preload', **{'as':'image'}):
        if node['attrs'].get('href') != main:
            edits.append(attribute(doc, node, 'href', main))
    for node in doc.find('script', type='application/ld+json'):
        raw = source[node['open_end']:node['close_start']]
        data = json.loads(raw)
        changed = False
        for product in products_in_schema(data):
            if '_placeholder' in json.dumps(product.get('image')):
                product['image'] = representative
                changed = True
            if description and product.get('description') != description:
                product['description'] = description
                changed = True
        if changed:
            edits.append((node['open_end'], node['close_start'], '\n' + json.dumps(data, ensure_ascii=False, indent=2) + '\n'))
    return replace(source, edits)


def run(write=False):
    manifest = json.loads((ROOT / 'tools/product-media.json').read_text())['products']
    changed = []
    for file in sorted((ROOT / 'products').glob('*/index.html')):
        code = file.parent.name
        for chinese in (False, True):
            target = ROOT / ('zh/products' if chinese else 'products') / code / 'index.html'
            source = target.read_text()
            result = synchronize(source, code, manifest.get(code), chinese)
            if source != result:
                changed.append(str(target.relative_to(ROOT)))
                if write:
                    target.write_text(result)
    print(f'{"Updated" if write else "Stale"} product media pages: {len(changed)}')
    return changed


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    stale = run(args.write)
    raise SystemExit(bool(stale) and not args.write)
