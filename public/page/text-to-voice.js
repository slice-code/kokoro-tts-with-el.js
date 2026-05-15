// Text-to-Voice page using Kokoro TTS

const TextToVoiceState = {
  text: '',
  selectedVoice: 'af_heart',
  isGenerating: false,
  audioUrl: null,
  connector: {},
  activeTab: 'text', // 'text' or 'file'
  jsFileContent: '',
  selectedFile: null,
  savedDraftTitle: '',
  /** Set saat buka naskah dari halaman Naskah — generate/simpan memperbarui entri yang sama */
  lastSavedHistoryId: null,
  // false = percakapan natural (default); true = jeda/lebih teatral untuk narasi
  useYouTubeMode: false,
  voices: [
    // Urutan atas: disarankan untuk narasi / channel YouTube (en-US), berdasarkan grade Kokoro VOICES.md
    { id: 'af_heart', name: 'AF Heart (Female US)', lang: 'en-US', youtubeNote: 'Grade A — netral, cocok intro & voice-over' },
    { id: 'af_bella', name: 'AF Bella (Female US)', lang: 'en-US', youtubeNote: 'Grade A− — jelas & energik (tutorial)' },
    { id: 'af_nicole', name: 'AF Nicole (Female US)', lang: 'en-US', youtubeNote: 'Grade B− — cocok gaya podcast' },
    { id: 'af_aoede', name: 'AF Aoede (Female US)', lang: 'en-US', youtubeNote: 'Grade C+ — alternatif wanita' },
    { id: 'af_kore', name: 'AF Kore (Female US)', lang: 'en-US', youtubeNote: 'Grade C+ — alternatif wanita' },
    { id: 'af_sarah', name: 'AF Sarah (Female US)', lang: 'en-US', youtubeNote: 'Grade C+ — alternatif wanita' },
    { id: 'am_michael', name: 'AM Michael (Male US)', lang: 'en-US', youtubeNote: 'Grade C+ — narator pria' },
    { id: 'am_fenrir', name: 'AM Fenrir (Male US)', lang: 'en-US', youtubeNote: 'Grade C+ — narator pria' },
    { id: 'am_puck', name: 'AM Puck (Male US)', lang: 'en-US', youtubeNote: 'Grade C+ — narator pria' },
    { id: 'af_alloy', name: 'AF Alloy (Female US)', lang: 'en-US' },
    { id: 'af_jessica', name: 'AF Jessica (Female US)', lang: 'en-US' },
    { id: 'af_nova', name: 'AF Nova (Female US)', lang: 'en-US' },
    { id: 'af_river', name: 'AF River (Female US)', lang: 'en-US' },
    { id: 'af_sky', name: 'AF Sky (Female US)', lang: 'en-US' },
    { id: 'am_adam', name: 'AM Adam (Male US)', lang: 'en-US' },
    { id: 'am_echo', name: 'AM Echo (Male US)', lang: 'en-US' },
    { id: 'am_eric', name: 'AM Eric (Male US)', lang: 'en-US' },
    { id: 'am_liam', name: 'AM Liam (Male US)', lang: 'en-US' },
    { id: 'am_onyx', name: 'AM Onyx (Male US)', lang: 'en-US' },
    { id: 'am_santa', name: 'AM Santa (Male US)', lang: 'en-US' },
  ]
};

function ttsPersistHistorySnapshot() {
  if (!window.TtsHistory || typeof window.TtsHistory.save !== 'function') {
    return Promise.resolve();
  }
  return window.TtsHistory
    .save({
      id: TextToVoiceState.lastSavedHistoryId || undefined,
      title: (TextToVoiceState.savedDraftTitle || '').trim() || undefined,
      text: TextToVoiceState.text,
      voice: TextToVoiceState.selectedVoice,
      useYouTubeMode: TextToVoiceState.useYouTubeMode,
    })
    .then((res) => {
      if (res && res.id) {
        TextToVoiceState.lastSavedHistoryId = res.id;
      }
    })
    .catch((e) => console.warn('TtsHistory.save', e));
}

