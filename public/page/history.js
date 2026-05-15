// Halaman Naskah tersimpan (SQLite server: judul, teks, suara — bisa diedit)

function historyFormatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch (_) {
    return iso;
  }
}

function historySnippet(text, maxLen) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= maxLen) return t || '(kosong)';
  return t.slice(0, maxLen) + '…';
}

function historyVoiceOptions() {
  const st = window.TextToVoicePage && window.TextToVoicePage.state;
  if (st && Array.isArray(st.voices)) return st.voices;
  return [{ id: 'af_heart', name: 'AF Heart' }];
}

function historyOpenInEditor(item) {
  try {
    sessionStorage.setItem(
      'kokoro_tts_editor_prefill',
      JSON.stringify({
        historyId: item.id,
        title: item.title || '',
        text: item.text,
        voice: item.voice,
        useYouTubeMode: !!item.useYouTubeMode,
      })
    );
  } catch (e) {
    console.warn('history prefill', e);
  }
  layout.navigate('/');
}

function historyAfterMutation() {
  const onHistory = (window.location.hash.slice(1) || '/').split('?')[0] === '/history';
  if (onHistory) {
    layout.navigate('/');
    setTimeout(() => layout.navigate('/history'), 0);
  } else {
    layout.navigate('/history');
  }
}

function historyOpenEditModal(item) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:12px;';

  const labTitle = document.createElement('label');
  labTitle.textContent = 'Judul';
  labTitle.style.fontWeight = '600';
  labTitle.style.fontSize = '13px';
  const titleEl = document.createElement('input');
  titleEl.type = 'text';
  titleEl.value = item.title || '';
  titleEl.style.cssText = 'width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;box-sizing:border-box;';

  const labText = document.createElement('label');
  labText.textContent = 'Teks';
  labText.style.fontWeight = '600';
  labText.style.fontSize = '13px';
  const textEl = document.createElement('textarea');
  textEl.value = item.text || '';
  textEl.rows = 10;
  textEl.style.cssText =
    'width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-family:inherit;resize:vertical;box-sizing:border-box;';

  const labVoice = document.createElement('label');
  labVoice.textContent = 'Suara';
  labVoice.style.fontWeight = '600';
  labVoice.style.fontSize = '13px';
  const voiceSel = document.createElement('select');
  voiceSel.style.cssText = 'width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;';
  for (const v of historyVoiceOptions()) {
    const o = document.createElement('option');
    o.value = v.id;
    o.textContent = v.name || v.id;
    if (v.id === item.voice) o.selected = true;
    voiceSel.appendChild(o);
  }

  const narWrap = document.createElement('label');
  narWrap.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;';
  const nar = document.createElement('input');
  nar.type = 'checkbox';
  nar.checked = !!item.useYouTubeMode;
  narWrap.appendChild(nar);
  narWrap.appendChild(document.createTextNode(' Mode narasi (jeda ekstra)'));

  wrap.appendChild(labTitle);
  wrap.appendChild(titleEl);
  wrap.appendChild(labText);
  wrap.appendChild(textEl);
  wrap.appendChild(labVoice);
  wrap.appendChild(voiceSel);
  wrap.appendChild(narWrap);

  if (!layout.modal) {
    layout.toast('Modal tidak tersedia', { type: 'error' });
    return;
  }

  layout.modal({
    title: 'Edit naskah',
    size: 'large',
    content: wrap,
    buttons: [
      { text: 'Batal', variant: 'outline', onClick() {} },
      {
        text: 'Simpan perubahan',
        closeOnClick: false,
        onClick: async () => {
          try {
            await window.TtsHistory.save({
              id: item.id,
              title: titleEl.value,
              text: textEl.value,
              voice: voiceSel.value,
              useYouTubeMode: nar.checked,
            });
            layout.toast('Naskah diperbarui', { type: 'success', title: 'OK' });
            if (layout.closeModal) layout.closeModal();
            historyAfterMutation();
          } catch (e) {
            console.warn(e);
            layout.toast('Gagal menyimpan', { type: 'error', title: 'Error' });
          }
        },
      },
    ],
  });
}

