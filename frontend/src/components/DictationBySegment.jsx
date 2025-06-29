import { useEffect, useRef, useState } from "react";

export default function DictationBySegment() {
    const audioRef = useRef(null);
    const [lesson, setLesson] = useState(null);
    const [step, setStep] = useState(0);
    const [input, setInput] = useState("");
    const [confirmedWords, setConfirmedWords] = useState([]);
    const [error, setError] = useState("");
    const [showTranscript, setShowTranscript] = useState(false);
    const pauseAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
    };


    const currentSegment = lesson?.segments?.[step];

    const normalize = (text) =>
        text
            .toLowerCase()
            .replace(/[.,!?]/g, "") // chỉ xóa dấu câu đơn giản
            .replace(/\s+/g, " ")   // chuẩn hóa khoảng trắng
            .trim();


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
                audio: `http://localhost:5000/${data.audio}`,
                segments: data.segments,
            });
            setStep(0);
            setConfirmedWords([]);
            setInput("");
        }
    };

    const transcriptWords = currentSegment
        ? normalize(currentSegment.transcript).split(/\s+/)
        : [];


    const currentIndex = confirmedWords.length;

    const handleInputChange = (e) => {
        const value = e.target.value.trim();
        setInput(value);

        if (value === "") return;

        const expected = transcriptWords[currentIndex];
        if (normalize(value) === expected) {
            setConfirmedWords([...confirmedWords, expected]);
            setInput("");
            setError("");

            // Move to next sentence if finished
            if (currentIndex + 1 === transcriptWords.length) {
                setTimeout(() => {
                    if (step < lesson.segments.length - 1) {
                        setStep(step + 1);
                        setConfirmedWords([]);
                        setInput("");
                    }
                }, 800);
            }
        } else if (expected.startsWith(value)) {
            setError("");
        } else {
            setError("Incorrect, try again.");
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
    useEffect(() => {
        let loop;
        const audio = audioRef.current;

        if (!audio || !currentSegment) return;

        // Nếu chưa hoàn thành câu, thì lặp lại
        if (confirmedWords.length < transcriptWords.length) {
            audio.currentTime = currentSegment.start;
            audio.play();

            loop = setInterval(() => {
                if (audio.currentTime >= currentSegment.end) {
                    audio.currentTime = currentSegment.start;
                    audio.play();
                }
            }, 200);
        }

        // Nếu người dùng hoàn thành câu, dừng lại
        return () => {
            clearInterval(loop);
            if (audio) audio.pause();
        };
    }, [step, confirmedWords]);

    return (
        <div className="p-4 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Dictation Practice</h1>

            <input
                type="file"
                accept="audio/mp3"
                onChange={handleUpload}
                className="mb-4"
            />

            {!lesson ? (
                <p>Please upload an MP3 file to start.</p>
            ) : (
                <>
                    <audio ref={audioRef} src={lesson.audio} />

                    <h2 className="text-lg font-semibold mb-2">{lesson.title}</h2>
                    <p>
                        Sentence {step + 1} of {lesson.segments.length}
                    </p>

                    <div className="mt-4 mb-2 border p-3 rounded bg-gray-50 min-h-[60px]">
                        {confirmedWords.map((w, i) => (
                            <span key={i} className="text-green-700 font-medium">
                                {w}&nbsp;
                            </span>
                        ))}
                    </div>

                    <input
                        type="text"
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Type the next word..."
                        className="w-full p-2 border rounded mb-2"
                    />

                    {error && <p className="text-red-500 mb-2">{error}</p>}

                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={playCurrentSegment}
                            className="px-4 py-2 bg-blue-500 text-white rounded"
                        >
                            ▶ Play
                        </button>
                        <button
                            onClick={pauseAudio}
                            className="px-4 py-2 bg-yellow-500 text-white rounded"
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
                        <p className="bg-gray-100 p-2 rounded text-green-700">
                            <b>Transcript:</b> {currentSegment.transcript}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
