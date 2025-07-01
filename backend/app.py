from flask import Flask, request, jsonify, send_from_directory
import whisper
import os
from flask_cors import CORS
from deep_translator import GoogleTranslator

app = Flask(__name__)
CORS(app)
UPLOAD_FOLDER = os.path.abspath(".")
model = whisper.load_model("base")

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