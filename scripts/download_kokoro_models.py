#!/usr/bin/env python3
"""
Pre-download Kokoro weights from Hugging Face (hexgrad/Kokoro-82M).
Run after: pip install -r requirements.txt

  python scripts/download_kokoro_models.py
  python scripts/download_kokoro_models.py --voices af_heart,af_bella
"""
from __future__ import annotations

import argparse
import sys


def main() -> int:
    parser = argparse.ArgumentParser(description="Download Kokoro model + voice files from Hugging Face")
    parser.add_argument(
        "--lang",
        default="a",
        help="Kokoro lang_code (default: a = US English)",
    )
    parser.add_argument(
        "--voices",
        default="af_heart",
        help="Comma-separated voice ids (default: af_heart)",
    )
    parser.add_argument(
        "--repo",
        default="hexgrad/Kokoro-82M",
        help="Hugging Face repo id",
    )
    args = parser.parse_args()

    try:
        from kokoro import KPipeline
    except ImportError as e:
        print("kokoro not installed. Activate venv and run: pip install -r requirements.txt", file=sys.stderr)
        print(e, file=sys.stderr)
        return 1

    voices = [v.strip() for v in args.voices.split(",") if v.strip()]
    print(f"Downloading model: {args.repo} (lang_code={args.lang})")
    pipeline = KPipeline(lang_code=args.lang, repo_id=args.repo)

    for voice in voices:
        print(f"Downloading voice: {voice}")
        pipeline.load_voice(voice)

    print("Done. Weights are cached (see HF_HOME or ~/.cache/huggingface).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
