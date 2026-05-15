// Saved scripts & settings — SQLite in-process via sql.js (WASM, no native addon)
'use strict';

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const MAX_HISTORY_ENTRIES = 50;

function wasmPath(file) {
  return path.join(__dirname, 'node_modules', 'sql.js', 'dist', file);
}

function persistDb(db, dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

async function openStore(dbPath) {
  const SQL = await initSqlJs({ locateFile: wasmPath });
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  let db;
  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    db = new SQL.Database();
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      text TEXT NOT NULL DEFAULT '',
      voice TEXT NOT NULL DEFAULT 'af_heart',
      use_youtube INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings_kv (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL
    );
  `);
  persistDb(db, dbPath);
  return { db, dbPath };
}

function rowToHistoryItem(r) {
  return {
    id: r.id,
    title: r.title,
    text: r.text,
    voice: r.voice,
    useYouTubeMode: !!r.use_youtube,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function trimHistory(db) {
  const stmt = db.prepare('SELECT id FROM history ORDER BY updated_at DESC');
  const ids = [];
  while (stmt.step()) {
    ids.push(stmt.getAsObject().id);
  }
  stmt.free();
  if (ids.length <= MAX_HISTORY_ENTRIES) return;
  for (const id of ids.slice(MAX_HISTORY_ENTRIES)) {
    db.run('DELETE FROM history WHERE id = ?', [id]);
  }
}

/**
 * Register REST routes under /api/tts/store (async: loads sql.js WASM first).
 * @param {import('express').Application} app
 * @param {{ dbPath?: string }} [opts]
 * @returns {Promise<void>}
 */
async function registerTtsStoreRoutes(app, opts = {}) {
  const dbPath =
    opts.dbPath ||
    (process.env.TTS_SQLITE_PATH && String(process.env.TTS_SQLITE_PATH).trim()) ||
    path.join(__dirname, 'data', 'kokoro_tts.sqlite');

  const { db } = await openStore(dbPath);

  console.log('📦 TTS store (SQLite / sql.js):', dbPath);

  app.get('/api/tts/store/history', (req, res) => {
    try {
      const stmt = db.prepare('SELECT * FROM history');
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      const items = rows.map(rowToHistoryItem);
      items.sort((a, b) => {
        const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return tb - ta;
      });
      res.json({ items });
    } catch (e) {
      console.error('store history list', e);
      res.status(500).json({ error: 'Gagal membaca naskah', details: e.message });
    }
  });

  app.post('/api/tts/store/history', (req, res) => {
    try {
      const body = req.body || {};
      const id =
        body.id && String(body.id).trim()
          ? String(body.id).trim()
          : `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      const now = new Date().toISOString();

      let existing = null;
      {
        const stmt = db.prepare('SELECT * FROM history WHERE id = ?');
        stmt.bind([id]);
        if (stmt.step()) existing = stmt.getAsObject();
        stmt.free();
      }

      const titleIn = body.title != null ? String(body.title).trim() : '';
      const text = body.text != null ? String(body.text) : '';
      const voice = body.voice != null ? String(body.voice) : 'af_heart';
      const useYouTube = body.useYouTubeMode ? 1 : 0;
      const createdAt = existing ? existing.created_at : body.createdAt || now;
      let title = titleIn;
      if (!title) {
        const line = text.trim().split(/\r?\n/).find((l) => l.trim()) || text.trim();
        title = line.slice(0, 72) || `Naskah ${new Date(createdAt).toLocaleString('id-ID')}`;
      }

      const updatedAt = now;
      db.run(
        `INSERT INTO history (id, title, text, voice, use_youtube, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           text = excluded.text,
           voice = excluded.voice,
           use_youtube = excluded.use_youtube,
           updated_at = excluded.updated_at`,
        [id, title, text, voice, useYouTube, createdAt, updatedAt]
      );

      trimHistory(db);
      persistDb(db, dbPath);
      res.json({ id });
    } catch (e) {
      console.error('store history save', e);
      res.status(500).json({ error: 'Gagal menyimpan naskah', details: e.message });
    }
  });

  app.delete('/api/tts/store/history/all', (req, res) => {
    try {
      db.run('DELETE FROM history');
      persistDb(db, dbPath);
      res.json({ ok: true });
    } catch (e) {
      console.error('store history clear', e);
      res.status(500).json({ error: 'Gagal mengosongkan naskah', details: e.message });
    }
  });

  app.delete('/api/tts/store/history/:id', (req, res) => {
    try {
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ error: 'id wajib' });
      }
      db.run('DELETE FROM history WHERE id = ?', [id]);
      const ok = db.getRowsModified() > 0;
      persistDb(db, dbPath);
      res.json({ ok });
    } catch (e) {
      console.error('store history delete', e);
      res.status(500).json({ error: 'Gagal menghapus naskah', details: e.message });
    }
  });

  app.get('/api/tts/store/kv/:key', (req, res) => {
    try {
      const key = decodeURIComponent(req.params.key || '');
      if (!key) return res.status(400).json({ error: 'key wajib' });
      const stmt = db.prepare('SELECT value_json FROM settings_kv WHERE key = ?');
      stmt.bind([key]);
      let row = null;
      if (stmt.step()) row = stmt.getAsObject();
      stmt.free();
      if (!row) return res.status(404).json({ error: 'not_found' });
      let value;
      try {
        value = JSON.parse(row.value_json);
      } catch (_) {
        value = row.value_json;
      }
      res.json({ key, value });
    } catch (e) {
      console.error('store kv get', e);
      res.status(500).json({ error: 'Gagal membaca pengaturan', details: e.message });
    }
  });

  app.put('/api/tts/store/kv/:key', (req, res) => {
    try {
      const key = decodeURIComponent(req.params.key || '');
      if (!key) return res.status(400).json({ error: 'key wajib' });
      const body = req.body;
      if (!Object.prototype.hasOwnProperty.call(body || {}, 'value')) {
        return res.status(400).json({ error: 'body.value wajib' });
      }
      const valueJson = JSON.stringify(body.value);
      db.run(
        `INSERT INTO settings_kv (key, value_json) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json`,
        [key, valueJson]
      );
      persistDb(db, dbPath);
      res.json({ ok: true });
    } catch (e) {
      console.error('store kv put', e);
      res.status(500).json({ error: 'Gagal menyimpan pengaturan', details: e.message });
    }
  });
}

module.exports = { registerTtsStoreRoutes };
