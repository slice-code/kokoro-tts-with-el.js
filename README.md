# Kokoro TTS — Text to Voice

A Text-to-Speech web app using **Kokoro** (Python), **el.js** + **layout.js** on the frontend, and an **Express** backend with **SQLite** storage (saved scripts & settings).

[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/gugusdarmayanto)

## Features

- **TTS**: WAV synthesis via Kokoro (native `speed` in the pipeline).
- **Multiple voices**: Voice list in the UI.
- **Audio player** + WAV download.
- **Saved scripts**: Title, text, voice, narration mode — stored on the server (`data/kokoro_tts.sqlite`).
- **Settings**: Reading speed (0.5×–2×) persisted on the server.
- **UI**: Responsive; per-page layout options in `public/index.html` (`TTS_PAGE_LAYOUT`).

## Prerequisites

| Component | Notes |
|-----------|--------|
| **Node.js** | **18+** recommended (global `fetch`). App storage uses **sql.js** (SQLite via WASM) — no native addon rebuild when you upgrade Node. |
| **Python** | **3.10+** recommended; project venv in `venv/`. |
| **espeak-ng** | Required for Kokoro phonetics — see [install.txt](install.txt). |
| **Disk space** | Kokoro pulls large ML deps (e.g. PyTorch/ONNX). |

## Installation

### 1. Node

```bash
npm install
```

### 2. Python (venv + TTS dependencies)

```bash
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

Step-by-step (including **espeak-ng** per OS) is in **[install.txt](install.txt)**.

### 3. Run

```bash
npm run dev    # nodemon
# or
npm start      # node server.js
```

Open **http://localhost:3000** (or whatever `PORT` you set).

## Project layout (summary)

```
onnx/
├── server.js              # Express, TTS (spawn Python), store API
├── tts-sqlite-store.js    # SQLite via sql.js: scripts + settings KV
├── package.json
├── requirements.txt       # Python deps for TTS
├── install.txt            # Python + espeak-ng guide
├── public/
│   ├── index.html         # SPA routes + TTS_PAGE_LAYOUT
│   ├── layout.js
│   ├── page/
│   │   ├── text-to-voice.js
│   │   ├── history.js     # Saved scripts
│   │   ├── settings.js
│   │   ├── tts-history-storage.js
│   │   └── tts-user-settings.js
│   └── …
├── data/                  # SQLite (gitignored) — created at runtime
└── temp/                  # Temp WAV & Python scripts (gitignored)
```

## API

### `POST /api/tts/generate`

**JSON body:**

| Field | Required | Description |
|-------|----------|---------------|
| `text` | yes | Text to synthesize |
| `voice` | yes | Voice id, e.g. `af_heart` |
| `speed` | no | 0.5–2.0 (default `1.0`) |

**Response:** `audio/wav` (binary).

### `GET /api/health`

Service status (JSON).

### Storage (`/api/tts/store/…`)

Used by the UI for scripts & reading speed:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/tts/store/history` | List scripts `{ items }` |
| `POST` | `/api/tts/store/history` | Upsert script → `{ id }` |
| `DELETE` | `/api/tts/store/history/:id` | Delete one |
| `DELETE` | `/api/tts/store/history/all` | Clear all |
| `GET` | `/api/tts/store/kv/:key` | Read KV (404 if missing) |
| `PUT` | `/api/tts/store/kv/:key` | Body `{ "value": … }` |

## Example voices

**Female (US):** `af_heart`, `af_alloy`, `af_aoede`, `af_bella`, `af_jessica`, `af_kore`, `af_nicole`, `af_nova`, `af_river`, `af_sarah`, `af_sky`  

**Male (US):** `am_adam`, `am_echo`, `am_eric`, `am_fenrir`, `am_liam`, `am_michael`, `am_onyx`, `am_puck`, `am_santa`

The full list follows your UI / Kokoro voice documentation.

## Configuration (environment)

| Variable | Default / example | Description |
|----------|-------------------|---------------|
| `PORT` | `3000` | HTTP port |
| `PYTHON` | *(auto `venv/...`)* | Absolute path to Python for TTS |
| `TTS_PYTHON_TIMEOUT_MS` | dynamic from text length | Must be ≥ `60000` if set; long scripts: raise (e.g. `900000` for 15 min) |
| `TTS_SQLITE_PATH` | `data/kokoro_tts.sqlite` | SQLite file path |

Example:

```bash
export PORT=3001
export TTS_SQLITE_PATH="$HOME/kokoro-data/app.sqlite"
export TTS_PYTHON_TIMEOUT_MS=900000
npm start
```

## Troubleshooting

### Storage / sql.js fails to load

Ensure dependencies are installed (`npm install`). The WASM file is loaded from `node_modules/sql.js/dist/`. If you bundle or relocate `node_modules`, set paths accordingly or reinstall sql.js.

### Kokoro / Python import errors

```bash
source venv/bin/activate
pip install -r requirements.txt
python -c "from kokoro import KPipeline; import soundfile, numpy; print('OK')"
```

Point **`PYTHON`** at the venv interpreter if the system has multiple Pythons.

### `espeak-ng` not found

Follow the espeak section in **[install.txt](install.txt)**.

### Port already in use

```bash
PORT=3001 npm start
```

### Termux (Android)

Full step-by-step guide: **[termux.md](termux.md)** (Python 3.11 TUR, `espeak`, model download, npm).

**Common pip errors on Termux**

1. **Python 3.13+** — Kokoro **0.9.x** needs **Python ≥3.10 and &lt;3.13**; use **python3.11** from TUR (see **termux.md**).
2. **`ResolutionImpossible` / no matching distribution: `torch`** — PyPI has **no PyTorch wheel for Android**. Kokoro depends on `torch`; this often blocks install even with Python 3.11. See **termux.md** §4 (workarounds + **PC/VPS** recommendation).

The **Node + sql.js** UI usually runs on Termux; **Kokoro TTS** on-device usually does not.

## License

MIT

## Contributing & support

Pull requests are welcome. If something breaks, open an issue on your project repository.
