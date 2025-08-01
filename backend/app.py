from flask import Flask, request, jsonify, send_from_directory
import whisper
import os
from flask_cors import CORS
from deep_translator import GoogleTranslator
import json
import requests
from gtts import gTTS
from opencc import OpenCC
import jieba
from pypinyin import lazy_pinyin, Style


app = Flask(__name__)
CORS(app)
UPLOAD_FOLDER = os.path.abspath(".")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

model = whisper.load_model("base")
cc = OpenCC('t2s')  # Convert Traditional to Simplified

used_sentences = set()

GEMINI_API_KEY = "AIzaSyCYp8QXdc0lRYgZ8zBPSERAU0cfTI2DI8g"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

def transcribe_audio(audio_path):
    result = model.transcribe(audio_path, language="en", task="transcribe")
    return result.get("text", "")


@app.route('/pronunciation', methods=['POST'])
def check_pronunciation():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    transcript = transcribe_audio(file_path)
    return jsonify({'transcript': transcript})

@app.route("/upload-china", methods=["POST"])
def upload_audio_chinese():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded."}), 400

    file = request.files["file"]
    filename = "uploaded_chinese.mp3"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    try:
        result = model.transcribe(filepath, language="zh")
        segments = []

        for seg in result["segments"]:
            raw_text = seg["text"].strip()
            simplified_text = cc.convert(raw_text)

            # Tách từ bằng jieba
            words = list(jieba.cut(simplified_text))

            # Dịch từng từ
            word_translations = []
            for word in words:
                try:
                    vi = GoogleTranslator(source="zh-CN", target="vi").translate(word)
                except:
                    vi = ""
                try:
                    pinyin = " ".join(lazy_pinyin(word, style=Style.TONE3))  # TONE3 có số
                except:
                    pinyin = ""
                word_translations.append({
                    "word": word,
                    "vi": vi,
                    "pinyin": pinyin
                })

            # Dịch toàn câu
            try:
                translation = GoogleTranslator(source="zh-CN", target="vi").translate(simplified_text)
            except:
                translation = ""

            segments.append({
                "start": round(seg["start"], 2),
                "end": round(seg["end"], 2),
                "transcript": simplified_text,
                "segmented": " ".join(words),
                "word_translations": word_translations,
                "translation": translation
            })

        return jsonify({
            "audio": filename,
            "segments": segments
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route("/upload", methods=["POST"])
def upload_audio_english():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded."}), 400

    file = request.files["file"]
    filename = "uploaded.mp3"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    try:
        result = model.transcribe(filepath)
        segments = []

        for seg in result["segments"]:
            text = seg["text"].strip()
            translation = GoogleTranslator(source="auto", target="vi").translate(text)

            segments.append({
                "start": round(seg["start"], 2),
                "end": round(seg["end"], 2),
                "transcript": text,
                "translation": translation
            })

        return jsonify({
            "audio": filename,
            "segments": segments
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/speak", methods=["POST"])
def speak_text():
    data = request.get_json()
    text = data.get("text", "")
    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        tts = gTTS(text, lang='en')
        output_path = os.path.join(UPLOAD_FOLDER, "output.mp3")
        tts.save(output_path)
        return jsonify({"audio": "output.mp3"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/speak-chinese", methods=["POST"])
def speak_chinese():
    data = request.get_json()
    text = data.get("text", "")
    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        output_path = os.path.join(UPLOAD_FOLDER, "output_zh.mp3")
        tts = gTTS(text, lang='zh-CN')
        tts.save(output_path)
        return jsonify({"audio": "output_zh.mp3"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/random-sentence-gemini", methods=["GET"])
def get_sentence_from_gemini():
    global used_sentences
    level = request.args.get("level", "A2")
    topic = request.args.get("topic", "chia thì")
    type_ = request.args.get("type", "khẳng định")

    prompt = f"""
    Hãy tạo ra một câu tiếng Việt đơn giản theo trình độ {level}, áp dụng đúng ngữ pháp dạng "{topic}", và là một câu {type_}.
    Sau đó dịch sang tiếng Anh chính xác. Sử dụng Anh-Mỹ
    KHÔNG được trùng với các câu sau:
    {list(used_sentences)}

    Trả lời đúng định dạng JSON (chỉ JSON, không thêm gì khác):
    {{
      "vi": "câu tiếng việt",
      "en": "câu tiếng anh tương ứng"
    }}
    """

    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    try:
        res = requests.post(GEMINI_URL, json=payload)
        res.raise_for_status()
        response_text = res.json()["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(response_text)
        used_sentences.add(parsed["vi"])
        return jsonify(parsed)

    except Exception as e:
        return jsonify({"error": f"Lỗi: {str(e)}"}), 500


@app.route("/random-sentence-chinese", methods=["GET"])
def get_sentence_in_chinese():
    global used_sentences
    level = request.args.get("level", "HSK1")
    topic = request.args.get("topic", "thời gian")
    type_ = request.args.get("type", "khẳng định")

    prompt = f"""
    Hãy tạo một câu đơn giản bằng **tiếng Trung giản thể**, phù hợp trình độ {level}, thuộc chủ đề "{topic}", và có dạng câu {type_}.
    Sau đó:
    - Dịch chính xác sang **tiếng Việt**
    - Ghi thêm **phiên âm Pinyin** đầy đủ của câu tiếng Trung.

    KHÔNG được trùng với các câu sau:
    {list(used_sentences)}

    Trả lời đúng định dạng JSON (chỉ JSON, không thêm gì khác):
    {{
      "zh": "câu tiếng Trung",
      "vi": "nghĩa tiếng Việt tương ứng",
      "pinyin": "phiên âm Pinyin của câu"
    }}
    """

    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    try:
        res = requests.post(GEMINI_URL, json=payload)
        res.raise_for_status()
        response_text = res.json()["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(response_text)
        used_sentences.add(parsed["zh"])
        return jsonify(parsed)

    except Exception as e:
        return jsonify({"error": f"Lỗi: {str(e)}"}), 500


@app.route("/grammar-check", methods=["POST"])
def grammar_check():
    data = request.get_json()
    user_en = data.get("user_en", "")
    correct_en = data.get("correct_en", "")

    prompt = f"""
    So sánh 2 câu tiếng Anh sau:
    - Câu học viên viết: "{user_en}"
    - Câu đúng: "{correct_en}"

    Nhận xét học viên viết sai ở đâu, sửa lại, và cho lời khuyên ngắn nếu cần.

    Trả lời đúng định dạng JSON:
    {{
      "corrected": "Câu học viên nên viết lại",
      "explanation": "Giải thích ngắn gọn lỗi sai ngữ pháp hoặc từ vựng."
    }}
    """

    gemini_payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "text/plain"
        }
    }

    try:
        res = requests.post(GEMINI_URL, json=gemini_payload)
        res.raise_for_status()
        response_text = res.json()["candidates"][0]["content"]["parts"][0]["text"]

        start = response_text.find("{")
        end = response_text.rfind("}") + 1
        json_str = response_text[start:end]
        parsed = json.loads(json_str)
        return jsonify(parsed)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/<path:filename>")
def serve_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


if __name__ == "__main__":
    app.run(port=5000, debug=True)
