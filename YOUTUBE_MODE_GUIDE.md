# YouTube Intonation Mode - Panduan Penggunaan

## 🎬 Apa itu YouTube Mode?

YouTube Mode adalah fitur yang mengoptimalkan intonasi TTS Kokoro untuk konten YouTube dengan:
- ✅ Pause yang lebih natural
- ✅ Penekanan pada kata-kata penting
- ✅ Intonasi yang lebih dramatis
- ✅ Call-to-action yang lebih jelas

## 🎯 Fitur Intonasi

### 1. **Strategic Pauses**
```
Input:  "Welcome to my channel! Today we'll learn something amazing..."
Output: "Welcome to my channel! ... Today we'll learn something amazing! ..."
```
- Setelah `!` → pause dramatis
- Setelah `?` → pause lebih lama
- Setelah `...` → pause natural

### 2. **Emphasis on Important Words**
```
Input:  "This is IMPORTANT. Remember to SUBSCRIBE!"
Output: "This is *IMPORTANT*. Remember to *SUBSCRIBE*!"
```
Kata-kata yang di-emphasize:
- IMPORTANT, CRUCIAL, KEY, REMEMBER, NOTE
- SUBSCRIBE, LIKE, SHARE, COMMENT

### 3. **Better Greetings**
```
Input:  "Hi everyone, welcome back"
Output: "Hi! everyone, welcome back!"
```

### 4. **Transition Words**
```
Input:  "The code works. However, there's a better way"
Output: "The code works. However, there's a better way"
```
Transition words: However, But, Now, So, And, Because, Therefore, Moreover

## 📝 Contoh Script YouTube

### Tech Tutorial:
```
Hi everyone! Welcome back to my channel.

Today we're going to learn about layout dot js and el dot js. 
This is IMPORTANT for building modern web applications.

First, let's install the dependencies. 
However, before we do that, make sure you have Node dot js installed.

Now, let's dive into the code!

[Code explanation...]

If you found this helpful, please LIKE and SUBSCRIBE!
Share this video with your friends.

Thanks for watching, and I'll see you in the next video!
```

### Coding Tutorial dengan File Names:
```
Welcome! Today we'll work with these files:

- server dot js - backend API
- index dot html - main page  
- layout dot js - UI framework
- text-to-voice dot js - TTS feature

IMPORTANT: Make sure to install express dot js first!

Now let's look at the code. 
[Show code...]

Remember to SUBSCRIBE for more tutorials!
```

## 🎤 Best Voices untuk YouTube

### Female Voices:
- `af_heart` - Warm & friendly (recommended)
- `af_bella` - Clear & professional
- `af_nicole` - Natural tone

### Male Voices:
- `am_michael` - Deep & authoritative
- `am_adam` - Clear & energetic
- `am_liam` - Friendly tone

## 💡 Tips untuk YouTube

1. **Use Punctuation**
   - `!` untuk excitement
   - `?` untuk questions
   - `...` untuk dramatic pause
   - `,` untuk brief pause

2. **Capitalization**
   - IMPORTANT words in CAPS
   - Call-to-action in CAPS (SUBSCRIBE, LIKE)

3. **Structure**
   - Greeting dengan `!`
   - Pause antara sections
   - Clear call-to-action di akhir

4. **File Names**
   - Otomatis convert `.js` → `dot js`
   - Tidak perlu manual edit

## 🎬 Enable/Disable YouTube Mode

Toggle checkbox "🎬 YouTube" di atas textarea:
- ✅ **ON** - Enhanced intonation (default)
- ⬜ **OFF** - Normal text-to-speech

## 🔥 Contoh Full Script

```markdown
Hey everyone! Welcome back to the channel.

Today we're building an amazing Text-to-Speech app using Kokoro TTS.
This is going to be CRUCIAL for your projects!

First, we need to install kokoro and soundfile.
However, before that, make sure you have Python installed.

Now let's look at the code:

[Show server.js code...]

See how layout dot js works with el dot js?
This is KEY to understanding the architecture.

IMPORTANT points to remember:
- Always use virtual environments
- Install dependencies first
- Test your code

If you learned something new, please:
1. LIKE this video
2. SUBSCRIBE to the channel
3. SHARE with friends
4. COMMENT below!

Thanks for watching, and I'll see you next time!
```

## 🎵 Hasil Audio

Dengan YouTube Mode, audio akan terdengar:
- ✅ Lebih natural dan engaging
- ✅ Pause di tempat yang tepat
- ✅ Emphasis pada kata penting
- ✅ Perfect untuk tutorial & narration

Tanpa YouTube Mode:
- ⬜ Flat intonation
- ⬜ No dramatic pauses
- ⬜ Less engaging

---

**Note:** YouTube Mode aktif secara default. Toggle off jika ingin normal TTS.
