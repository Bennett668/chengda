"""Apply approved preview derivatives without changing full-resolution targets."""
import argparse
import hashlib
import html
import json
from product_media import ROOT, Document, attribute, replace

MODELS = [f'T{n}' for n in range(202, 218)] + ['VB101']
MANIFEST = ROOT / 'tools/product-previews.json'
MOBILE_RULES = '''  @media (max-width: 380px) {
    .pd { grid-template-columns: minmax(0, 1fr); }
    .pd > div { min-width: 0; }
    .pd-features { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .pd-specs { grid-template-columns: 96px minmax(0, 1fr); column-gap: 12px; }
    .pd-specs .v { overflow-wrap: anywhere; }
  }

'''


def inventory():
    result = {}
    for code in MODELS:
        doc = Document((ROOT / f'products/{code}/index.html').read_text())
        gallery = [n['attrs']['data-src'] for n in doc.find(cls='pd-thumb')]
        drawings = [f'/assets/products/{code}/{name}.webp' for name in
                    (['dimensions'] if code.startswith('T') else ['dim-1', 'dim-2'])]
        for url in gallery + drawings:
            if not url.startswith(f'/assets/products/{code}/') or not (ROOT / url.lstrip('/')).is_file():
                raise ValueError(f'Unreviewed source {url}')
        result[code] = {'gallery': gallery, 'drawings': drawings}
    return result


def tag_with(doc, node, updates):
    tag = doc.source[node['start']:node['open_end']]
    for key, value in updates.items():
        fragment = Document(tag)
        tag = replace(tag, [attribute(fragment, fragment.nodes[0], key, str(value))])
    return tag


def synchronize(source, code, entry, chinese):
    doc, edits = Document(source), []
    mapping = {item['source']: item['thumbnail']['url'] for item in entry['gallery']}
    thumbs = doc.find(cls='pd-thumb')
    if [n['attrs']['data-src'] for n in thumbs] != list(mapping):
        raise ValueError(f'{code}: changed gallery needs reviewed previews')
    for node in thumbs:
        image = next(n for n in doc.inside(node) if n['tag'] == 'img')
        edits.append(attribute(doc, image, 'src', mapping[node['attrs']['data-src']]))
    drawings = doc.find(cls='pd-tech-draw')
    if len(drawings) != len(entry['drawings']):
        raise ValueError(f'{code}: unexpected drawing count')
    for node, item in zip(drawings, entry['drawings']):
        image = next(n for n in doc.inside(node) if n['tag'] == 'img')
        original = item['source']
        if image['attrs']['src'] not in [original] + [p['url'] for p in item['previews']]:
            raise ValueError(f'{code}: unexpected drawing source')
        sizes = ('(max-width: 880px) calc(100vw - 104px), (max-width: 1600px) 60vw, 920px'
                 if code.startswith('T') else '(max-width: 880px) 100vw, 50vw')
        updates = {'src': item['previews'][-1]['url'],
                   'srcset': ', '.join(f'{p["url"]} {p["width"]}w' for p in item['previews']),
                   'sizes': sizes, 'width': item['width'], 'height': item['height'],
                   'decoding': 'async'}
        edits.append((image['start'], image['open_end'], tag_with(doc, image, updates)))
        if node['tag'] == 'div':
            label = f'{code} ' + ('查看原尺寸技術圖' if chinese else 'Open full-size technical drawing')
            opening = f'<a class="pd-tech-draw" href="{html.escape(original)}" target="_blank" rel="noopener" aria-label="{label}">'
            edits.extend([(node['start'], node['open_end'], opening),
                          (node['close_start'], node['end'], '</a>')])
        elif node['tag'] != 'a' or node['attrs'].get('href') != original:
            raise ValueError(f'{code}: unexpected original drawing link')
    result = replace(source, edits)
    if code.startswith('T') and MOBILE_RULES not in result:
        marker = '  /* Action buttons */'
        if result.count(marker) != 1:
            raise ValueError(f'{code}: unexpected mobile style boundary')
        result = result.replace(marker, MOBILE_RULES + marker)
    return result


def run(write=False):
    data = json.loads(MANIFEST.read_text())
    if list(data) != MODELS:
        raise ValueError('Unexpected preview scope')
    changed = []
    for code, entry in data.items():
        for item in entry['gallery'] + entry['drawings']:
            original = ROOT / item['source'].lstrip('/')
            if hashlib.sha256(original.read_bytes()).hexdigest() != item['sourceHash']:
                raise ValueError(f'{code}: original changed, regenerate previews')
            for preview in ([item['thumbnail']] if 'thumbnail' in item else item['previews']):
                file = ROOT / preview['url'].lstrip('/')
                if hashlib.sha256(file.read_bytes()).hexdigest() != preview['hash']:
                    raise ValueError(f'{code}: preview checksum mismatch')
                if preview['bytes'] >= original.stat().st_size:
                    raise ValueError(f'{code}: preview not smaller')
        for chinese in (False, True):
            file = ROOT / ('zh/products' if chinese else 'products') / code / 'index.html'
            source = file.read_text()
            updated = synchronize(source, code, entry, chinese)
            if source != updated:
                changed.append(str(file.relative_to(ROOT)))
                if write:
                    file.write_text(updated)
    print(f'{"Updated" if write else "Stale"} product previews: {len(changed)}')
    return changed


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--inventory', action='store_true')
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    if args.inventory:
        print(json.dumps(inventory()))
    else:
        raise SystemExit(bool(run(args.write)) and not args.write)