function ttsSaveDraftToHistory() {
  if (!TextToVoiceState.text.trim()) {
    layout.toast('Isi teks terlebih dahulu', { type: 'warning', title: 'Kosong' });
    return;
  }
  ttsPersistHistorySnapshot().then(() => {
    layout.toast('Naskah tersimpan di server', { type: 'success', title: 'Tersimpan' });
  });
}

function ttsGenerateAudio() {
  if (!TextToVoiceState.text.trim()) {
    layout.toast('Please enter some text', { type: 'warning', title: 'Warning' });
    return;
  }

  if (TextToVoiceState.isGenerating) {
    layout.toast('Already generating, please wait...', { type: 'info' });
    return;
  }

  TextToVoiceState.isGenerating = true;
  ttsUpdateUI();

  // Show loading
  el(TextToVoiceState.connector.generateBtn).disabled(true).get();
  if (TextToVoiceState.connector.saveDraftBtn) {
    el(TextToVoiceState.connector.saveDraftBtn).disabled(true).get();
  }
  el(TextToVoiceState.connector.statusBadge).text('Generating...').css({ backgroundColor: '#f59e0b' }).get();

  // Prepare text for TTS (convert .js to "dot js" etc.)
  const textForTTS = ttsPrepareTextForTTS();

  const settingsReady =
    window.TtsUserSettings && typeof window.TtsUserSettings.ready === 'function'
      ? window.TtsUserSettings.ready()
      : Promise.resolve();

  settingsReady
    .then(() =>
      fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textForTTS,
          voice: TextToVoiceState.selectedVoice,
          speed: window.TtsUserSettings ? window.TtsUserSettings.getReadingSpeed() : 1.0,
        }),
      })
    )
    .then((response) => {
      if (!response.ok) throw new Error('Failed to generate audio');
      return response.blob();
    })
    .then((blob) => {
      if (TextToVoiceState.audioUrl) URL.revokeObjectURL(TextToVoiceState.audioUrl);
      TextToVoiceState.audioUrl = URL.createObjectURL(blob);

      el(TextToVoiceState.connector.audioPlayer).attr('src', TextToVoiceState.audioUrl).get();
      el(TextToVoiceState.connector.audioSection).css({ display: 'block' }).get();
      el(TextToVoiceState.connector.statusBadge).text('Ready').css({ backgroundColor: '#16a34a' }).get();

      layout.toast('Audio generated successfully!', { type: 'success', title: 'Success' });

      return ttsPersistHistorySnapshot();
    })
    .catch((error) => {
      console.error('TTS Error:', error);
      el(TextToVoiceState.connector.statusBadge).text('Error').css({ backgroundColor: '#dc2626' }).get();
      layout.toast('Failed to generate audio: ' + error.message, { type: 'error', title: 'Error' });
    })
    .finally(() => {
      TextToVoiceState.isGenerating = false;
      ttsUpdateUI();
    });
}

function ttsUpdateUI() {
  const charCount = TextToVoiceState.text.length;
  el(TextToVoiceState.connector.charCount).text(`${charCount} characters`).get();
  
  if (!TextToVoiceState.isGenerating) {
    el(TextToVoiceState.connector.generateBtn).disabled(false).get();
    if (TextToVoiceState.connector.saveDraftBtn) {
      el(TextToVoiceState.connector.saveDraftBtn).disabled(false).get();
    }
    if (!TextToVoiceState.audioUrl) {
      el(TextToVoiceState.connector.statusBadge).text('Ready').css({ backgroundColor: '#2563eb' }).get();
    }
  }
}

function ttsHandleTextChange(value) {
  TextToVoiceState.text = value;
  ttsUpdateUI();
}

