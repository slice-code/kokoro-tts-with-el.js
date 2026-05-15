// Preferensi pengguna — SQLite backend (KV reading_speed)
(function () {
  const BASE = '/api/tts/store';
  const SPEED_KV = 'reading_speed';
  const MIN = 0.5;
  const MAX = 2.0;
  const DEFAULT = 1.0;

  let cache = null;
  let readyPromise = null;

  function clamp(n) {
    const v = typeof n === 'number' ? n : parseFloat(n);
    if (!Number.isFinite(v)) return DEFAULT;
    return Math.min(MAX, Math.max(MIN, v));
  }

  async function loadCache() {
    try {
      const res = await fetch(`${BASE}/kv/${encodeURIComponent(SPEED_KV)}`);
      if (res.status === 404) {
        cache = DEFAULT;
        return;
      }
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || res.statusText);
      }
      const j = await res.json();
      const v = j.value;
      cache = v != null && Number.isFinite(Number(v)) ? clamp(Number(v)) : DEFAULT;
    } catch (e) {
      console.warn('TtsUserSettings.loadCache', e);
      cache = DEFAULT;
    }
  }

  window.TtsUserSettings = {
    /** Panggil sekali sebelum getReadingSpeed() agar nilai dari server termuat */
    ready() {
      if (!readyPromise) {
        readyPromise = loadCache().catch((e) => {
          console.warn('TtsUserSettings.ready', e);
          cache = DEFAULT;
        });
      }
      return readyPromise;
    },

    getReadingSpeed() {
      return cache != null ? cache : DEFAULT;
    },

    async setReadingSpeed(value) {
      await this.ready();
      cache = clamp(value);
      const res = await fetch(`${BASE}/kv/${encodeURIComponent(SPEED_KV)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: cache }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || res.statusText);
      }
    },

    READING_SPEED_MIN: MIN,
    READING_SPEED_MAX: MAX,
    READING_SPEED_DEFAULT: DEFAULT,
  };
})();
