"""Keep the approved measured basin specifications in bilingual product pages."""
import argparse
from decimal import Decimal, ROUND_HALF_UP
import html
import json
from product_media import Document, ROOT, replace, attribute

TWO_DRAWING_RULES = '''  .pd-tech-draws.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pd-tech-draws.two .pd-tech-draw { aspect-ratio: auto; padding: 14px; min-height: 268px; display: flex; align-items: center; justify-content: center; }
  .pd-tech-draws.two .pd-tech-draw img { max-width: 100%; height: auto; max-height: 240px; object-fit: contain; }
'''
MOBILE_DRAWING_RULES = '''  @media (max-width: 560px) {
    .pd-tech-draws.two { grid-template-columns: minmax(0, 1fr); }
  }
'''


def millimeters(values):
    return ' \u00d7 '.join(f'{value:g}' for value in values) + ' mm'


def inches(values):
    return ' \u00d7 '.join(str((Decimal(str(value)) / Decimal('25.4')).quantize(
        Decimal('0.1'), rounding=ROUND_HALF_UP)) + '\u2033' for value in values)


def labels(chinese):
    return ('\u5c3a\u5bf8', '\u5167\u5f91\u5c3a\u5bf8', '\u6de8\u91cd') if chinese else ('Dimensions', 'Inner Dimensions', 'Net Weight')


def synchronize(source, entry, chinese):
    doc = Document(source)
    block = doc.find(cls='pd-specs')[0]
    nodes = [node for node in doc.inside(block) if node['parent'] is block]
    fields = {html.unescape(source[key['open_end']:key['close_start']]): value
              for key, value in zip(nodes[::2], nodes[1::2])}
    outer, inner, weight = labels(chinese)
    values = {
        outer: millimeters(entry['outerMm']) + '<span class="small">' + inches(entry['outerMm']) + '</span>',
        inner: millimeters(entry['innerMm']) + '<span class="small">' + inches(entry['innerMm']) + '</span>',
        weight: f'{entry["netWeightKg"]:g} ' + ('\u516c\u65a4' if chinese else 'kg'),
    }
    assert outer in fields
    edits = []
    additions = ''
    for name, value in values.items():
        if name in fields:
            node = fields[name]
            if source[node['open_end']:node['close_start']] != value:
                edits.append((node['open_end'], node['close_start'], value))
        else:
            additions += f'\n          <div class="k">{name}</div><div class="v">{value}</div>'
    if additions:
        boundary = fields[outer]['end']
        edits.append((boundary, boundary, additions))
    if entry.get('drawings'):
        two_views = any('two' in node['attrs'].get('class', '').split() for node in doc.find(cls='pd-tech-draws'))
        if two_views and '.pd-tech-draws.two {' not in source:
            marker = '  .pd-tech-draw {'
            assert source.count(marker) == 1
            offset = source.index(marker)
            edits.append((offset, offset, TWO_DRAWING_RULES))
        if two_views and MOBILE_DRAWING_RULES not in source:
            styles = doc.find('style')
            assert len(styles) == 1
            offset = styles[0]['close_start']
            edits.append((offset, offset, MOBILE_DRAWING_RULES))
        images = [node for block in doc.find(cls='pd-tech-draws')
                  for node in doc.inside(block) if node['tag'] == 'img']
        assert len(images) == len(entry['drawings'])
        for node, url in zip(images, entry['drawings']):
            if node['attrs']['src'] != url:
                edits.append(attribute(doc, node, 'src', url))
            parent = node['parent']
            if parent and parent['tag'] == 'a' and 'pd-tech-draw' in parent['attrs'].get('class', '').split():
                if parent['attrs'].get('href') != url:
                    edits.append(attribute(doc, parent, 'href', url))
    for node in doc.find('script', type='application/ld+json'):
        raw = source[node['open_end']:node['close_start']]
        product = json.loads(raw)
        if product.get('@type') != 'Product':
            continue
        before = json.dumps(product, ensure_ascii=False)
        specifications = product.setdefault('additionalProperty', [])
        properties = [(outer, millimeters(entry['outerMm'])),
                      (inner if chinese else 'Inner dimensions', millimeters(entry['innerMm'])),
                      (weight if chinese else 'Net weight', f'{entry["netWeightKg"]:g} ' + ('\u516c\u65a4' if chinese else 'kg'))]
        for name, value in properties:
            matches = [item for item in specifications if item.get('name', '').casefold() == name.casefold()]
            assert len(matches) <= 1
            if matches:
                matches[0]['value'] = value
            else:
                specifications.append({'@type': 'PropertyValue', 'name': name, 'value': value})
        if json.dumps(product, ensure_ascii=False) != before:
            edits.append((node['open_end'], node['close_start'], '\n' + json.dumps(product, ensure_ascii=False, indent=2) + '\n'))
    return replace(source, edits)


def run(write=False):
    entries = json.loads((ROOT / 'tools/measured-basins.json').read_text())['products']
    changed = []
    for code, entry in entries.items():
        assert len(entry['outerMm']) == len(entry['innerMm']) == 3
        assert all(0 < inner <= outer for inner, outer in zip(entry['innerMm'], entry['outerMm']))
        assert entry['netWeightKg'] > 0
        for chinese in (False, True):
            path = ROOT / ('zh/products' if chinese else 'products') / code / 'index.html'
            source = path.read_text()
            updated = synchronize(source, entry, chinese)
            if updated != source:
                changed.append(str(path.relative_to(ROOT)))
                if write:
                    path.write_text(updated)
    return changed


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    changed = run(args.write)
    print(f'{"Updated" if args.write else "Stale"} measured basin pages: {len(changed)}')
    raise SystemExit(bool(changed) and not args.write)