function ttsConvertDotToWord(text) {
  // Convert file extension dots to spoken word "dot"
  // But NOT dots in acronyms (A. P. I.) or ellipsis (...)
  return text
    // Match file extensions like .js, .py, etc. (dot followed by 2+ letters)
    .replace(/\.([a-zA-Z]{2,})(\s|$|\.|,|!|\?)/g, ' dot $1$2')
    // Specific patterns for common files (handle before general rule)
    .replace(/node\.js/gi, 'node dot js')
    .replace(/express\.js/gi, 'express dot js')
    .replace(/react\.js/gi, 'react dot js')
    .replace(/vue\.js/gi, 'vue dot js')
    .replace(/layout\.js/gi, 'layout dot js')
    .replace(/el\.js/gi, 'el dot js')
    // Don't touch single letter dots (A. B. C.) or triple dots (...)
    ;
}

// Singkatan umum agar pelafalan jelas (dipakai mode natural & narasi)
function ttsExpandTechnicalTerms(text) {
  let enhanced = text;
  if (!/\bA\.\s*P\.\s*I\./i.test(enhanced)) {
    enhanced = enhanced.replace(/\bAPI\b/g, 'A. P. I.');
  }
  if (!/\bU\.\s*I\./i.test(enhanced)) {
    enhanced = enhanced.replace(/\bUI\b/g, 'U. I.');
  }
  if (!/\bU\.\s*R\.\s*L\./i.test(enhanced)) {
    enhanced = enhanced.replace(/\bURL\b/g, 'U. R. L.');
  }
  if (!/\bH\.\s*T\.\s*T\.\s*P\./i.test(enhanced)) {
    enhanced = enhanced.replace(/\bHTTP\b/g, 'H. T. T. P.');
  }
  if (!/\bC\.\s*S\.\s*S\./i.test(enhanced)) {
    enhanced = enhanced.replace(/\bCSS\b/g, 'C. S. S.');
  }
  if (!/\bJ\.\s*S\./i.test(enhanced)) {
    enhanced = enhanced.replace(/\bJS\b/g, 'J. S.');
  }
  if (!/\bD\.\s*O\.\s*M\./i.test(enhanced)) {
    enhanced = enhanced.replace(/\bDOM\b/g, 'D. O. M.');
  }
  if (!/\bI\.\s*D\./i.test(enhanced)) {
    enhanced = enhanced.replace(/\bID\b/g, 'I. D.');
  }
  // Hanya "version X.Y" agar angka desimal lain (3.14, IP) tidak rusak
  enhanced = enhanced.replace(/\b([Vv]ersion)\s+(\d+)\.(\d+)\b/g, '$1 $2 point $3');
  return enhanced;
}

// Mode default: minim sentuhan — biarkan tanda baca user & split baris Kokoro bekerja
function ttsEnhanceNatural(text) {
  if (!text || !text.trim()) {
    return text;
  }
  let t = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  t = t.replace(/\n{3,}/g, '\n\n');
  t = t
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').replace(/\s+$/g, ''))
    .join('\n');
  t = t.trim();
  t = t.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d\u201e]/g, '"');
  t = t.replace(/[–—]/g, ', ');
  t = ttsExpandTechnicalTerms(t);
  return t;
}

function ttsEnhanceForYouTube(text) {
  // Narasi: jeda lewat baris baru (KPipeline memecah teks di \n+) — lebih halus daripada "...."
  let enhanced = text;

  // Hapus arahan dalam kurung / markdown emphasis yang akan dibaca mentah
  enhanced = enhanced.replace(/\([^)]+\)/g, '');
  enhanced = enhanced.replace(/\*([^*]+)\*/g, '$1');

  enhanced = ttsExpandTechnicalTerms(enhanced);

  enhanced = enhanced.replace(/!/g, '!\n\n');
  enhanced = enhanced.replace(/\?/g, '?\n\n');
  enhanced = enhanced.replace(/\.(\s+)/g, '.\n$1');

  enhanced = enhanced.replace(/\n(However|But|Now|So|And|Because|Therefore)\b/g, '\n\n$1,');
  enhanced = enhanced.replace(/\n(First|Next|Then|Finally)\b/g, '\n\n$1,');
  enhanced = enhanced.replace(/\n(IMPORTANT|NOTE|REMEMBER|WARNING)\b/g, '\n\n$1:');

  enhanced = enhanced.replace(/ {2,}/g, ' ').trim();
  return enhanced;
}

