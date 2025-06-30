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
        const value = e.target.value;
        const expected = transcriptWords[currentIndex];
        const normalizedValue = normalize(value);

        if (value === "") {
            setInput("");
            return;
        }

        if (normalizedValue === expected) {
            setConfirmedWords([...confirmedWords, expected]);
            setInput("");
            setError("");

            if (currentIndex + 1 === transcriptWords.length) {
                setTimeout(() => {
                    if (step < lesson.segments.length - 1) {
                        setStep(step + 1);
                        setConfirmedWords([]);
                        setInput("");
                    }
                }, 800);
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

        const stop = setInterval(() => {
            if (audioRef.current.currentTime >= currentSegment.end) {
                audioRef.current.pause();
                clearInterval(stop);
            }
        }, 100);
    };

    const goToPreviousSegment = () => {
        if (step > 0) {
            setStep(step - 1);
            setConfirmedWords([]);
            setInput("");
            setError("");
        }
    };

    const goToNextSegment = () => {
        if (step < lesson.segments.length - 1) {
            setStep(step + 1);
            setConfirmedWords([]);
            setInput("");
            setError("");
        }
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentSegment) return;

        audio.currentTime = currentSegment.start;
        audio.play();

        let loop;

        if (isLooping) {
            loop = setInterval(() => {
                if (audio.currentTime >= currentSegment.end) {
                    audio.currentTime = currentSegment.start;
                    audio.play();
                }
            }, 200);
        } else {
            loop = setInterval(() => {
                if (audio.currentTime >= currentSegment.end) {
                    audio.pause();
                    clearInterval(loop);
                }
            }, 200);
        }

        return () => {
            clearInterval(loop);
            audio.pause();
        };
    }, [step, isLooping]);

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
                            </div>

                            <input
                                type="text"
                                value={input}
                                onChange={handleInputChange}
                                placeholder="📝 Turn off Unikey and Type the next word here..."
                                className="text-input"
                            />

                            <div className="button-group">
                                <button onClick={goToPreviousSegment}>⬅️ Back</button>
                                <button onClick={goToNextSegment}>➡️ Next</button>
                                <button onClick={playCurrentSegment}>🎧 Play</button>
                                <button onClick={pauseAudio}>⏸ Pause</button>
                                <button onClick={() => setIsLooping(!isLooping)}>
                                    {isLooping ? "🔁 Loop On" : "➡️ Loop Off"}
                                </button>
                                <button onClick={() => setShowTranscript(!showTranscript)}>
                                    {showTranscript ? "🙈 Hide" : "📖 Show"} Transcript
                                </button>
                            </div>

                            {showTranscript && (
                                <div className="transcript">
                                    <strong>Transcript:</strong> {currentSegment.transcript}
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
