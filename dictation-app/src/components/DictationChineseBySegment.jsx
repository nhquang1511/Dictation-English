import { useEffect, useRef, useState } from "react";

export default function DictationChineseBySegment() {
    const audioRef = useRef(null);
    const [lesson, setLesson] = useState(null);
    const [step, setStep] = useState(0);
    const [input, setInput] = useState("");
    const [confirmedWords, setConfirmedWords] = useState([]);
    const [error, setError] = useState("");
    const [showTranscript, setShowTranscript] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isLooping, setIsLooping] = useState(true);
    const [isSentenceCompleted, setIsSentenceCompleted] = useState(false);

    const currentSegment = lesson?.segments?.[step];
    const transcriptWords = currentSegment?.word_translations
        ? currentSegment.word_translations.map((w) => w.word)
        : [];


    const currentIndex = confirmedWords.length;

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(true);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("http://localhost:5000/upload-china", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (data.audio && data.segments) {
                setLesson({
                    title: file.name,
                    audio: `http://localhost:5000/${data.audio}?t=${Date.now()}`,
                    segments: data.segments,
                });
                setStep(0);
                setConfirmedWords([]);
                setInput("");
                setError("");
                setShowTranscript(false);
                setIsSentenceCompleted(false);
            }
        } catch (err) {
            alert("Upload failed. Please try again.");
        }

        setLoading(false);
    };

    const handleInputChange = (e) => {
        if (isSentenceCompleted) return;

        const value = e.target.value.trim();
        setInput(value);

        const expected = transcriptWords[currentIndex]; // từ cần nhập

        // So sánh toàn bộ từ
        if (value === expected) {
            const newConfirmedWords = [...confirmedWords, expected];
            setConfirmedWords(newConfirmedWords);
            setInput("");
            setError("");

            if (newConfirmedWords.length === transcriptWords.length) {
                setIsSentenceCompleted(true);
                setIsLooping(false);
                audioRef.current?.pause();
            }
        } else {
            // Cho phép sửa lỗi mà không reset input
            setError(`❌ Sai từ "${value}". Từ đúng là: "${expected}"`);
        }
    };


    const playCurrentSegment = () => {
        if (!audioRef.current || !currentSegment) return;
        audioRef.current.currentTime = currentSegment.start;
        audioRef.current.play();

        const stopPlay = setInterval(() => {
            if (audioRef.current.currentTime >= currentSegment.end) {
                audioRef.current.pause();
                clearInterval(stopPlay);
            }
        }, 100);
    };

    const goToPreviousSegment = () => {
        if (step > 0) {
            setStep(step - 1);
            setConfirmedWords([]);
            setInput("");
            setError("");
            setIsSentenceCompleted(false);
        }
    };

    const goToNextSentence = () => {
        if (lesson && step < lesson.segments.length - 1) {
            setStep(step + 1);
            setConfirmedWords([]);
            setInput("");
            setError("");
            setIsSentenceCompleted(false);
            setIsLooping(true);
        } else {
            alert("🎉 Hoàn thành bài luyện!");
            setLesson(null);
            setStep(0);
            setConfirmedWords([]);
            setInput("");
            setError("");
            setIsSentenceCompleted(false);
            setIsLooping(true);
        }
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentSegment) return;

        if (!isSentenceCompleted) {
            audio.currentTime = currentSegment.start;
            audio.play();
        } else {
            audio.pause();
            return;
        }

        let loopInterval = setInterval(() => {
            if (audio.currentTime >= currentSegment.end) {
                if (isLooping) {
                    audio.currentTime = currentSegment.start;
                    audio.play();
                } else {
                    audio.pause();
                    clearInterval(loopInterval);
                }
            }
        }, 200);

        return () => {
            clearInterval(loopInterval);
            audio.pause();
        };
    }, [step, isLooping, currentSegment, isSentenceCompleted]);

    useEffect(() => {
        if (audioRef.current && lesson?.audio) {
            audioRef.current.load();
        }
    }, [lesson?.audio]);

    return (
        <div className="container">
            <div className="card">
                <h1>🈶 Dictation Chinese</h1>
                <p>Luyện nghe chính tả tiếng Trung (phân từ sẵn từ server)</p>

                <input
                    type="file"
                    accept="audio/mp3"
                    onChange={handleUpload}
                    className="upload-input"
                />

                {loading && <p className="loading-text">⏳ Đang xử lý...</p>}

                {!lesson && !loading ? (
                    <p className="hint">📂 Tải lên file MP3 để bắt đầu</p>
                ) : (
                    lesson && (
                        <>
                            <audio ref={audioRef} src={lesson.audio} />

                            <div className="info-box">
                                <h2>{lesson.title}</h2>
                                <p>📘 Câu {step + 1} trên {lesson.segments.length}</p>
                            </div>

                            <div className="confirmed-words">
                                {confirmedWords.map((w, i) => (
                                    <span key={i}>{w} </span>
                                ))}

                                {isSentenceCompleted && currentSegment && (
                                    <div className="completed-sentence-info">
                                        <p><strong>📖 Dịch:</strong> {currentSegment.translation}</p>
                                    </div>
                                )}
                            </div>

                            <input
                                type="text"
                                value={input}
                                onChange={handleInputChange}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        goToNextSentence();
                                    }
                                }}
                                placeholder="📝 Nhập từ kế tiếp..."
                                className="text-input"
                            />

                            {/* Hiển thị từ cần nhập + nghĩa */}
                            {currentSegment?.word_translations?.[currentIndex] && (
                                <p className="hint-word">
                                    🧐 Từ cần nhập: <strong>{currentSegment.word_translations[currentIndex].word}</strong>
                                    {" "}(<span>{currentSegment.word_translations[currentIndex].pinyin}</span>) –
                                    <em> {currentSegment.word_translations[currentIndex].vi}</em>
                                </p>
                            )}


                            <div className="button-group">
                                <button onClick={goToPreviousSegment} disabled={step === 0}>⬅️ Lui</button>
                                <button onClick={goToNextSentence} disabled={!isSentenceCompleted}>➡️ Tiếp</button>
                                <button onClick={playCurrentSegment}>🎧 Nghe</button>
                                <button onClick={() => audioRef.current?.pause()}>⏸ Dừng</button>
                                <button onClick={() => setIsLooping(!isLooping)}>
                                    {isLooping ? "🔁 Lặp lại" : "➡️ Không lặp"}
                                </button>
                                <button onClick={() => setShowTranscript(!showTranscript)}>
                                    {showTranscript ? "🙈 Ẩn" : "📖 Hiện"} bản gốc
                                </button>
                            </div>

                            {showTranscript && currentSegment && (
                                <div className="full-transcript-section">
                                    <strong>📜 Bản gốc:</strong> {currentSegment.transcript}
                                    <br />
                                    <strong>📘 Dịch:</strong> {currentSegment.translation}
                                </div>
                            )}

                            {/* Hiển thị toàn bộ từ & nghĩa khi hoàn thành */}
                            {isSentenceCompleted && currentSegment?.word_translations && (
                                <div className="word-meaning-list">
                                    <p><strong>📘 Từng từ, Pinyin & nghĩa:</strong></p>
                                    <ul>
                                        {currentSegment.word_translations.map((item, idx) => (
                                            <li key={idx}>
                                                <strong>{item.word}</strong> ({item.pinyin}): {item.vi}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}


                            {error && <p className="error">⚠️ {error}</p>}
                        </>
                    )
                )}
            </div>
        </div>
    );
}
