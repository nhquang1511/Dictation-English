import { useState, useEffect, useRef } from "react";

const levels = ["HSK1", "HSK2", "HSK3"];
const topics = ["thời gian", "gia đình", "mua sắm", "thức ăn", "địa điểm"];
const types = ["khẳng định", "phủ định", "câu hỏi"];

export default function RandomChineseSentenceApp() {
  const [level, setLevel] = useState("HSK1");
  const [topic, setTopic] = useState("");
  const [type, setType] = useState("");
  const [sentence, setSentence] = useState(null);
  const [userInput, setUserInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchSentence(true);
  }, []);

  const fetchSentence = async () => {
    setLoading(true);
    try {
      const selectedTopic = topic || topics[Math.floor(Math.random() * topics.length)];
      const selectedType = type || types[Math.floor(Math.random() * types.length)];

      const res = await fetch(
        `http://localhost:5000/random-sentence-chinese?level=${level}&topic=${encodeURIComponent(
          selectedTopic
        )}&type=${encodeURIComponent(selectedType)}`
      );
      const data = await res.json();
      setSentence(data);
      setUserInput("");
      setResult(null);
      setTopic(selectedTopic);
      setType(selectedType);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) {
      setSentence({ vi: "Không thể tải câu. Vui lòng thử lại.", zh: "", pinyin: "" });
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const normalize = (text) => text.trim().replace(/[，。！？\s]/g, "");

  const highlightDiff = (correct, user) => {
    const correctChars = correct.split("");
    const userChars = user.split("");
    return correctChars
      .map((ch, i) => {
        if (userChars[i] && normalize(userChars[i]) === normalize(ch)) {
          return `<span>${ch}</span>`;
        } else {
          return `<span style="color:red;font-weight:bold">${ch}</span>`;
        }
      })
      .join("");
  };

  const handleCheck = () => {
    const isCorrect = normalize(userInput) === normalize(sentence.zh);
    setResult({
      corrected: sentence.zh,
      is_correct: isCorrect,
      highlighted: highlightDiff(sentence.zh, userInput),
    });
    speakChinese(sentence.zh);
  };

  const speakChinese = async (text) => {
    try {
      const res = await fetch("http://localhost:5000/speak-chinese", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.audio) {
        const audio = new Audio(`http://localhost:5000/${data.audio}?t=${Date.now()}`);
        audio.play();
      }
    } catch (err) {
      alert("Không thể phát âm thanh tiếng Trung.");
    }
  };

  return (
    <div className="random-sentence-app" style={{ padding: 20 }}>
      <h2>🈶 Luyện Viết Câu Tiếng Trung</h2>

      <div className="controls" style={{ display: "flex", gap: 10, marginBottom: 15 }}>
        <select value={level} onChange={(e) => setLevel(e.target.value)}>
          {levels.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>

        <select value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="">🎲 Ngẫu nhiên chủ đề</option>
          {topics.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>

        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">🎲 Ngẫu nhiên loại câu</option>
          {types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>

        <button onClick={fetchSentence} disabled={loading}>
          {loading ? "Đang tải..." : "🔁 Câu mới"}
        </button>
      </div>

      {sentence && (
        <div className="exercise">
          <p><strong>📘 Nghĩa tiếng Việt:</strong> {sentence.vi}</p>
          <p><strong>🈷️ Pinyin:</strong> {sentence.pinyin}</p>

          <textarea
            ref={inputRef}
            rows={2}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Nhập câu tiếng Trung tại đây..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleCheck();
              }
            }}
            style={{ width: "100%", fontSize: 18, padding: 10 }}
          />

          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button onClick={handleCheck} disabled={!userInput.trim()}>
              ✅ Kiểm tra
            </button>
            <button onClick={fetchSentence}>
              ➡️ Next
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="feedback" style={{ marginTop: 15 }}>
          <p>
            <strong>✅ Câu đúng:</strong>{" "}
            <span
              dangerouslySetInnerHTML={{ __html: result.highlighted }}
              style={{ cursor: "pointer", textDecoration: "underline" }}
            />
          </p>
          {!result.is_correct && (
            <p style={{ color: "red" }}>
              ❌ Bạn đã viết chưa đúng. Hãy xem phần màu đỏ.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
