import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import DictationBySegment from "./components/DictationBySegment";
import StudyTimer from "./components/StudyTimer";
import RandomSentenceApp from "./components/RandomSentence";

function App() {
  return (
    <Router>
      <div className="app-wrapper" style={{ fontFamily: "Arial", padding: 20 }}>
        <StudyTimer studyMinutes={30} />

        {/* Navigation */}
        <nav style={{ marginBottom: 20 }}>
          <Link to="/" style={{ marginRight: 20 }}>📝 Luyện nghe (Dictation)</Link>
          <Link to="/translate">🌍 Dịch câu (Translate)</Link>
        </nav>

        {/* Route view */}
        <Routes>
          <Route path="/" element={<DictationBySegment />} />
          <Route path="/translate" element={<RandomSentenceApp />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
