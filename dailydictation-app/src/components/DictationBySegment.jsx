import { useEffect, useRef, useState } from "react";

export default function DictationBySegment({ lesson }) {
    const audioRef = useRef(null);
    const [step, setStep] = useState(0);
    const [inputs, setInputs] = useState(Array(lesson.segments.length).fill(""));
    const [showTranscript, setShowTranscript] = useState(false);
    const [error, setError] = useState("");
    const [autoPlay, setAutoPlay] = useState(true);

    const currentSegment = lesson.segments[step];

    // ✅ Hàm phát đoạn âm thanh từ start đến end
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

    // ✅ Phát tự động khi chuyển step, nếu được phép
    useEffect(() => {
        if (!autoPlay) return;
        playSegment(currentSegment.start, currentSegment.end);
    }, [step, autoPlay]);

    const handleInput = (e) => {
        const newInputs = [...inputs];
        newInputs[step] = e.target.value;
        setInputs(newInputs);
        setError("");
    };

    const normalize = (text) =>
        text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, "")
            .replace(/\s+/g, " ")
            .trim();

    const next = () => {
        const userAnswer = normalize(inputs[step]);
        const correctAnswer = normalize(currentSegment.transcript);

        if (userAnswer === correctAnswer) {
            setError("");
            if (step < lesson.segments.length - 1) {
                setAutoPlay(true);     // ✅ Cho phép phát đoạn mới
                setStep(step + 1);     // ✅ Qua câu tiếp theo
            }
        } else {
            setError("Incorrect. Please try again.");
            setAutoPlay(false);        // ❌ Không phát tự động đoạn tiếp theo
            playSegment(currentSegment.start, currentSegment.end); // 🔁 Phát lại câu hiện tại
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
        playSegment(currentSegment.start, currentSegment.end);
    };

    // ✅ Bắt phím Enter và Tab
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

            {error && (
                <p className="text-red-500 mb-2 font-medium">{error}</p>
            )}

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
        </div>
    );
}
