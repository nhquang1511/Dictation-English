import { useState, useEffect } from "react";
import "./RandomSentenceApp.css";

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

// Danh sách chủ đề ngữ pháp đã được mở rộng và chi tiết hóa
const topics = [
    // 1. Thì (Tenses)
    "Hiện tại đơn",
    "Hiện tại tiếp diễn",
    "Hiện tại hoàn thành",
    "Hiện tại hoàn thành tiếp diễn",
    "Quá khứ đơn",
    "Quá khứ tiếp diễn",
    "Quá khứ hoàn thành",
    "Quá khứ hoàn thành tiếp diễn",
    "Tương lai đơn",
    "Tương lai tiếp diễn",
    "Tương lai hoàn thành",
    "Tương lai hoàn thành tiếp diễn",
    "Thì tương lai gần (be going to)",
    "Thì hiện tại đơn diễn tả tương lai",

    // 2. Loại câu & Cấu trúc đặc biệt (Sentence Types & Special Structures)
    "Câu bị động",
    "Câu điều kiện loại 1",
    "Câu điều kiện loại 2",
    "Câu điều kiện loại 3",
    "Câu điều kiện hỗn hợp",
    "Câu gián tiếp",
    "Mệnh đề quan hệ",
    "Câu đảo ngữ",
    "Câu giả định (Subjunctive)",
    "Câu cảm thán",
    "Câu mệnh lệnh",

    // 3. Các loại từ & Chức năng (Parts of Speech & Functions)
    "Danh từ",
    "Đại từ",
    "Tính từ",
    "Trạng từ",
    "Giới từ", // Cần lưu ý khó tạo gợi ý cấu trúc tổng quát
    "Liên từ",
    "Mạo từ (a/an/the)",
    "Động từ khuyết thiếu (Modal verbs)",
    "Cụm động từ (Phrasal verbs)",

    // 4. Các điểm ngữ pháp khác (Other Grammar Points)
    "Sự hòa hợp chủ vị (Subject-Verb Agreement)",
    "Gerund và Infinitive (V-ing và To-V)",
    "So sánh (Comparisons)",
    "Câu hỏi đuôi (Tag questions)",
    "Cấu trúc WISH",
    "Cấu trúc IT IS + ADJ + TO-V",
    "Cấu trúc ENOUGH/TOO",
    "Câu ghép (Compound Sentence)"
];

const types = [
    "khẳng định",
    "phủ định",
    "câu hỏi yes/no",
    "câu hỏi wh-",
    "câu hỏi đuôi", // Đặc biệt hơn, có thể không áp dụng cho tất cả topic
    "mệnh lệnh", // Đặc biệt hơn
    "câu cảm thán" // Đặc biệt hơn
];