function ttsPrepareTextForTTS() {
  if (!TextToVoiceState.text.trim()) {
    return '';
  }
  
  let processedText = TextToVoiceState.text;
  
  // First, convert file extensions (.js → dot js) BEFORE YouTube enhancement
  // This prevents conflicts with acronym dots
  const isCode = /(\.js|\.py|\.html|\.css|function|const|let|var|=>)/i.test(processedText);
  
  if (isCode) {
    processedText = ttsConvertDotToWord(processedText);
  }
  
  if (TextToVoiceState.useYouTubeMode) {
    processedText = ttsEnhanceForYouTube(processedText);
  } else {
    processedText = ttsEnhanceNatural(processedText);
  }
  
  return processedText;
}

// Muat naskah dari halaman Naskah (sessionStorage) sebelum DOM dibangun
function ttsConsumeEditorPrefillIfAny() {
  let raw = null;
  try {
    raw = sessionStorage.getItem('kokoro_tts_editor_prefill');
  } catch (_) {
    return;
  }
  if (!raw) {
    TextToVoiceState.lastSavedHistoryId = null;
    TextToVoiceState.savedDraftTitle = '';
    return;
  }
  try {
    sessionStorage.removeItem('kokoro_tts_editor_prefill');
  } catch (_) {}
  try {
    const p = JSON.parse(raw);
    if (typeof p.text === 'string') {
      TextToVoiceState.text = p.text;
    }
    if (typeof p.voice === 'string' && p.voice) {
      TextToVoiceState.selectedVoice = p.voice;
    }
    if (typeof p.useYouTubeMode === 'boolean') {
      TextToVoiceState.useYouTubeMode = p.useYouTubeMode;
    }
    if (typeof p.title === 'string') {
      TextToVoiceState.savedDraftTitle = p.title;
    } else {
      TextToVoiceState.savedDraftTitle = '';
    }
    if (typeof p.historyId === 'string' && p.historyId) {
      TextToVoiceState.lastSavedHistoryId = p.historyId;
    } else {
      TextToVoiceState.lastSavedHistoryId = null;
    }
    if (TextToVoiceState.audioUrl) {
      try {
        URL.revokeObjectURL(TextToVoiceState.audioUrl);
      } catch (_) {}
      TextToVoiceState.audioUrl = null;
    }
  } catch (_) {
    TextToVoiceState.lastSavedHistoryId = null;
  }
}

function ttsHandleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.name.endsWith('.js')) {
    layout.toast('Please select a .js file', { type: 'warning', title: 'Invalid File' });
    return;
  }

  TextToVoiceState.selectedFile = file;
  const reader = new FileReader();
  
  reader.onload = function(e) {
    TextToVoiceState.jsFileContent = e.target.result;
    TextToVoiceState.text = e.target.result;
    
    // Update file display
    if (TextToVoiceState.connector.fileContentDisplay) {
      el(TextToVoiceState.connector.fileContentDisplay).text(e.target.result).get();
    }
    
    // Update file name badge
    if (TextToVoiceState.connector.fileNameBadge) {
      el(TextToVoiceState.connector.fileNameBadge).text(`📄 ${file.name} (${(file.size / 1024).toFixed(2)} KB)`).get();
    }
    
    layout.toast(`File "${file.name}" loaded successfully!`, { type: 'success' });
  };
  
  reader.onerror = function() {
    layout.toast('Failed to read file', { type: 'error' });
  };
  
  reader.readAsText(file);
}

