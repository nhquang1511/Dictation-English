import { useState, useEffect } from "react";
import "./RandomSentenceApp.css";

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
const types = [
    "khẳng định", "phủ định", "câu hỏi yes/no",
    "câu hỏi wh-", "câu hỏi đuôi", "mệnh lệnh", "câu cảm thán"
];

const topics = [
    "Hiện tại đơn", "Hiện tại tiếp diễn", "Hiện tại hoàn thành", "Hiện tại hoàn thành tiếp diễn",
    "Quá khứ đơn", "Quá khứ tiếp diễn", "Quá khứ hoàn thành", "Quá khứ hoàn thành tiếp diễn",
    "Tương lai đơn", "Tương lai tiếp diễn", "Tương lai hoàn thành", "Tương lai hoàn thành tiếp diễn",
    "Thì tương lai gần (be going to)", "Thì hiện tại đơn diễn tả tương lai",
    "Câu bị động", "Câu điều kiện loại 1", "Câu điều kiện loại 2", "Câu điều kiện loại 3",
    "Câu điều kiện hỗn hợp", "Câu gián tiếp", "Mệnh đề quan hệ", "Câu đảo ngữ",
    "Câu giả định (Subjunctive)", "Câu cảm thán", "Câu mệnh lệnh",
    "Danh từ", "Đại từ", "Tính từ", "Trạng từ", "Giới từ", "Liên từ", "Mạo từ (a/an/the)",
    "Động từ khuyết thiếu (Modal verbs)", "Cụm động từ (Phrasal verbs)",
    "Sự hòa hợp chủ vị (Subject-Verb Agreement)", "Gerund và Infinitive (V-ing và To-V)",
    "So sánh (Comparisons)", "Câu hỏi đuôi (Tag questions)", "Cấu trúc WISH",
    "Cấu trúc IT IS + ADJ + TO-V", "Cấu trúc ENOUGH/TOO", "Câu ghép (Compound Sentence)"
];

export default function RandomSentenceApp() {
    const [level, setLevel] = useState("A2");
    const [topic, setTopic] = useState("Hiện tại đơn");
    const [type, setType] = useState("khẳng định");

    const [sentence, setSentence] = useState(null);
    const [structureHint, setStructureHint] = useState("");
    const [userInput, setUserInput] = useState("");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSentence();
    }, [level, topic, type]);

    const fetchSentence = async () => {
        setLoading(true);
        try {
            const res = await fetch(
                `http://localhost:5000/random-sentence-gemini?level=${level}&topic=${encodeURIComponent(topic)}&type=${encodeURIComponent(type)}`
            );
            const data = await res.json();
            setSentence(data);
            setUserInput("");
            setResult(null);
            setStructureHint(getStructureHint(topic, type));
        } catch (err) {
            setSentence({ vi: "Không thể tải câu. Vui lòng thử lại.", en: "" });
            setResult(null);
            setStructureHint("");
        } finally {
            setLoading(false);
        }
    };

    const normalize = (text) => text.trim().toLowerCase().replace(/\s+/g, " ");

    const highlightDiff = (correct, user) => {
        const correctWords = correct.split(" ");
        const userWords = user.split(" ");
        return correctWords.map((w, i) => {
            if (userWords[i] && normalize(userWords[i]) === normalize(w)) {
                return `<span>${w}</span>`;
            } else {
                return `<span style="color:red; font-weight:bold;">${w}</span>`;
            }
        }).join(" ");
    };

    const handleCheck = () => {
        const isCorrect = normalize(userInput) === normalize(sentence.en);
        setResult({
            corrected: sentence.en,
            is_correct: isCorrect,
            highlighted: highlightDiff(sentence.en, userInput)
        });
    };

    return (
        <div className="random-sentence-app">
            <h2>Luyện Viết Câu Tiếng Anh Theo Ngữ Pháp</h2>

            <div className="controls">
                <select value={level} onChange={(e) => setLevel(e.target.value)}>
                    {levels.map(l => <option key={l}>{l}</option>)}
                </select>
                <select value={topic} onChange={(e) => setTopic(e.target.value)}>
                    {topics.map(t => <option key={t}>{t}</option>)}
                </select>
                {!(topic === "Câu hỏi đuôi" || topic === "Câu mệnh lệnh" || topic === "Câu cảm thán") && (
                    <select value={type} onChange={(e) => setType(e.target.value)}>
                        {types.map(t => <option key={t}>{t}</option>)}
                    </select>
                )}
                <button onClick={fetchSentence} disabled={loading}>
                    {loading ? "Đang tải..." : "🔁 Câu mới"}
                </button>
            </div>

            {sentence && (
                <div className="exercise">
                    <p><strong>Câu tiếng Việt:</strong> {sentence.vi}</p>
                    {structureHint && (
                        <div className="structure-hint">
                            📘 Gợi ý cấu trúc: <code>{structureHint}</code>
                        </div>
                    )}
                    <textarea
                        rows={3}
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleCheck();
                            }
                        }}
                        placeholder="Bạn hãy viết câu tiếng Anh tại đây..."
                        disabled={loading}
                    />
                    <div style={{ display: "flex", gap: "10px" }}>
                        <button onClick={handleCheck} disabled={loading || !userInput.trim()}>
                            Kiểm tra
                        </button>
                        <button onClick={fetchSentence} disabled={loading}>
                            ➡️ Next
                        </button>
                    </div>
                </div>
            )}

            {result && (
                <div className="feedback">
                    <p>
                        <strong>✅ Câu đúng:</strong>{" "}
                        <span
                            dangerouslySetInnerHTML={{ __html: result.highlighted }}
                            onClick={() => {
                                const u = new SpeechSynthesisUtterance(sentence.en);
                                u.lang = "en-US";
                                speechSynthesis.speak(u);
                            }}
                            style={{ cursor: "pointer", textDecoration: "underline" }}
                        />
                    </p>
                    {!result.is_correct && (
                        <p style={{ color: "red" }}>❌ Bạn đã viết chưa đúng. Hãy xem lại phần màu đỏ.</p>
                    )}
                </div>
            )}
        </div>
    );
}

// Dummy getStructureHint – bạn có thể chèn lại đầy đủ như trước
function getStructureHint(topic, type = "khẳng định") {
    const hints = {
        "Hiện tại đơn": {
            "khẳng định": "S + V(s/es)",
            "phủ định": "S + do/does + not + V",
            "câu hỏi yes/no": "Do/Does + S + V?",
            "câu hỏi wh-": "Wh + do/does + S + V?"
        },
        // ... bạn chèn toàn bộ danh sách gợi ý ở đây như bạn đã có
    };
    const hint = hints[topic];
    if (typeof hint === "object" && hint !== null) {
        return hint[type] || hint["khẳng định"];
    }
    return hint || "";
}
