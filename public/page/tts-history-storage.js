// Naskah tersimpan — SQLite di backend (HTTP)
(function () {
  const BASE = '/api/tts/store';

  function newId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return String(Date.now()) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function defaultTitle(text, createdIso) {
    const t = (text || '').trim();
    if (t) {
      const line = t.split(/\r?\n/).find((l) => l.trim()) || t;
      const s = line.trim().slice(0, 72);
      if (s) return s;
    }
    try {
      const d = new Date(createdIso || Date.now());
      return 'Naskah ' + d.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
    } catch (_) {
      return 'Tanpa judul';
    }
  }

  async function apiJson(method, url, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_) {
      data = { _raw: text };
    }
    if (!res.ok) {
      const msg =
        (data && (data.error || data.details)) ||
        (typeof data === 'string' ? data : text) ||
        res.statusText;
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    return data;
  }

  async function historyGetAllRaw() {
    const data = await apiJson('GET', `${BASE}/history`);
    return Array.isArray(data.items) ? data.items : [];
  }

  window.TtsHistory = {
    async getAll() {
      const rows = await historyGetAllRaw();
      const out = [];
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        if (!row.id) {
          row.id = newId();
        }
        let needSave = false;
        if (!row.title) {
          row.title = defaultTitle(row.text, row.createdAt);
          needSave = true;
        }
        if (!row.updatedAt) {
          row.updatedAt = row.createdAt || new Date().toISOString();
          needSave = true;
        }
        if (needSave) {
          await apiJson('POST', `${BASE}/history`, {
            id: row.id,
            title: row.title,
            text: row.text,
            voice: row.voice,
            useYouTubeMode: !!row.useYouTubeMode,
            createdAt: row.createdAt,
          });
        }
        out.push(row);
      }
      out.sort((a, b) => {
        const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return tb - ta;
      });
      return out;
    },

    /**
     * Simpan atau perbarui naskah. Tanpa entry.id → buat baru. Kembalikan { id }.
     */
    async save(entry) {
      const now = new Date().toISOString();
      const all = await historyGetAllRaw();
      const existing = entry.id ? all.find((x) => x && x.id === entry.id) : null;

      const titleIn = entry.title != null ? String(entry.title).trim() : '';
      const row = {
        id: entry.id || newId(),
        title: titleIn || defaultTitle(entry.text, entry.createdAt || existing?.createdAt || now),
        text: entry.text != null ? String(entry.text) : '',
        voice: entry.voice || 'af_heart',
        useYouTubeMode: !!entry.useYouTubeMode,
        createdAt: existing ? existing.createdAt : entry.createdAt || now,
        updatedAt: now,
      };

      await apiJson('POST', `${BASE}/history`, {
        id: row.id,
        title: row.title,
        text: row.text,
        voice: row.voice,
        useYouTubeMode: row.useYouTubeMode,
        createdAt: row.createdAt,
      });
      return { id: row.id };
    },

    /** Alias: simpan entri baru (tanpa id) */
    async add(entry) {
      return this.save({ ...entry, id: undefined });
    },

    async remove(id) {
      if (id == null || id === '') return false;
      const all = await historyGetAllRaw();
      if (!all.some((x) => x && x.id === id)) return false;
      const data = await apiJson('DELETE', `${BASE}/history/${encodeURIComponent(id)}`);
      return !!(data && data.ok);
    },

    async clear() {
      await apiJson('DELETE', `${BASE}/history/all`);
      return true;
    },
  };
})();
