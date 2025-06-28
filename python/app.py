import whisper
import json

model = whisper.load_model("base")
result = model.transcribe("lesson2.mp3")

segments = result["segments"]

data = [
    {
        "start": round(seg["start"], 2),
        "end": round(seg["end"], 2),
        "transcript": seg["text"].strip()
    }
    for seg in segments
]

with open("output.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("✅ Done! Saved to output.json")