function ttsSwitchTab(tab) {
  TextToVoiceState.activeTab = tab;
  
  // Update tab buttons
  const textTabBtn = TextToVoiceState.connector.textTabBtn;
  const fileTabBtn = TextToVoiceState.connector.fileTabBtn;
  
  if (tab === 'text') {
    el(textTabBtn).css({
      backgroundColor: '#2563eb',
      color: '#fff',
      borderBottom: 'none'
    }).get();
    el(fileTabBtn).css({
      backgroundColor: '#f3f4f6',
      color: '#6b7280',
      borderBottom: '1px solid #e5e7eb'
    }).get();
    
    // Show text tab, hide file tab
    el(TextToVoiceState.connector.textTabContent).css({ display: 'block' }).get();
    el(TextToVoiceState.connector.fileTabContent).css({ display: 'none' }).get();
  } else {
    el(fileTabBtn).css({
      backgroundColor: '#2563eb',
      color: '#fff',
      borderBottom: 'none'
    }).get();
    el(textTabBtn).css({
      backgroundColor: '#f3f4f6',
      color: '#6b7280',
      borderBottom: '1px solid #e5e7eb'
    }).get();
    
    // Show file tab, hide text tab
    el(TextToVoiceState.connector.fileTabContent).css({ display: 'block' }).get();
    el(TextToVoiceState.connector.textTabContent).css({ display: 'none' }).get();
  }
}

function ttsHandleVoiceChange(voiceId) {
  TextToVoiceState.selectedVoice = voiceId;
  el(TextToVoiceState.connector.selectedVoiceBadge).text(voiceId).get();
}

function ttsDownloadAudio() {
  if (!TextToVoiceState.audioUrl) {
    layout.toast('No audio to download', { type: 'warning' });
    return;
  }

  const a = document.createElement('a');
  a.href = TextToVoiceState.audioUrl;
  a.download = `tts_${TextToVoiceState.selectedVoice}_${Date.now()}.wav`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  layout.toast('Audio downloaded!', { type: 'success' });
}

function ttsRenderVoiceList() {
  return TextToVoiceState.voices.map((voice) => {
    const isSelected = voice.id === TextToVoiceState.selectedVoice;
    const children = [
      el('div').css({ fontWeight: isSelected ? 'bold' : 'normal', marginBottom: '4px' }).text(voice.name),
      el('div').css({ fontSize: '12px', color: '#6b7280' }).text(voice.lang),
    ];
    if (voice.youtubeNote) {
      children.push(
        el('div')
          .css({ fontSize: '11px', color: '#047857', marginTop: '6px', lineHeight: 1.35 })
          .text('▸ ' + voice.youtubeNote)
      );
    }
    return el('div')
      .css({
        padding: '10px',
        margin: '4px 0',
        borderRadius: '8px',
        border: isSelected ? '2px solid #2563eb' : '1px solid #e5e7eb',
        backgroundColor: isSelected ? '#eff6ff' : '#fff',
        cursor: 'pointer',
        transition: 'all 0.2s',
      })
      .click(() => {
        ttsHandleVoiceChange(voice.id);
        ttsRefreshVoiceList();
      })
      .child(children);
  });
}

function ttsRefreshVoiceList() {
  const vl = TextToVoiceState.connector.voiceList;
  if (vl) {
    el(vl).empty().child(ttsRenderVoiceList()).get();
  }
}