export default function RandomSentenceApp() {
    const [level, setLevel] = useState("A2");
    const [topic, setTopic] = useState("Hiện tại đơn"); // Cập nhật topic mặc định
    const [type, setType] = useState("khẳng định");

    const [sentence, setSentence] = useState(null);
    const [structureHint, setStructureHint] = useState("");
    const [userInput, setUserInput] = useState("");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchSentence = async () => {
        setLoading(true); // Bắt đầu loading
        try {
            // Đảm bảo topic và type được truyền đúng cách cho backend
            const res = await fetch(
                `http://localhost:5000/random-sentence-gemini?level=${level}&topic=${encodeURIComponent(topic)}&type=${encodeURIComponent(type)}`
            );
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const data = await res.json();
            setSentence(data);
            setUserInput("");
            setResult(null);

            // Tạo gợi ý cấu trúc dựa trên topic và type đã chọn
            const structure = getStructureHint(topic, type);
            setStructureHint(structure);
        } catch (error) {
            console.error("Error fetching sentence:", error);
            setSentence({ vi: "Không thể tải câu. Vui lòng thử lại.", en: "" });
            setStructureHint("");
            setResult(null);
        } finally {
            setLoading(false); // Kết thúc loading
        }
    };

    // `useEffect` này sẽ chạy mỗi khi `level`, `topic`, `type` thay đổi
    useEffect(() => {
        fetchSentence();
    }, [level, topic, type]);

    const handleCheck = () => {
        setResult({
            corrected: sentence.en,
            is_correct: userInput.trim().toLowerCase() === sentence.en.trim().toLowerCase()
        });
    };


    return (
        <div className="random-sentence-app">
            <h2>Luyện Viết Câu Tiếng Anh Theo Ngữ Pháp</h2>

            <div className="controls">
                <select value={level} onChange={(e) => setLevel(e.target.value)}>
                    {levels.map((l) => <option key={l}>{l}</option>)}
                </select>
                <select value={topic} onChange={(e) => setTopic(e.target.value)}>
                    {topics.map((t) => (
                        <option key={t} value={t}>
                            {t}
                        </option>
                    ))}
                </select>
                {/* Chỉ hiển thị selector type nếu topic không phải là "câu hỏi đuôi" hoặc "câu mệnh lệnh"
                    vì chúng đã ngầm định loại câu */}
                {!(topic === "Câu hỏi đuôi" || topic === "Câu mệnh lệnh" || topic === "Câu cảm thán") && (
                    <select value={type} onChange={(e) => setType(e.target.value)}>
                        {types.map((t) => <option key={t}>{t}</option>)}
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
                            <p>📘 Gợi ý cấu trúc: <code>{structureHint}</code></p>
                            {/* Bạn có thể thêm tooltip hoặc popup hiển thị giải thích chi tiết hơn khi click vào đây */}
                        </div>
                    )}
                    <textarea
                        rows={3}
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault(); // Ngăn xuống dòng
                                handleCheck();      // Gọi hàm kiểm tra
                            }
                        }}
                        placeholder="Bạn hãy viết câu tiếng Anh tại đây..."
                        disabled={loading}
                    />

                    <div style={{ display: "flex", gap: "10px" }}>
                        <button onClick={handleCheck} disabled={loading || !userInput.trim()}>
                            {loading ? "Đang kiểm tra..." : "Kiểm tra"}
                        </button>
                        <button onClick={fetchSentence} disabled={loading}>
                            {loading ? "Đang tải..." : "➡️ Next"}
                        </button>
                    </div>

                </div>
            )}

            {result && (
                <div className="feedback">
                    <p><strong>✅ Câu đúng:</strong> {sentence.en}</p>
                </div>
            )}
        </div>
    );
}