function historyRenderPage(items) {
  const emptyHint = el('div').css({
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '15px',
  }).text('Belum ada naskah. Generate audio atau klik « Simpan naskah » di Text to Voice.');

  const cards = items.map((item) =>
    el('div').css({
      backgroundColor: '#fff',
      borderRadius: '12px',
      padding: '16px 18px',
      marginBottom: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      border: '1px solid #e5e7eb',
    }).child([
      el('h2')
        .css({
          margin: '0 0 8px 0',
          fontSize: '17px',
          fontWeight: 'bold',
          color: '#111827',
          lineHeight: 1.35,
        })
        .text(item.title || '(Tanpa judul)'),
      el('div').css({
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: '8px',
        marginBottom: '10px',
        alignItems: 'center',
      }).child([
        el('span').css({ fontSize: '12px', color: '#6b7280' }).text('Dibuat: ' + historyFormatDate(item.createdAt)),
        el('span').css({ fontSize: '12px', color: '#9ca3af' }).text(
          item.updatedAt && item.updatedAt !== item.createdAt
            ? 'Diperbarui: ' + historyFormatDate(item.updatedAt)
            : ''
        ),
        el('div').css({ display: 'flex', gap: '8px', flexWrap: 'wrap' }).child([
          el('span').css({
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '2px 8px',
            borderRadius: '6px',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
          }).text(item.voice || '—'),
          el('span').css({
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '2px 8px',
            borderRadius: '6px',
            backgroundColor: item.useYouTubeMode ? '#fee2e2' : '#d1fae5',
            color: item.useYouTubeMode ? '#b91c1c' : '#047857',
          }).text(item.useYouTubeMode ? 'Narasi' : 'Natural'),
        ]),
      ]),
      el('p').css({
        margin: '0 0 14px 0',
        fontSize: '14px',
        lineHeight: 1.5,
        color: '#1f2937',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }).text(historySnippet(item.text, 400)),
      el('div').css({ display: 'flex', flexWrap: 'wrap', gap: '10px' }).child([
        el('button')
          .css({
            padding: '8px 16px',
            backgroundColor: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
          })
          .text('Buka di Text to Voice')
          .click(() => historyOpenInEditor(item)),
        el('button')
          .css({
            padding: '8px 16px',
            backgroundColor: '#fff',
            color: '#1d4ed8',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
          })
          .text('Edit')
          .click(() => historyOpenEditModal(item)),
        el('button')
          .css({
            padding: '8px 16px',
            backgroundColor: '#fff',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
          })
          .text('Hapus')
          .click(async () => {
            let ok = false;
            try {
              ok = window.TtsHistory ? await window.TtsHistory.remove(item.id) : false;
            } catch (e) {
              console.warn('history remove', e);
            }
            if (!ok) {
              layout.toast('Gagal menghapus.', { type: 'error', title: 'Error' });
              return;
            }
            layout.toast('Naskah dihapus', { type: 'info', duration: 1500 });
            historyAfterMutation();
          }),
      ]),
    ])
  );

  const clearBtn = el('button')
    .css({
      padding: '10px 18px',
      backgroundColor: '#fff',
      color: '#991b1b',
      border: '1px solid #fecaca',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      marginBottom: '20px',
    })
    .text('Hapus semua naskah')
    .click(async () => {
      if (!items.length) return;
      if (!confirm('Hapus semua naskah tersimpan?')) return;
      let ok = false;
      try {
        ok = window.TtsHistory ? await window.TtsHistory.clear() : false;
      } catch (e) {
        console.warn('history clear', e);
      }
      if (!ok) {
        layout.toast('Gagal mengosongkan.', { type: 'error', title: 'Error' });
        return;
      }
      layout.toast('Semua naskah dihapus', { type: 'success', duration: 2000 });
      historyAfterMutation();
    });

  const header = el('div').css({ marginBottom: '24px' }).child([
    el('h1')
      .css({ fontSize: '26px', fontWeight: 'bold', marginBottom: '8px', color: '#1f2937' })
      .text('Naskah tersimpan'),
    el('p')
      .css({ color: '#6b7280', fontSize: '14px' })
      .text(
        'Judul dan teks disimpan di server (SQLite). Buka di editor untuk generate audio, atau Edit di sini. Generate/simpan dari editor memperbarui naskah yang sama bila dibuka lewat « Buka ».'
      ),
  ]);

  const body = items.length ? [clearBtn, el('div').child(cards)] : [emptyHint];

  return el('div')
    .css({
      padding: '20px',
      maxWidth: '900px',
      margin: '0 auto',
    })
    .child([header, ...body])
    .get();
}

function historyCreatePage() {
  if (!window.TtsHistory || typeof window.TtsHistory.getAll !== 'function') {
    return Promise.resolve(
      el('div')
        .css({ padding: '24px', maxWidth: '520px', margin: '0 auto', color: '#b91c1c' })
        .text('Modul naskah tidak dimuat. Muat ulang halaman.')
        .get()
    );
  }
  return window.TtsHistory
    .getAll()
    .then((items) => historyRenderPage(items))
    .catch((e) => {
      console.error('History load', e);
      return el('div')
        .css({ padding: '24px', maxWidth: '520px', margin: '0 auto', color: '#b91c1c' })
        .text('Gagal memuat naskah dari server: ' + (e && e.message ? e.message : String(e)))
        .get();
    });
}

window.HistoryPage = {
  create: historyCreatePage,
};
