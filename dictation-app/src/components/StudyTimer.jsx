import { useEffect, useState, useRef } from "react";
import "./StudyTimer.css";

export default function StudyTimer({ onBreakStart }) {
    const [inputMinutes, setInputMinutes] = useState(30); // mặc định 30 phút
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [onBreak, setOnBreak] = useState(false);
    const [isRunning, setIsRunning] = useState(false);

    const timerRef = useRef(null);

    // Đếm ngược
    useEffect(() => {
        if (isRunning && secondsLeft > 0) {
            timerRef.current = setInterval(() => {
                setSecondsLeft((prev) => prev - 1);
            }, 1000);
        }

        if (secondsLeft === 0 && isRunning) {
            setIsRunning(false);
            setOnBreak(true);
            if (onBreakStart) onBreakStart();
        }

        return () => clearInterval(timerRef.current);
    }, [isRunning, secondsLeft, onBreakStart]);

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    };

    const handleStart = () => {
        setSecondsLeft(inputMinutes * 60);
        setOnBreak(false);
        setIsRunning(true);
    };

    const handlePause = () => {
        clearInterval(timerRef.current);
        setIsRunning(false);
    };

    const handleResume = () => {
        if (secondsLeft > 0) setIsRunning(true);
    };

    const handleReset = () => {
        setSecondsLeft(0);
        setOnBreak(false);
        setIsRunning(false);
    };

    return (
        <div className="study-timer">
            {!onBreak ? (
                <>
                    <h3>🕒 Study Timer</h3>
                    <input
                        type="number"
                        value={inputMinutes}
                        min={1}
                        onChange={(e) => setInputMinutes(Number(e.target.value))}
                        disabled={isRunning || secondsLeft > 0}
                    />{" "}
                    phút
                    <p className="time">{formatTime(secondsLeft)}</p>
                    {!isRunning && secondsLeft === 0 && (
                        <button onClick={handleStart}>Bắt đầu</button>
                    )}
                    {isRunning && <button onClick={handlePause}>Dừng</button>}
                    {!isRunning && secondsLeft > 0 && (
                        <button onClick={handleResume}>Tiếp tục</button>
                    )}
                </>
            ) : (
                <>
                    <h3>⏸ Break Time!</h3>
                    <p>🎉 Bạn đã học {inputMinutes} phút</p>
                    <button onClick={handleReset}>🔁 Học lại</button>
                </>
            )}
        </div>
    );
}