// Hàm gợi ý cấu trúc dựa trên topic VÀ loại câu
function getStructureHint(topic, type = "khẳng định") {
    const hints = {
        // 1. Thì (Tenses)
        "Hiện tại đơn": {
            "khẳng định": "S + V(s/es)",
            "phủ định": "S + do/does + not + V(nguyên mẫu)",
            "câu hỏi yes/no": "Do/Does + S + V(nguyên mẫu)?",
            "câu hỏi wh-": "Wh-word + do/does + S + V(nguyên mẫu)?",
        },
        "Hiện tại tiếp diễn": {
            "khẳng định": "S + am/is/are + V-ing",
            "phủ định": "S + am/is/are + not + V-ing",
            "câu hỏi yes/no": "Am/Is/Are + S + V-ing?",
            "câu hỏi wh-": "Wh-word + am/is/are + S + V-ing?",
        },
        "Hiện tại hoàn thành": {
            "khẳng định": "S + have/has + V3/ed",
            "phủ định": "S + have/has + not + V3/ed",
            "câu hỏi yes/no": "Have/Has + S + V3/ed?",
            "câu hỏi wh-": "Wh-word + have/has + S + V3/ed?",
        },
        "Hiện tại hoàn thành tiếp diễn": {
            "khẳng định": "S + have/has + been + V-ing",
            "phủ định": "S + have/has + not + been + V-ing",
            "câu hỏi yes/no": "Have/Has + S + been + V-ing?",
            "câu hỏi wh-": "Wh-word + have/has + S + been + V-ing?",
        },
        "Quá khứ đơn": {
            "khẳng định": "S + V2/ed",
            "phủ định": "S + did + not + V(nguyên mẫu)",
            "câu hỏi yes/no": "Did + S + V(nguyên mẫu)?",
            "câu hỏi wh-": "Wh-word + did + S + V(nguyên mẫu)?",
        },
        "Quá khứ tiếp diễn": {
            "khẳng định": "S + was/were + V-ing",
            "phủ định": "S + was/were + not + V-ing",
            "câu hỏi yes/no": "Was/Were + S + V-ing?",
            "câu hỏi wh-": "Wh-word + was/were + S + V-ing?",
        },
        "Quá khứ hoàn thành": {
            "khẳng định": "S + had + V3/ed",
            "phủ định": "S + had + not + V3/ed",
            "câu hỏi yes/no": "Had + S + V3/ed?",
            "câu hỏi wh-": "Wh-word + had + S + V3/ed?",
        },
        "Quá khứ hoàn thành tiếp diễn": {
            "khẳng định": "S + had + been + V-ing",
            "phủ định": "S + had + not + been + V-ing",
            "câu hỏi yes/no": "Had + S + been + V-ing?",
            "câu hỏi wh-": "Wh-word + had + S + been + V-ing?",
        },
        "Tương lai đơn": {
            "khẳng định": "S + will + V(nguyên mẫu)",
            "phủ định": "S + will + not + V(nguyên mẫu)",
            "câu hỏi yes/no": "Will + S + V(nguyên mẫu)?",
            "câu hỏi wh-": "Wh-word + will + S + V(nguyên mẫu)?",
        },
        "Tương lai tiếp diễn": {
            "khẳng định": "S + will + be + V-ing",
            "phủ định": "S + will + not + be + V-ing",
            "câu hỏi yes/no": "Will + S + be + V-ing?",
            "câu hỏi wh-": "Wh-word + will + S + be + V-ing?",
        },
        "Tương lai hoàn thành": {
            "khẳng định": "S + will + have + V3/ed",
            "phủ định": "S + will + not + have + V3/ed",
            "câu hỏi yes/no": "Will + S + have + V3/ed?",
            "câu hỏi wh-": "Wh-word + will + S + have + V3/ed?",
        },
        "Tương lai hoàn thành tiếp diễn": {
            "khẳng định": "S + will + have + been + V-ing",
            "phủ định": "S + will + not + have + been + V-ing",
            "câu hỏi yes/no": "Will + S + have + been + V-ing?",
            "câu hỏi wh-": "Wh-word + will + S + have + been + V-ing?",
        },
        "Thì tương lai gần (be going to)": {
            "khẳng định": "S + am/is/are + going to + V(nguyên mẫu)",
            "phủ định": "S + am/is/are + not + going to + V(nguyên mẫu)",
            "câu hỏi yes/no": "Am/Is/Are + S + going to + V(nguyên mẫu)?",
            "câu hỏi wh-": "Wh-word + am/is/are + S + going to + V(nguyên mẫu)?",
        },
        "Câu ghép (Compound Sentence)": {
            "khẳng định": "MĐĐL 1, [FANBOYS](For, And, Nor, But, Or, Yet, So.) MĐĐL 2. Hoặc: MĐĐL 1; MĐĐL 2. Hoặc: MĐĐL 1; [adv liên kết], MĐĐL 2.",
            "phủ định": "Tương tự khẳng định, nhưng thêm 'not' vào MĐĐL. Ví dụ: S + don't/doesn't + V.",
            "câu hỏi yes/no": "Trợ động từ + S + V..., [FANBOYS] S + V...?", // Có thể phức tạp hơn
            "câu hỏi wh-": "Wh-word + trợ động từ + S + V..., [FANBOYS] S + V...?", // Có thể phức tạp hơn
            // Câu hỏi đuôi, mệnh lệnh, cảm thán thường không áp dụng cho toàn bộ câu ghép
        },
        "Thì hiện tại đơn diễn tả tương lai": "S + V(s/es) (dùng cho lịch trình, thời khóa biểu cố định)",

        // 2. Loại câu & Cấu trúc đặc biệt
        "Câu bị động": "S + be (chia thì) + V3/ed + (by O)",
        "Câu điều kiện loại 1": "If + S + V(hiện tại đơn), S + will/can/may + V(nguyên mẫu)",
        "Câu điều kiện loại 2": "If + S + V(quá khứ đơn/were), S + would/could/might + V(nguyên mẫu)",
        "Câu điều kiện loại 3": "If + S + had + V3/ed, S + would/could/might + have + V3/ed",
        "Câu điều kiện hỗn hợp": "Kết hợp If loại 3 và Mệnh đề chính loại 2, hoặc ngược lại.",
        "Câu gián tiếp": "S + said/told (that) + S + V (lùi thì, đổi đại từ, trạng từ)",
        "Mệnh đề quan hệ": "S + V... (Noun) + who/which/that/whose/where/when/why + S + V...",
        "Câu đảo ngữ": "Trạng từ/cụm từ phủ định (Never, Hardly, Not only...) + Trợ động từ + S + V...",
        "Câu giả định (Subjunctive)": "It's important/necessary that S + V(nguyên mẫu) / S + suggest/demand that S + V(nguyên mẫu) / S + would rather + S + V(quá khứ đơn)",
        "Câu cảm thán": "What + (a/an) + adj + Noun! hoặc How + adj/adv + S + V!",
        "Câu mệnh lệnh": "V(nguyên mẫu)... (khẳng định) / Don't + V(nguyên mẫu)... (phủ định)",

        // 3. Các loại từ & Chức năng
        "Danh từ": "Danh từ (Noun): chỉ người, vật, sự việc, ý tưởng. (S + V + N)",
        "Đại từ": "Đại từ (Pronoun): thay thế danh từ (I, you, he, she, it, we, they; me, him, her; mine, yours...).",
        "Tính từ": "Tính từ (Adjective): bổ nghĩa cho danh từ (adj + N) hoặc sau to be/linking verbs (S + be/linking verb + adj).",
        "Trạng từ": "Trạng từ (Adverb): bổ nghĩa cho động từ, tính từ, trạng từ khác (V + adv / adv + adj / adv + adv).",
        "Giới từ": "Giới từ (Preposition): chỉ vị trí, thời gian, cách thức (in, on, at, with, by, for...).",
        "Liên từ": "Liên từ (Conjunction): nối các từ, cụm từ, mệnh đề (and, but, or, so, because, although, if...).",
        "Mạo từ (a/an/the)": "a/an: dùng trước danh từ đếm được số ít chưa xác định; the: dùng khi danh từ đã xác định.",
        "Động từ khuyết thiếu (Modal verbs)": "S + modal verb (can/could/may/might/must/should/will/would) + V(nguyên mẫu).",
        "Cụm động từ (Phrasal verbs)": "Động từ + giới từ/trạng từ (ví dụ: look for, turn off, give up, take off).",

        // 4. Các điểm ngữ pháp khác
        "Sự hòa hợp chủ vị (Subject-Verb Agreement)": "Chủ ngữ số ít -> Động từ số ít; Chủ ngữ số nhiều -> Động từ số nhiều.",
        "Gerund và Infinitive (V-ing và To-V)": "Gerund (V-ing): sau giới từ/một số động từ; Infinitive (To-V): sau một số động từ/để chỉ mục đích.",
        "So sánh (Comparisons)": "So sánh bằng: as + adj/adv + as; So sánh hơn: adj-er/more adj + than; So sánh nhất: the + adj-est/most adj.",
        "Câu hỏi đuôi (Tag questions)": "Mệnh đề chính (khẳng định), trợ động từ + S (phủ định)? / Mệnh đề chính (phủ định), trợ động từ + S (khẳng định)?",
        "Cấu trúc WISH": "S + wish + S + V(lùi thì) - (hiện tại: quá khứ đơn, quá khứ: quá khứ hoàn thành).",
        "Cấu trúc IT IS + ADJ + TO-V": "It is + tính từ + (for someone) + to + V(nguyên mẫu).",
        "Cấu trúc ENOUGH/TOO": "adj/adv + enough + to-V / too + adj/adv + to-V.",
    };

    // Lấy gợi ý cấu trúc
    let hint = hints[topic];

    // Nếu hint là một đối tượng (có các loại câu con), truy cập theo 'type'
    if (typeof hint === 'object' && hint !== null) {
        return hint[type] || hint["khẳng định"] || "Không có gợi ý cấu trúc cụ thể cho loại câu này.";
    }
    // Nếu hint chỉ là một chuỗi (không có các loại câu con)
    return hint || "Không có gợi ý cấu trúc cụ thể.";
}