from flask import Flask, request, jsonify, send_from_directory
import whisper
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.path.abspath(".")  # thư mục hiện tại
model = whisper.load_model("base")

@app.route("/upload", methods=["POST"])
def upload_audio():
    file = request.files["file"]
    filename = "uploaded.mp3"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    result = model.transcribe(filepath)
    segments = [
        {
            "start": round(seg["start"], 2),
            "end": round(seg["end"], 2),
            "transcript": seg["text"].strip()
        }
        for seg in result["segments"]
    ]

    return jsonify({
        "audio": filename,
        "segments": segments
    })

@app.route("/<path:filename>")
def serve_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == "__main__":
    app.run(port=5000, debug=True)