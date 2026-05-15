// Penyimpanan naskah & KV pengaturan — SQLite (better-sqlite3)
'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const MAX_HISTORY_ENTRIES = 50;

function openStore(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
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
  return db;
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
  const rows = db.prepare('SELECT id FROM history ORDER BY updated_at DESC').all();
  if (rows.length <= MAX_HISTORY_ENTRIES) return;
  const drop = rows.slice(MAX_HISTORY_ENTRIES);
  const del = db.prepare('DELETE FROM history WHERE id = ?');
  const tx = db.transaction(() => {
    for (const { id } of drop) del.run(id);
  });
  tx();
}

/**
 * Pasang route REST di bawah prefix /api/tts/store
 * @param {import('express').Application} app
 * @param {{ dbPath?: string }} [opts]
 */
function registerTtsStoreRoutes(app, opts = {}) {
  const dbPath =
    opts.dbPath ||
    (process.env.TTS_SQLITE_PATH && String(process.env.TTS_SQLITE_PATH).trim()) ||
    path.join(__dirname, 'data', 'kokoro_tts.sqlite');

  const db = openStore(dbPath);

  console.log('📦 TTS store (SQLite):', dbPath);

  app.get('/api/tts/store/history', (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM history').all();
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
      const existing = db.prepare('SELECT * FROM history WHERE id = ?').get(id);

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
      db.prepare(
        `INSERT INTO history (id, title, text, voice, use_youtube, created_at, updated_at)
         VALUES (@id, @title, @text, @voice, @use_youtube, @created_at, @updated_at)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           text = excluded.text,
           voice = excluded.voice,
           use_youtube = excluded.use_youtube,
           updated_at = excluded.updated_at`
      ).run({
        id,
        title,
        text,
        voice,
        use_youtube: useYouTube,
        created_at: createdAt,
        updated_at: updatedAt,
      });

      trimHistory(db);
      res.json({ id });
    } catch (e) {
      console.error('store history save', e);
      res.status(500).json({ error: 'Gagal menyimpan naskah', details: e.message });
    }
  });

  app.delete('/api/tts/store/history/all', (req, res) => {
    try {
      db.prepare('DELETE FROM history').run();
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
      const info = db.prepare('DELETE FROM history WHERE id = ?').run(id);
      res.json({ ok: info.changes > 0 });
    } catch (e) {
      console.error('store history delete', e);
      res.status(500).json({ error: 'Gagal menghapus naskah', details: e.message });
    }
  });

  app.get('/api/tts/store/kv/:key', (req, res) => {
    try {
      const key = decodeURIComponent(req.params.key || '');
      if (!key) return res.status(400).json({ error: 'key wajib' });
      const row = db.prepare('SELECT value_json FROM settings_kv WHERE key = ?').get(key);
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
      db.prepare(
        `INSERT INTO settings_kv (key, value_json) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json`
      ).run(key, valueJson);
      res.json({ ok: true });
    } catch (e) {
      console.error('store kv put', e);
      res.status(500).json({ error: 'Gagal menyimpan pengaturan', details: e.message });
    }
  });
}

module.exports = { registerTtsStoreRoutes };
