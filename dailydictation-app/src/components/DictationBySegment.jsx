import { useEffect, useRef, useState } from "react";

export default function DictationBySegment() {
    const audioRef = useRef(null);
    const [lesson, setLesson] = useState(null); // 🆕 ban đầu chưa có lesson
    const [step, setStep] = useState(0);
    const [inputs, setInputs] = useState([]);
    const [showTranscript, setShowTranscript] = useState(false);
    const [error, setError] = useState("");
    const [autoPlay, setAutoPlay] = useState(true);

    const currentSegment = lesson?.segments?.[step];

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("http://localhost:5000/upload", {
            method: "POST",
            body: formData,
        });

        const data = await res.json();
        if (data.audio && data.segments) {
            setLesson({
                title: file.name,
                audio: `http://localhost:5000/${data.audio}`, // fix link audio
                segments: data.segments
            });
            setStep(0);
            setInputs(Array(data.segments.length).fill(""));
        }
    };

    const playSegment = (start, end) => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.currentTime = start;
        audio.play();

        const check = setInterval(() => {
            if (audio.currentTime >= end) {
                audio.pause();
                clearInterval(check);
            }
        }, 100);
    };

    useEffect(() => {
        if (!lesson || !autoPlay || !currentSegment) return;
        playSegment(currentSegment.start, currentSegment.end);
    }, [step, autoPlay, lesson]);

    const handleInput = (e) => {
        const newInputs = [...inputs];
        newInputs[step] = e.target.value;
        setInputs(newInputs);
        setError("");
    };

    const normalize = (text) =>
        text.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();

    const next = () => {
        const userAnswer = normalize(inputs[step]);
        const correctAnswer = normalize(currentSegment.transcript);

        if (userAnswer === correctAnswer) {
            setError("");
            if (step < lesson.segments.length - 1) {
                setAutoPlay(true);
                setStep(step + 1);
            }
        } else {
            setError("Incorrect. Please try again.");
            setAutoPlay(false);
            playSegment(currentSegment.start, currentSegment.end);
        }
    };

    const prev = () => {
        if (step > 0) {
            setStep(step - 1);
            setError("");
        }
    };

    const pauseAudio = () => {
        const audio = audioRef.current;
        audio.pause();
    };

    const playCurrentSegment = () => {
        if (currentSegment) {
            playSegment(currentSegment.start, currentSegment.end);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === "TEXTAREA") {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    next();
                }
                if (e.key === "Tab" && !e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    playCurrentSegment();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [step, inputs]);

    return (
        <div className="p-4 border rounded-xl shadow bg-white">
            <input
                type="file"
                accept="audio/mp3"
                onChange={handleUpload}
                className="mb-4"
            />

            {!lesson ? (
                <p className="text-gray-600">Please upload an MP3 file to begin.</p>
            ) : (
                <>
                    <h2 className="text-xl font-bold mb-2">{lesson.title}</h2>
                    <p className="text-gray-600 mb-2">
                        Sentence {step + 1} of {lesson.segments.length}
                    </p>

                    <audio ref={audioRef} src={lesson.audio} />

                    <textarea
                        className="w-full p-2 border rounded mb-2"
                        rows={3}
                        value={inputs[step]}
                        onChange={handleInput}
                        placeholder="Type what you hear..."
                    />

                    {error && <p className="text-red-500 mb-2 font-medium">{error}</p>}

                    <div className="flex flex-wrap gap-2 mb-4">
                        <button
                            onClick={prev}
                            className="px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50"
                            disabled={step === 0}
                        >
                            Previous
                        </button>

                        <button
                            onClick={next}
                            className="px-4 py-2 bg-blue-500 text-white rounded"
                        >
                            Check & Next
                        </button>

                        <button
                            onClick={playCurrentSegment}
                            className="px-4 py-2 bg-yellow-500 text-white rounded"
                        >
                            ▶ Play
                        </button>

                        <button
                            onClick={pauseAudio}
                            className="px-4 py-2 bg-red-500 text-white rounded"
                        >
                            ⏸ Pause
                        </button>

                        <button
                            onClick={() => setShowTranscript(!showTranscript)}
                            className="px-4 py-2 bg-green-600 text-white rounded"
                        >
                            {showTranscript ? "Hide" : "Show"} Transcript
                        </button>
                    </div>

                    {showTranscript && (
                        <p className="text-green-700">
                            <b>Transcript:</b> {currentSegment.transcript}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
