from flask import Flask, jsonify,request
from flask_cors import CORS
import requests
import json

app = Flask(__name__)
CORS(app)

used_sentences = set()  # Lưu các câu đã tạo

GEMINI_API_KEY = "AIzaSyCYp8QXdc0lRYgZ8zBPSERAU0cfTI2DI8g"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

@app.route("/random-sentence-gemini", methods=["GET"])
def get_sentence_from_gemini():
    global used_sentences
    level = request.args.get("level", "A2")
    topic = request.args.get("topic", "chia thì")

    prompt = f"""
    Hãy tạo ra một câu tiếng Việt đơn giản theo trình độ {level}, áp dụng đúng ngữ pháp dạng "{topic}", rồi dịch sang tiếng Anh.
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



if __name__ == "__main__":
    app.run(port=5000, debug=True)
