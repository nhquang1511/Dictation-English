from flask import Flask, request, jsonify, send_from_directory
import whisper
import os
from flask_cors import CORS
from deep_translator import GoogleTranslator
import json
import requests

app = Flask(__name__)
CORS(app)
UPLOAD_FOLDER = os.path.abspath(".")
model = whisper.load_model("base")

used_sentences = set()  # Lưu các câu đã tạo
GEMINI_API_KEY = "AIzaSyCalatN9u9CxsYXFI2z5QTiCWhBgulg9nk"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

@app.route("/random-sentence-gemini", methods=["GET"])
def get_sentence_from_gemini():
    global used_sentences
    level = request.args.get("level", "A2")
    topic = request.args.get("topic", "chia thì")
    type_ = request.args.get("type", "khẳng định")  # mặc định là khẳng định

    prompt = f"""
    Hãy tạo ra một câu tiếng Việt đơn giản theo trình độ {level}, áp dụng đúng ngữ pháp dạng "{topic}", và là một câu {type_}.
    Sau đó dịch sang tiếng Anh chính xác, được phép viết tắc giống người bản xứ.
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
        text = res.json()["candidates"][0]["content"]["parts"][0]["text"]

        parsed = json.loads(text)
        used_sentences.add(parsed["vi"])
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

        text = res.json()["candidates"][0]["content"]["parts"][0]["text"]

        # Cắt chuỗi JSON từ kết quả
        start = text.find("{")
        end = text.rfind("}") + 1
        json_str = text[start:end]

        parsed = json.loads(json_str)
        return jsonify(parsed)

    except json.JSONDecodeError as je:
        return jsonify({"error": f"Lỗi giải mã JSON từ Gemini: {je}. Nội dung: {text}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500




@app.route("/upload", methods=["POST"])
def upload_audio():
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

        return jsonify({"audio": filename, "segments": segments})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/<path:filename>")
def serve_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == "__main__":
    app.run(port=5000, debug=True)