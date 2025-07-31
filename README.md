# 🎧 Dictation Practice App

An application for practicing listening, transcription, and pronunciation with audio clips. Supports both English and Chinese.

[![Watch the video](https://img.youtube.com/vi/UVinGkDrT5Y/maxresdefault.jpg)](https://www.youtube.com/watch?v=UVinGkDrT5Y)


---

## 💡 Key Features

### ✍️ Listening & Transcription Practice
- Plays audio sentence-by-sentence.
- Users type what they hear, with real-time spelling correction.
- Shows Vietnamese translation after each sentence is completed.
- Automatically repeats the sentence until it's typed correctly.

### 🎙 Pronunciation Check
- Records user's speech.
- Uses Whisper for speech recognition.
- Compares user’s speech with the original sentence and gives accuracy feedback.

### 💬 Translation & Language Support
- Translates each sentence into Vietnamese.
- For Chinese: provides Pinyin and word-by-word meaning.

---

## 🚀 Tech Stack

### Frontend (React)
- `React Hooks`: `useState`, `useEffect`, `useRef`
- Simple and intuitive UI.
- Communicates with backend using `fetch`.

### Backend (Flask)
- `Whisper`: for speech recognition.
- `gTTS`: converts text to speech.
- `GoogleTranslator`: translates words/sentences.
- `Gemini API`: generates random sentences based on grammar level.
- `jieba`, `pypinyin`, `opencc`: for Chinese text processing.

---

## ⚙️ Installation

### 1. Backend (Flask)

#### ✅ Requirements
- Python 3.8+
- FFmpeg (required by Whisper)
- Virtual environment (recommended)

#### 🔧 Setup
```bash
pip install -r requirements.txt
python app.py


