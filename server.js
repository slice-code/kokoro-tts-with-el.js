// Kokoro TTS Backend Server
const express = require('express');
const path = require('path');
const { execFileSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const { registerTtsStoreRoutes } = require('./tts-sqlite-store');

// Pakai venv proyek jika ada (kokoro biasanya terpasang di sana, bukan di python3 sistem)
function resolvePythonExecutable() {
  if (process.env.PYTHON) {
    const fromEnv = process.env.PYTHON;
    if (fs.existsSync(fromEnv)) {
      return fromEnv;
    }
  }
  const venvCandidates = [
    path.join(__dirname, 'venv', 'bin', 'python3'),
    path.join(__dirname, 'venv', 'bin', 'python'),
    path.join(__dirname, 'venv', 'Scripts', 'python.exe'),
  ];
  for (const candidate of venvCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return 'python3';
}

const PYTHON_EXE = resolvePythonExecutable();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Temp directory for audio files
const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

registerTtsStoreRoutes(app);

/**
 * Batas waktu spawn Python untuk satu request TTS.
 * Teks panjang + CPU-only bisa >60s; unduhan voice/model pertama juga menambah waktu.
 * Override: env TTS_PYTHON_TIMEOUT_MS (nilai minimum disarankan 300000 untuk skrip panjang).
 */
function computeTtsTimeoutMs(textLength) {
  const envRaw = process.env.TTS_PYTHON_TIMEOUT_MS;
  if (envRaw != null && String(envRaw).trim() !== '') {
    const n = parseInt(String(envRaw), 10);
    if (Number.isFinite(n) && n >= 60000) {
      return Math.min(45 * 60 * 1000, n);
    }
  }
  const len = Math.max(0, Number(textLength) || 0);
  const baseMs = 120000;
  const perCharMs = 250;
  const capMs = 20 * 60 * 1000;
  return Math.min(capMs, baseMs + len * perCharMs);
}

// TTS Generation Endpoint
app.post('/api/tts/generate', async (req, res) => {
  try {
    const { text, voice, speed = 1.0 } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!voice) {
      return res.status(400).json({ error: 'Voice is required' });
    }

    const speedNum = Math.min(2, Math.max(0.5, Number.parseFloat(speed)));
    const safeSpeed = Number.isFinite(speedNum) ? speedNum : 1.0;

    console.log(`Generating TTS: voice=${voice}, speed=${safeSpeed}x, text length=${text.length}`);

    const pythonTimeoutMs = computeTtsTimeoutMs(text.length);
    console.log(`TTS Python timeout: ${pythonTimeoutMs}ms (set TTS_PYTHON_TIMEOUT_MS to override)`);

    // Generate unique filename
    const filename = `tts_${crypto.randomBytes(8).toString('hex')}.wav`;
    const outputPath = path.join(TEMP_DIR, filename);

    // Create Python script for TTS with speed control
    const pythonScript = `
from kokoro import KPipeline
import soundfile as sf
import numpy as np
import sys

try:
    text = '''${text.replace(/'/g, "\\'")}'''
    voice = '${voice}'
    speed = float(${safeSpeed})
    output_path = '${outputPath.replace(/\\/g, '\\\\')}'
    
    # Initialize pipeline
    pipeline = KPipeline(lang_code='a')
    
    # Generate audio (speed handled by Kokoro — lebih natural daripada resample scipy)
    generator = pipeline(text, voice=voice, speed=speed)
    
    # Collect all audio segments
    all_audio = []
    for i, (gs, ps, audio) in enumerate(generator):
        all_audio.append(audio)
        print(f'Segment {i}: {gs[:50]}...', file=sys.stderr)
    
    # Combine audio segments
    combined_audio = np.concatenate(all_audio) if len(all_audio) > 1 else all_audio[0]
    
    # Save to file
    sf.write(output_path, combined_audio, 24000)
    print(f'Success: {output_path}', file=sys.stderr)
    
except Exception as e:
    print(f'Error: {str(e)}', file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)
`;

    // Save Python script
    const scriptPath = path.join(TEMP_DIR, 'tts_script.py');
    fs.writeFileSync(scriptPath, pythonScript);

    // Execute Python script
    try {
      execFileSync(PYTHON_EXE, [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: pythonTimeoutMs,
        maxBuffer: 20 * 1024 * 1024,
      });

      // Check if file was created
      if (!fs.existsSync(outputPath)) {
        throw new Error('Failed to generate audio file');
      }

      // Read and send audio file
      const audioBuffer = fs.readFileSync(outputPath);
      
      // Set headers for audio streaming
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Length', audioBuffer.length);
      res.setHeader('Cache-Control', 'no-cache');
      
      // Send file
      res.send(audioBuffer);

      // Clean up temp files after delay
      setTimeout(() => {
        try {
          fs.unlinkSync(outputPath);
          fs.unlinkSync(scriptPath);
        } catch (e) {
          console.error('Cleanup error:', e);
        }
      }, 60000); // Delete after 1 minute

    } catch (error) {
      console.error('Python execution error:', error);
      const stderrStr = error.stderr ? String(error.stderr) : '';
      const timedOut =
        error.code === 'ETIMEDOUT' ||
        error.signal === 'SIGTERM' ||
        /ETIMEDOUT/i.test(String(error.message || ''));
      if (timedOut) {
        return res.status(504).json({
          error: 'TTS timed out',
          details:
            'Proses Python melebihi batas waktu. Coba perpendek teks, atau set environment TTS_PYTHON_TIMEOUT_MS (mis. 900000 untuk 15 menit).',
        });
      }
      res.status(500).json({
        error: 'Failed to generate audio',
        details: error.message,
        stderr: stderrStr ? stderrStr.slice(0, 2000) : undefined,
      });
    }

  } catch (error) {
    console.error('TTS Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'Kokoro TTS',
    timestamp: new Date().toISOString()
  });
});

// Serve index.html for all routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Kokoro TTS Server running on http://localhost:${PORT}`);
  console.log(`📝 API Endpoint: http://localhost:${PORT}/api/tts/generate`);
  console.log(`🐍 Python TTS: ${PYTHON_EXE}`);
  console.log('⏱ TTS timeout: dynamic from text length, or TTS_PYTHON_TIMEOUT_MS env');
});

module.exports = app;
