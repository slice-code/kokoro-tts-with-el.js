// Halaman pengaturan (kecepatan membaca TTS)

const SettingsPageConnector = {};

function settingsFormatSpeed(v) {
  return clampSpeed(v).toFixed(2) + '×';
}

function clampSpeed(v) {
  const n = parseFloat(v);
  if (!Number.isFinite(n)) {
    return window.TtsUserSettings ? window.TtsUserSettings.READING_SPEED_DEFAULT : 1.0;
  }
  const ts = window.TtsUserSettings;
  if (!ts) {
    return Math.min(2, Math.max(0.5, n));
  }
  return Math.min(ts.READING_SPEED_MAX, Math.max(ts.READING_SPEED_MIN, n));
}

async function settingsApplySpeedToUI(value) {
  const v = clampSpeed(value);
  try {
    if (window.TtsUserSettings && window.TtsUserSettings.setReadingSpeed) {
      await window.TtsUserSettings.setReadingSpeed(v);
    }
  } catch (e) {
    console.warn('settingsApplySpeedToUI', e);
  }
  const rangeEl = SettingsPageConnector.speedRange;
  const labelEl = SettingsPageConnector.speedLabel;
  if (rangeEl) rangeEl.value = String(v);
  if (labelEl) el(labelEl).text(settingsFormatSpeed(v)).get();
}

function settingsCreatePage() {
  if (!window.TtsUserSettings) {
    return Promise.resolve(
      el('div')
        .css({ padding: '24px', maxWidth: '480px', margin: '0 auto', color: '#b91c1c' })
        .text('Modul pengaturan tidak dimuat. Muat ulang halaman.')
        .get()
    );
  }

  return window.TtsUserSettings.ready().then(() => {
    const initial = window.TtsUserSettings.getReadingSpeed();

  const presets = [
    { label: 'Pelan', value: 0.75 },
    { label: 'Normal', value: 1.0 },
    { label: 'Cepat', value: 1.25 },
    { label: 'Sangat cepat', value: 1.5 },
  ];

  const presetButtons = presets.map((p) =>
    el('button')
      .css({
        padding: '8px 14px',
        backgroundColor: '#f3f4f6',
        color: '#374151',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
      })
      .text(p.label + ' (' + p.value + '×)')
      .click(() => {
        void settingsApplySpeedToUI(p.value);
      })
  );

  return el('div')
    .css({
      padding: '20px',
      maxWidth: '640px',
      margin: '0 auto',
    })
    .child([
      el('div').css({ marginBottom: '28px' }).child([
        el('h1')
          .css({ fontSize: '26px', fontWeight: 'bold', marginBottom: '8px', color: '#1f2937' })
          .text('Pengaturan'),
        el('p')
          .css({ color: '#6b7280', fontSize: '14px' })
          .text('Kecepatan membaca memengaruhi sintesis Kokoro (bukan hanya pemutar audio).'),
      ]),

      el('div').css({
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '22px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb',
      }).child([
        el('h2')
          .css({ fontSize: '18px', fontWeight: 'bold', marginBottom: '6px', color: '#111827' })
          .text('Kecepatan membaca'),
        el('p')
          .css({ fontSize: '13px', color: '#6b7280', marginBottom: '16px' })
          .text('Rentang 0,5× (lebih lambat) sampai 2× (lebih cepat). Disimpan di server (SQLite).'),

        el('div').css({
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          marginBottom: '14px',
          flexWrap: 'wrap',
        }).child([
          el('span')
            .link(SettingsPageConnector, 'speedLabel')
            .css({
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#2563eb',
              minWidth: '72px',
            })
            .text(settingsFormatSpeed(initial)),
          el('input')
            .link(SettingsPageConnector, 'speedRange')
            .attr('type', 'range')
            .attr('min', String(window.TtsUserSettings.READING_SPEED_MIN))
            .attr('max', String(window.TtsUserSettings.READING_SPEED_MAX))
            .attr('step', '0.05')
            .attr('value', String(initial))
            .css({ flex: '1', minWidth: '180px', cursor: 'pointer' })
            .input((e) => {
              void settingsApplySpeedToUI(e.target.value);
            }),
        ]),

        el('p')
          .css({ fontSize: '12px', color: '#9ca3af', marginBottom: '16px' })
          .text('Ujung slider: 0,5× (kiri) — 2× (kanan). Perubahan langsung tersimpan.'),

        el('div').css({ fontSize: '13px', color: '#4b5563', marginBottom: '10px', fontWeight: '600' }).text('Preset:'),
        el('div').css({ display: 'flex', flexWrap: 'wrap', gap: '8px' }).child(presetButtons),
      ]),
    ])
    .get();
  });
}

window.SettingsPage = {
  create: settingsCreatePage,
};