function ttsBuildPageDom() {
  ttsConsumeEditorPrefillIfAny();

  const root = el('div').css({
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  }).child([
    // Header
    el('div').css({ marginBottom: '30px' }).child([
      el('h1').css({ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', color: '#1f2937' })
        .text('🎙️ Text to Voice'),
      el('p').css({ color: '#6b7280', fontSize: '14px' })
        .text('Conversational by default; turn on Narration for stronger pauses between lines.'),
      el('p').css({ fontSize: '13px', color: '#6b7280', marginTop: '8px' }).child([
        el('span').text('Kecepatan membaca: '),
        el('span').css({ fontWeight: 'bold', color: '#2563eb' }).text(
          (window.TtsUserSettings ? window.TtsUserSettings.getReadingSpeed().toFixed(2) : '1.00') + '×'
        ),
        el('span').text(' · '),
        el('span')
          .css({ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' })
          .text('Ubah di Pengaturan')
          .click(() => layout.navigate('/settings')),
      ]),
    ]),

    // Main content grid
    el('div').css({
      display: 'grid',
      gridTemplateColumns: '1fr 300px',
      gap: '20px',
    }).child([
      // Left column - Text input
      el('div').child([
        // Text input card
        el('div').css({
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '20px',
        }).child([
          el('div').css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }).child([
            el('label').css({ fontWeight: 'bold', fontSize: '16px', color: '#374151' }).text('Input Text'),
            el('div').css({ display: 'flex', alignItems: 'center', gap: '12px' }).child([
              // YouTube mode toggle
              el('label').css({ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: '#6b7280' }).child([
                el('input')
                  .link(TextToVoiceState.connector, 'narrationCheckbox')
                  .attr('type', 'checkbox')
                  .attr('checked', TextToVoiceState.useYouTubeMode ? 'true' : null)
                  .change((e) => {
                    TextToVoiceState.useYouTubeMode = e.target.checked;
                    layout.toast(TextToVoiceState.useYouTubeMode ? 'Narration mode on' : 'Natural mode on', { 
                      type: 'info', 
                      duration: 1500 
                    });
                  }),
                el('span').text('Narasi')
              ]),
              el('span').link(TextToVoiceState.connector, 'charCount').css({ fontSize: '12px', color: '#6b7280' }).text('0 characters')
            ])
          ]),
          el('div').css({ marginBottom: '12px' }).child([
            el('label')
              .css({ display: 'block', fontWeight: '600', fontSize: '13px', color: '#374151', marginBottom: '6px' })
              .text('Judul naskah'),
            el('input')
              .link(TextToVoiceState.connector, 'draftTitleInput')
              .attr('type', 'text')
              .attr('placeholder', 'Contoh: Intro Minggu #5 — tersimpan ke Naskah')
              .css({
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
              })
              .input((e) => {
                TextToVoiceState.savedDraftTitle = e.target.value;
              }),
            el('p').css({ fontSize: '11px', color: '#9ca3af', marginTop: '6px', marginBottom: 0 }).text(
              'Kosongkan judul = pakai baris pertama teks sebagai judul otomatis. Tombol « Simpan naskah » menyimpan tanpa generate.'
            ),
          ]),
          el('textarea')
            .link(TextToVoiceState.connector, 'textArea')
            .css({
              width: '100%',
              minHeight: '300px',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box',
            })
            .attr('placeholder', 'Enter text to convert to speech...\n\nExample: Hello, welcome to the Kokoro Text-to-Speech system!')
            .input((e) => {
              ttsHandleTextChange(e.target.value);
            }),
          
          // Status and action bar
          el('div').css({
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid #e5e7eb',
          }).child([
            el('div').css({ display: 'flex', alignItems: 'center', gap: '8px' }).child([
              el('span').css({ fontSize: '14px', color: '#6b7280' }).text('Status:'),
              el('span').link(TextToVoiceState.connector, 'statusBadge').css({
                padding: '4px 12px',
                borderRadius: '12px',
                backgroundColor: '#2563eb',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 'bold',
              }).text('Ready'),
              TextToVoiceState.useYouTubeMode ? 
                el('span').css({
                  padding: '4px 8px',
                  borderRadius: '8px',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }).text('Narasi') :
                el('span').css({
                  padding: '4px 8px',
                  borderRadius: '8px',
                  backgroundColor: '#059669',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }).text('Natural')
            ]),
            el('div').css({ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'flex-end' }).child([
            el('button')
              .link(TextToVoiceState.connector, 'saveDraftBtn')
              .css({
                padding: '12px 20px',
                backgroundColor: '#fff',
                color: '#047857',
                border: '1px solid #6ee7b7',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
              })
              .text('💾 Simpan naskah')
              .click(ttsSaveDraftToHistory),
            el('button')
              .link(TextToVoiceState.connector, 'generateBtn')
              .css({
                padding: '12px 32px',
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s',
              })
              .hover(
                function() { el(this).css({ backgroundColor: '#1d4ed8' }).get(); },
                function() { el(this).css({ backgroundColor: '#2563eb' }).get(); }
              )
              .text('🎵 Generate Audio')
              .click(ttsGenerateAudio)
            ])
          ]),
        ]),

        // Audio player card
        el('div').link(TextToVoiceState.connector, 'audioSection').css({
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          display: 'none',
        }).child([
          el('div').css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }).child([
            el('label').css({ fontWeight: 'bold', fontSize: '16px', color: '#374151' }).text('🔊 Audio Output'),
            el('button')
              .css({
                padding: '8px 16px',
                backgroundColor: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
              })
              .text('⬇ Download')
              .click(ttsDownloadAudio)
          ]),
          el('audio')
            .link(TextToVoiceState.connector, 'audioPlayer')
            .css({
              width: '100%',
              borderRadius: '8px',
            })
            .attr('controls', 'true')
        ])
      ]),

      // Right column - Voice selector
      el('div').child([
        el('div').css({
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }).child([
          el('div').css({ marginBottom: '12px' }).child([
            el('label').css({ fontWeight: 'bold', fontSize: '16px', color: '#374151', marginBottom: '8px', display: 'block' })
              .text('🎤 Voice'),
            el('div').css({
              fontSize: '11px',
              color: '#166534',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '8px 10px',
              marginBottom: '10px',
              lineHeight: 1.45,
            }).text(
              'Channel YouTube (bahasa Inggris AS): mulai dari daftar atas (grade Kokoro tertinggi). Aktifkan Narasi + kecepatan di Pengaturan. Suara UK (bf_/bm_) belum dipakai di server ini (perlu lang_code British).'
            ),
            el('div').css({ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }).child([
              el('span').css({ fontSize: '12px', color: '#6b7280' }).text('Selected:'),
              el('span').link(TextToVoiceState.connector, 'selectedVoiceBadge').css({
                padding: '2px 8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
              }).text(TextToVoiceState.selectedVoice)
            ])
          ]),
          el('div').link(TextToVoiceState.connector, 'voiceList').css({
            maxHeight: '500px',
            overflowY: 'auto',
          }).child(ttsRenderVoiceList())
        ])
      ])
    ])
  ]).get();

  const ta = TextToVoiceState.connector.textArea;
  if (ta) {
    ta.value = TextToVoiceState.text;
  }
  const narCb = TextToVoiceState.connector.narrationCheckbox;
  if (narCb) {
    narCb.checked = TextToVoiceState.useYouTubeMode;
  }
  const titleInp = TextToVoiceState.connector.draftTitleInput;
  if (titleInp) {
    titleInp.value = TextToVoiceState.savedDraftTitle || '';
  }
  ttsUpdateUI();
  ttsRefreshVoiceList();

  return root;
}

function ttsCreatePage() {
  const wait =
    window.TtsUserSettings && typeof window.TtsUserSettings.ready === 'function'
      ? window.TtsUserSettings.ready()
      : Promise.resolve();
  return wait.then(() => ttsBuildPageDom());
}

// Make it globally available
window.TextToVoicePage = {
  create: ttsCreatePage,
  state: TextToVoiceState
};
