import { useEffect, useRef, useState } from "react";

export default function DictationBySegment() {
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

    const normalize = (text) =>
        text.toLowerCase().replace(/[.,!?]/g, "").replace(/\s+/g, " ").trim();

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);

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
                setIsSentenceCompleted(false);
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
        if (isSentenceCompleted) return;

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

            if (newConfirmedWords.length === transcriptWords.length) {
                setIsSentenceCompleted(true);
                setIsLooping(false);
                if (audioRef.current) {
                    audioRef.current.pause();
                }
            }
        } else if (expected?.startsWith(normalizedValue)) {
            setInput(value);
            setError("");
        } else {
            setInput(value.slice(0, -1));
            setError("❌ Wrong letter, try again.");
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
            alert("🎉 Bài học đã hoàn thành!");
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

        let loopInterval;

        if (isLooping) {
            loopInterval = setInterval(() => {
                if (audio.currentTime >= currentSegment.end) {
                    audio.currentTime = currentSegment.start;
                    audio.play();
                }
            }, 200);
        } else {
            loopInterval = setInterval(() => {
                if (audio.currentTime >= currentSegment.end) {
                    audio.pause();
                    clearInterval(loopInterval);
                }
            }, 200);
        }

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
                <h1>👨‍🎓 Dictation Practice</h1>

                <input
                    type="file"
                    accept="audio/mp3"
                    onChange={handleUpload}
                    className="upload-input"
                />

                {loading && <p className="loading-text">⏳ Processing... please wait.</p>}

                {!lesson && !loading ? (
                    <p className="hint">📂 Upload an MP3 to begin</p>
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

                                {isSentenceCompleted && currentSegment && (
                                    <div className="completed-sentence-info">
                                        <p><strong>Translation:</strong> {currentSegment.translation}</p>

                                        {Array.isArray(currentSegment.idioms_found) && currentSegment.idioms_found.length > 0 && (
                                            <div className="idiom-section">
                                                <h3>💡 Idioms & Phrases:</h3>
                                                <ul className="idiom-list">
                                                    {currentSegment.idioms_found.map((idiom, index) => (
                                                        <li key={index}>
                                                            <strong>{idiom.phrase}</strong>: {idiom.vietnamese_meaning}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
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
                                placeholder="📝 Type the next word here..."
                                className="text-input"
                            />


                            <div className="button-group">
                                <button onClick={goToPreviousSegment} disabled={step === 0}>⬅️ Back</button>
                                <button onClick={goToNextSentence} disabled={!isSentenceCompleted}>➡️ Next</button>
                                <button onClick={playCurrentSegment}>🎧 Play</button>
                                <button onClick={() => audioRef.current?.pause()}>⏸ Pause</button>
                                <button onClick={() => setIsLooping(!isLooping)}>
                                    {isLooping ? "🔁 Loop On" : "➡️ Loop Off"}
                                </button>
                                <button onClick={() => setShowTranscript(!showTranscript)}>
                                    {showTranscript ? "🙈 Hide" : "📖 Show"} Transcript
                                </button>
                            </div>

                            {showTranscript && currentSegment && (
                                <div className="full-transcript-section">
                                    <strong>Transcript:</strong> {currentSegment.transcript}
                                    <br />
                                    <strong>Translation:</strong> {currentSegment.translation}
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
