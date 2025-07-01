import { useState, useEffect } from "react";

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
const topics = ["chia thì", "câu điều kiện", "câu bị động", "mệnh đề quan hệ", "trạng từ", "so sánh", "câu gián tiếp"];

export default function RandomSentenceApp() {
    const [sentence, setSentence] = useState(null);
    const [userInput, setUserInput] = useState("");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [level, setLevel] = useState("A2");
    const [topic, setTopic] = useState("chia thì");

    const fetchSentence = async () => {
        const res = await fetch(`http://localhost:5000/random-sentence-gemini?level=${level}&topic=${topic}`);
        const data = await res.json();
        setSentence(data);
        setUserInput("");
        setResult(null);
    };

    useEffect(() => {
        fetchSentence();
    }, [level, topic]);

    const handleCheck = async () => {
        setLoading(true);
        const res = await fetch("http://localhost:5000/grammar-check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_en: userInput,
                correct_en: sentence.en
            })
        });
        const data = await res.json();
        setResult(data);
        setLoading(false);
    };

    return (
        <div style={{ maxWidth: 600, margin: "auto", fontFamily: "Arial" }}>
            <h2>Bài luyện dịch câu tiếng Anh</h2>

            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <select value={level} onChange={(e) => setLevel(e.target.value)}>
                    {levels.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
                </select>
                <select value={topic} onChange={(e) => setTopic(e.target.value)}>
                    {topics.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <button onClick={fetchSentence}>Tải lại câu</button>
            </div>

            {sentence && (
                <>
                    <p><strong>Dịch câu sau:</strong> {sentence.vi}</p>
                    <textarea
                        rows={3}
                        style={{ width: "100%" }}
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Nhập câu tiếng Anh bạn dịch..."
                    />
                    <button onClick={handleCheck} disabled={loading}>
                        {loading ? "Đang kiểm tra..." : "Kiểm tra"}
                    </button>
                </>
            )}

            {result && (
                <div style={{ marginTop: 20 }}>
                    <p><strong>✅ Câu đúng:</strong> {sentence.en}</p>
                    <p><strong>🛠 Sửa lại:</strong> {result.corrected}</p>
                    <p><strong>📘 Giải thích:</strong> {result.explanation}</p>
                </div>
            )}
        </div>
    );
}
