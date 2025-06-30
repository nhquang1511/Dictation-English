import { useEffect, useRef, useState } from "react";

export default function DictationBySegment() {
    const audioRef = useRef(null);
    const [lesson, setLesson] = useState(null);
    const [step, setStep] = useState(0);
    const [input, setInput] = useState("");
    const [confirmedWords, setConfirmedWords] = useState([]);
    const [error, setError] = useState("");
    const [showTranscript, setShowTranscript] = useState(false); // Vẫn giữ để bật/tắt hiển thị chung
    const [loading, setLoading] = useState(false);
    const [isLooping, setIsLooping] = useState(true);
    const [isSentenceCompleted, setIsSentenceCompleted] = useState(false); // Trạng thái mới để kiểm soát việc hoàn thành câu

    const pauseAudio = () => {
        if (audioRef.current) audioRef.current.pause();
    };

    const currentSegment = lesson?.segments?.[step];

    const normalize = (text) =>
        text.toLowerCase().replace(/[.,!?]/g, "").replace(/\s+/g, " ").trim();

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("http://localhost:5000/upload", {
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
                setIsSentenceCompleted(false); // Reset trạng thái hoàn thành câu
            }
        } catch (err) {
            alert("Upload failed. Please try again.");
        }

        setLoading(false);
    };

    const transcriptWords = currentSegment
        ? normalize(currentSegment.transcript).split(/\s+/)
        : [];

    const currentIndex = confirmedWords.length;

    const handleInputChange = (e) => {
        if (isSentenceCompleted) return; // Không cho phép gõ khi câu đã hoàn thành

        const value = e.target.value;
        const expected = transcriptWords[currentIndex];
        const normalizedValue = normalize(value);

        if (value === "") {
            setInput("");
            return;
        }

        if (normalizedValue === expected) {
            const newConfirmedWords = [...confirmedWords, expected];
            setConfirmedWords(newConfirmedWords);
            setInput("");
            setError("");

            // Kiểm tra nếu đã gõ đúng hết tất cả các từ của câu
            if (newConfirmedWords.length === transcriptWords.length) {
                setIsSentenceCompleted(true); // Đặt trạng thái câu đã hoàn thành
                // Dừng vòng lặp âm thanh nếu đang bật
                setIsLooping(false); // Tắt loop để âm thanh dừng lại sau khi câu kết thúc
                if (audioRef.current) {
                    audioRef.current.pause(); // Đảm bảo dừng hẳn âm thanh
                }
            }
        } else if (expected?.startsWith(normalizedValue)) {
            setInput(value);
            setError("");
        } else {
            setInput(value.slice(0, -1)); // Xóa ký tự cuối cùng nếu sai
            setError("❌ Wrong letter, try again.");
        }
    };

    const playCurrentSegment = () => {
        if (!audioRef.current || !currentSegment) return;
        audioRef.current.currentTime = currentSegment.start;
        audioRef.current.play();
        // Tạm thời dừng loop để play lại một lần
        const wasLooping = isLooping;
        setIsLooping(false); // Tắt loop tạm thời
        const stopPlay = setInterval(() => {
            if (audioRef.current.currentTime >= currentSegment.end) {
                audioRef.current.pause();
                clearInterval(stopPlay);
                if (wasLooping) { // Khôi phục trạng thái loop nếu trước đó đang loop
                    setIsLooping(true);
                }
            }
        }, 100);
    };

    const goToPreviousSegment = () => {
        if (step > 0) {
            setStep(step - 1);
            setConfirmedWords([]);
            setInput("");
            setError("");
            setIsSentenceCompleted(false); // Reset trạng thái
        }
    };

    // Hàm mới để chuyển câu
    const goToNextSentence = () => {
        if (lesson && step < lesson.segments.length - 1) {
            setStep(step + 1);
            setConfirmedWords([]);
            setInput("");
            setError("");
            setIsSentenceCompleted(false); // Reset trạng thái
            setIsLooping(true); // Bật loop lại khi qua câu mới
        } else if (lesson && step === lesson.segments.length - 1) {
            // Đây là câu cuối cùng, có thể xử lý kết thúc bài học
            alert("Bài học đã hoàn thành!");
            // Có thể reset lesson hoặc chuyển hướng người dùng
            setLesson(null);
            setStep(0);
            setConfirmedWords([]);
            setInput("");
            setError("");
            setIsSentenceCompleted(false);
            setIsLooping(true);
        }
    };

    // useEffect để xử lý phát audio khi step thay đổi hoặc isLooping thay đổi
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentSegment) return;

        // Chỉ phát audio nếu câu chưa hoàn thành
        if (!isSentenceCompleted) {
            audio.currentTime = currentSegment.start;
            audio.play();
        } else {
            audio.pause(); // Đảm bảo dừng khi câu đã hoàn thành
            return; // Thoát sớm nếu câu đã hoàn thành
        }

        let loopInterval;

        if (isLooping) {
            loopInterval = setInterval(() => {
                if (audio.currentTime >= currentSegment.end) {
                    audio.currentTime = currentSegment.start;
                    audio.play();
                }
            }, 200);
        } else {
            // Nếu không loop, chỉ phát một lần và dừng khi hết đoạn
            loopInterval = setInterval(() => {
                if (audio.currentTime >= currentSegment.end) {
                    audio.pause();
                    clearInterval(loopInterval);
                }
            }, 200);
        }

        return () => {
            clearInterval(loopInterval);
            audio.pause(); // Dừng audio khi component unmount hoặc dependencies thay đổi
        };
    }, [step, isLooping, currentSegment, isSentenceCompleted]); // Thêm isSentenceCompleted vào dependency array

    useEffect(() => {
        if (audioRef.current && lesson?.audio) {
            audioRef.current.load();
        }
    }, [lesson?.audio]);

    return (
        <div className="container">
            <div className="card">
                <h1>👨‍🎓 Dictation Practice</h1>

                <input
                    type="file"
                    accept="audio/mp3"
                    onChange={handleUpload}
                    className="upload-input"
                />

                {loading && <p className="loading-text">⏳ Processing... please wait.</p>}

                {!lesson && !loading ? (
                    <p className="hint">📂 Upload an MP3 to begin your dictation journey</p>
                ) : (
                    lesson && (
                        <>
                            <audio ref={audioRef} src={lesson.audio} />

                            <div className="info-box">
                                <h2>{lesson.title}</h2>
                                <p>📘 Sentence {step + 1} of {lesson.segments.length}</p>
                            </div>

                            <div className="confirmed-words">
                                {confirmedWords.map((w, i) => (
                                    <span key={i}>{w} </span>
                                ))}
                                {/* Hiển thị transcript và translation khi câu hoàn thành */}
                                {isSentenceCompleted && currentSegment && (
                                    <div className="completed-sentence-info">

                                        <p><strong>Translation:</strong> {currentSegment.translation}</p>
                                    </div>
                                )}
                            </div>

                            <input
                                type="text"
                                value={input}
                                onChange={handleInputChange}
                                placeholder="📝 Turn off Unikey and Type the next word here..."
                                className="text-input"
                                disabled={isSentenceCompleted} // Vô hiệu hóa input khi câu đã hoàn thành
                            />

                            <div className="button-group">
                                <button onClick={goToPreviousSegment} disabled={step === 0}>⬅️ Back</button>
                                {/* Thay thế nút "Next" cũ bằng "goToNextSentence" */}
                                <button onClick={goToNextSentence} disabled={!isSentenceCompleted && step < lesson.segments.length}>➡️ Next</button>
                                <button onClick={playCurrentSegment}>🎧 Play</button>
                                <button onClick={pauseAudio}>⏸ Pause</button>
                                <button onClick={() => setIsLooping(!isLooping)}>
                                    {isLooping ? "🔁 Loop On" : "➡️ Loop Off"}
                                </button>
                                <button onClick={() => setShowTranscript(!showTranscript)}>
                                    {showTranscript ? "🙈 Hide" : "📖 Show"} Full Transcript
                                </button>
                            </div>

                            {showTranscript && currentSegment && (
                                <div className="full-transcript-section"> {/* Đổi tên class cho rõ ràng */}
                                    <strong>Full Transcript:</strong> {currentSegment.transcript}
                                    <br />
                                    <strong>Full Translation:</strong> {currentSegment.translation}
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