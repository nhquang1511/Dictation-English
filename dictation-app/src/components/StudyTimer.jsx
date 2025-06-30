import { useEffect, useState } from "react";
import "./StudyTimer.css"; // 👉 nhớ tạo file này luôn nhé

export default function StudyTimer({ studyMinutes = 30, onBreakStart }) {
    const [secondsLeft, setSecondsLeft] = useState(studyMinutes * 60);
    const [onBreak, setOnBreak] = useState(false);

    useEffect(() => {
        if (secondsLeft <= 0 && !onBreak) {
            setOnBreak(true);
            if (onBreakStart) onBreakStart();
            return;
        }

        if (onBreak) return;

        const timer = setInterval(() => {
            setSecondsLeft((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [secondsLeft, onBreak, onBreakStart]);

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    };

    return (
        <div className="study-timer">
            {!onBreak ? (
                <>
                    <h3>🕒 Study Time</h3>
                    <p className="time">{formatTime(secondsLeft)}</p>
                </>
            ) : (
                <>
                    <h3>⏸ Break Time!</h3>
                    <p>You studied {studyMinutes} minutes</p>
                </>
            )}
        </div>
    );
}
