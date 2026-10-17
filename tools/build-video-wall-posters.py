"""Build lossless, uncropped display-size variants of the approved first poster."""
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "/assets/videos/basin-life-story-01-raw-materials-poster.webp"
TARGET = "/assets/videos/posters/basin-life-story-01-raw-materials"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    original = ROOT / SOURCE.lstrip("/")
    image = Image.open(original).convert("RGB")
    assert image.size == (1080, 1920)
    variants = []
    for width in (360, 540, 864):
        height = width * 16 // 9
        resized = image.resize((width, height), Image.Resampling.LANCZOS)
        url = f"{TARGET}-{width}.webp"
        output = ROOT / url.lstrip("/")
        output.parent.mkdir(parents=True, exist_ok=True)
        resized.save(output, "WEBP", lossless=True, method=6)
        with Image.open(output) as decoded:
            assert decoded.convert("RGB").tobytes() == resized.tobytes()
        variants.append({"src": url, "width": width, "height": height,
                         "bytes": output.stat().st_size, "sha256": sha(output.read_bytes()),
                         "decodedSha256": sha(resized.tobytes())})
    report = {"basin-life-story-01-raw-materials": {
        "source": SOURCE, "sourceSha256": sha(original.read_bytes()),
        "sourceBytes": original.stat().st_size, "width": 1080, "height": 1920,
        "encoding": "lossless WebP after full-frame LANCZOS resizing; no crop, overlays or generative edits",
        "variants": variants}}
    (ROOT / "tools/video-wall-posters.json").write_text(json.dumps(report, indent=2) + "\n", encoding="ascii")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
