# Kokoro TTS - Cara Kerja Intonasi yang Benar

## ⚠️ PENTING: Kokoro TTS Limitations

**Kokoro TTS TIDAK support:**
- ❌ SSML tags (`<break>`, `<prosody>`, `<emphasis>`)
- ❌ Stage cues (`(excited)`, `(whisper)`, `(emphasize)`)
- ❌ Asterisk emphasis (`*word*`)
- ❌ Speed/rate parameter di KPipeline

**Kokoro TTS support:**
- ✅ Punctuation-based prosody (`.`, `!`, `?`, `...`)
- ✅ Capitalization untuk emphasis
- ✅ Text formatting (spelling out acronyms)
- ✅ Speed control via audio resampling (backend)

## 🎯 Teknik yang Benar untuk Intonasi Natural

### 1. **Strategic Punctuation**

Kokoro merespon punctuation untuk mengatur rhythm:

```
Period (.)    → Brief pause
Exclamation (!) → Longer pause, higher pitch
Question (?)  → Rising intonation + pause
Ellipsis (...) → Dramatic pause
```

**Contoh:**
```
Input:  "Hello everyone! Welcome back..."
TTS:    "Hello everyone!" [pause, excited] 
        "Welcome back..." [dramatic pause]
```

### 2. **Capitalization untuk Emphasis**

Kokoro akan menekankan kata dalam CAPS:

```
Input:  "This is IMPORTANT for your project"
TTS:    "This is **IMPORTANT** for your project"
         ↑ emphasized
```

### 3. **Spelling Out Acronyms**

Untuk clarity, spell out huruf per huruf:

```
API  → "A P I"     (bukan "api")
UI   → "U I"       (bukan "ui")
URL  → "U R L"     (bukan "url")
CSS  → "C S S"     (bukan "css")
```

### 4. **Version Numbers**

```
Input:  "version 2.0"
TTS:    "version two point zero"
```

### 5. **File Extensions**

```
Input:  "layout.js"
TTS:    "layout dot js"
```

### 6. **Speed Control (Backend)**

Server sekarang support speed parameter:
- `0.8` = Slower (more dramatic)
- `1.0` = Normal
- `1.2` = Faster (more energetic)
- `1.5` = Very fast

Speed diapply via audio resampling di backend.

## 📝 Contoh Script yang Benar

### Opening YouTube:
```
Hello everyone! Welcome back to my channel.

Today we're going to learn about the A P I.
This is going to be AMAZING!

IMPORTANT: Make sure you have version 2 point 0 installed.

Let's dive in!
```

**Hasil intonasi:**
- "Hello everyone!" → excited, pause panjang
- "Welcome back to my channel." → natural flow
- "A P I" → jelas (bukan "api")
- "AMAZING!" → emphasized + pause
- "IMPORTANT:" → strong emphasis
- "version 2 point 0" → clear
- "Let's dive in!" → energetic

### Call-to-Action:
```
If you found this helpful, please SUBSCRIBE!
And don't forget to LIKE and SHARE!

COMMENT below with your questions.
```

**Hasil:**
- "SUBSCRIBE!" → emphasized
- "LIKE and SHARE!" → both emphasized
- "COMMENT" → clear call

### Technical Content:
```
First, we'll look at the C S S.
Then, we'll check the J S file.

The U I is built with layout dot js and el dot js.
This is KEY to understanding the D O M.
```

**Hasil:**
- Semua acronyms spelled out
- File extensions jadi "dot js"
- KEY emphasized
- Natural transitions

## 🔧 YouTube Mode Enhancement

Dengan YouTube Mode enabled, text otomatis di-enhance:

**Input:**
```
Hello everyone! Today we'll learn API design.
This is IMPORTANT. SUBSCRIBE for more!
```

**Enhanced (internal):**
```
Hello everyone! ... Today we'll learn A P I design.
This is IMPORTANT. ... SUBSCRIBE for more! ...
```

**Perubahan:**
- `!` → `! ...` (dramatic pause)
- `API` → `A P I` (spelled out)
- Natural pauses added

## 💡 Best Practices

### ✅ DO:
```
✓ Use punctuation strategically
✓ CAPS for important words
✓ Spell out acronyms (A P I, U I)
✓ Use "dot" for extensions (layout dot js)
✓ Write "version X point Y"
✓ Keep sentences short (15-20 words)
```

### ❌ DON'T:
```
✗ Use (excited), (whisper), etc.
✗ Use *emphasis* with asterisks
✗ Use SSML tags
✗ Long run-on sentences
✗ Leave acronyms lowercase (api, ui)
```

## 🎤 Voice Recommendations

Best voices untuk YouTube:

**Female:**
- `af_heart` - Warm, friendly (BEST)
- `af_bella` - Clear, professional
- `af_nicole` - Natural tone

**Male:**
- `am_michael` - Deep, authoritative
- `am_adam` - Energetic
- `am_liam` - Conversational

## 🎵 Speed Recommendations

**Tutorial/Educational:**
- Speed: `0.9-1.0` (slower for clarity)

**Entertainment:**
- Speed: `1.0-1.1` (natural pace)

**Quick Tips:**
- Speed: `1.1-1.2` (energetic)

## 📊 Enhancement Flow

```
User Input
    ↓
YouTube Mode Enabled?
    ↓ Yes
Remove stage cues ()  ← They would be read as text
    ↓
Add strategic pauses (!  →  ! ...)
    ↓
Spell out acronyms (API → A P I)
    ↓
Convert extensions (.js → dot js)
    ↓
Version numbers (1.2 → 1 point 2)
    ↓
Send to Kokoro TTS
    ↓
Apply speed resampling (backend)
    ↓
Natural, expressive audio!
```

## 🔍 Testing

Test script:
```
Hello everyone! Welcome back!

Today we'll learn about the A P I.
This is AMAZING and IMPORTANT!

Make sure to SUBSCRIBE!
```

Expected result:
- ✅ Natural pauses after `!`
- ✅ "A P I" clearly spoken
- ✅ "AMAZING" and "IMPORTANT" emphasized
- ✅ "SUBSCRIBE" stands out
- ✅ NOT flat or robotic

---

**Remember:** Kokoro's strength is in natural punctuation-based prosody.
Use punctuation wisely, and the results will be much better!
