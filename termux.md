# Kokoro TTS on Termux (Android)

Step-by-step guide to run this project on **Termux**.  
For Linux/macOS/Windows, see [install.txt](install.txt) and [README.md](README.md).

---

## Summary

| Component | On Termux |
|-----------|-----------|
| **Node.js + UI + SQLite (sql.js)** | Usually works |
| **Python Kokoro 0.9.x** | Needs **Python 3.10–3.12** (not default Termux 3.13) |
| **`espeak` package** | Termux package name is **`espeak`** (not `espeak-ng`) |
| **Kokoro audio model** | Auto-downloaded from Hugging Face on first generate |

**Default Termux Python (3.13+)** cannot install `kokoro>=0.9.2`. Use **Python 3.11 from TUR** (recommended) or **Proot Debian**.

---

## 0. Prerequisites

- Up-to-date Termux (`pkg update && pkg upgrade`)
- Enough disk space (PyTorch + Kokoro model can be **hundreds of MB–GB**)
- Internet for `pip install` and the first model download
- **TUR** (Termux User Repository) — `python3.11` appears under `tur-packages`

Check TUR is enabled:

```bash
pkg search python3.11
```

You should see a line like: `python3.11/tur-packages`.

If not, install the TUR repo per official TUR docs, then run `pkg search` again.

---

## 1. Termux system packages

```bash
pkg update
pkg upgrade
pkg install python3.11 espeak build-essential git nodejs-lts
```

| Package | Purpose |
|---------|---------|
| `python3.11` | Interpreter for venv (kokoro 0.9.x) |
| `espeak` | TTS phonetics (package contents = espeak-ng) |
| `build-essential` | Compiler (some pip wheels) |
| `nodejs-lts` | Express server |
| `git` | Clone repo (optional) |

Verify:

```bash
python3.11 --version    # 3.11.x
espeak-ng --version     # or: espeak --version
node --version
```

> Do **not** run `pkg install espeak-ng` — that package **does not exist** on Termux (*Unable to locate package espeak-ng*).

---

## 2. Get the project code

```bash
cd ~
git clone <your-repo-url> tts
cd tts
```

Or copy the project folder to `~/tts` and:

```bash
cd ~/tts
```

---

## 3. Python 3.11 virtualenv

Remove an old venv if it was created with Python 3.13:

```bash
deactivate 2>/dev/null || true
rm -rf venv
python3.11 -m venv venv
source venv/bin/activate
```

Confirm:

```bash
python --version      # Python 3.11.x
which python          # .../tts/venv/bin/python
```

### (Optional) Global `python3` → 3.11 symlink

Only if you understand the risk (may break Termux packages that expect 3.13):

```bash
pkg install python-is-python3.11
```

Safer: always use **`python3.11`** and the venv, without a global symlink.

---

## 4. Install Python dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

Verify imports:

```bash
python -c "from kokoro import KPipeline; import soundfile, numpy; print('OK')"
```

### `ResolutionImpossible` / `torch` has no matching distribution

Typical pip output:

```text
kokoro 0.9.x depends on torch
... no matching distributions available for your environment: torch
```

**Cause:** `kokoro` requires **PyTorch**. PyPI does **not** publish standard `torch` wheels for Termux/Android, so `pip install -r requirements.txt` cannot finish — even with Python 3.11 correct.

This is a **platform limit**, not a bug in this repo.

**What works on Termux without torch**

| Part | Status |
|------|--------|
| `npm install` + `npm start` (UI, SQLite / sql.js) | Usually OK |
| Kokoro TTS (`pip install kokoro`) | **Fails** without torch |

**Options (best first)**

1. **Recommended — TTS on PC/VPS, Termux as client**  
   On a laptop/PC: Python 3.11/3.12 + `pip install -r requirements.txt`, then `npm start`.  
   On the phone: open `http://<server-IP>:3000`.

2. **Proot Debian** (section 8)  
   Inside Debian, `pip install torch` sometimes works on `aarch64` Linux; still not guaranteed on all devices.

3. **Experimental — Termux `python-torch` package** (may not match Python 3.11 venv)

   ```bash
   pkg search python-torch
   pkg install python-torch
   ```

   Check which Python the package uses (`python3 --version` after install).  
   If it is **not** 3.11, it will not help your `python3.11` venv.

   If versions align, try a venv that can see system packages:

   ```bash
   deactivate 2>/dev/null || true
   rm -rf venv
   python3.11 -m venv venv --system-site-packages
   source venv/bin/activate
   python -c "import torch; print(torch.__version__)"
   ```

   If `import torch` works, install Kokoro without letting pip pull torch from PyPI:

   ```bash
   pip install --upgrade pip
   pip install "kokoro>=0.9.2" soundfile numpy --no-deps
   pip install huggingface-hub loguru "misaki[en]>=0.9.4"
   python -c "from kokoro import KPipeline; print('OK')"
   ```

   If any step fails, use option 1 or 2.

4. **Do not** downgrade to `kokoro==0.7.x` only to satisfy pip — older Kokoro **also** depends on `torch`.

---

## 5. Download Kokoro audio model (pre-download)

This repo has **no** separate model download command. Kokoro pulls weights from **Hugging Face** when `KPipeline` runs for the first time.

### 5.1 Cache folder (recommended)

```bash
export HF_HOME="$HOME/kokoro_hf_cache"
export TRANSFORMERS_CACHE="$HF_HOME/transformers"
export TORCH_HOME="$HF_HOME/torch"
```

Persist in `~/.bashrc` or `~/.profile`:

```bash
echo 'export HF_HOME="$HOME/kokoro_hf_cache"' >> ~/.bashrc
echo 'export TRANSFORMERS_CACHE="$HF_HOME/transformers"' >> ~/.bashrc
echo 'export TORCH_HOME="$HF_HOME/torch"' >> ~/.bashrc
```

### 5.2 Test + download model (short text)

With **venv active**:

```bash
python - <<'PY'
from kokoro import KPipeline
import soundfile as sf

pipeline = KPipeline(lang_code='a')
gen = pipeline("Hello", voice="af_heart", speed=1.0, split_pattern=r"\n+")
for i, (gs, ps, audio) in enumerate(gen):
    sf.write("kokoro_test.wav", audio, 24000)
    print("OK — model downloaded, file: kokoro_test.wav")
    break
PY
```

The first download can take a **long time** and use significant mobile data.

### 5.3 Check cache size

```bash
du -sh "$HF_HOME" 2>/dev/null || du -sh ~/.cache/huggingface 2>/dev/null
```

Model repo: [hexgrad/Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M)

---

## 6. Node.js (web server)

```bash
cd ~/tts
npm install
```

Saved scripts use **sql.js** (WASM), no native addon — suitable for Termux.

---

## 7. Run the app

```bash
cd ~/tts
source venv/bin/activate
export PYTHON="$PWD/venv/bin/python"
npm start
```

Open in a browser (same phone or another device on the same network):

- `http://127.0.0.1:3000`
- or `http://<phone-IP>:3000` (ensure the port is reachable)

### Optional environment variables

```bash
export PORT=3000
export TTS_PYTHON_TIMEOUT_MS=900000    # long text (ms)
export TTS_SQLITE_PATH="$HOME/tts/data/kokoro_tts.sqlite"
```

---

## 8. Alternative: Proot Debian

If native Termux `pip install` / `torch` fails:

```bash
pkg install proot-distro
proot-distro install debian
proot-distro login debian
```

Inside Debian:

```bash
apt update
apt install -y python3 python3-venv python3-pip espeak-ng build-essential git curl
cd /path/to/tts
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python -c "from kokoro import KPipeline; import soundfile, numpy; print('OK')"
```

Node can stay in Termux (`npm start`) with:

```bash
export PYTHON="/path/in/proot/tts/venv/bin/python"
```

(adjust the path from Termux into the proot home).

---

## 9. Troubleshooting

### `No matching distribution found for kokoro>=0.9.2`

```bash
python3 --version   # if 3.13+ → recreate venv with python3.11 (section 3)
```

### `Unable to locate package espeak-ng`

```bash
pkg install espeak
```

### `NODE_MODULE_VERSION` / sql.js

sql.js does not need a native rebuild like `better-sqlite3`. Try:

```bash
rm -rf node_modules && npm install
```

### TTS generate timeout

```bash
export TTS_PYTHON_TIMEOUT_MS=900000
npm start
```

### Model not downloaded / offline use

1. Run section **5** once with internet  
2. Back up the `$HF_HOME` folder  
3. Restore on another device with the same env vars

---

## 10. Most stable option

Run the server on a **laptop/PC/VPS** (Python 3.11/3.12 + `requirements.txt`); use Termux only to open:

`http://<server-IP>:3000`

---

## References

- [install.txt](install.txt) — general Python installation  
- [requirements.txt](requirements.txt) — pip dependencies  
- [README.md](README.md) — project documentation  
