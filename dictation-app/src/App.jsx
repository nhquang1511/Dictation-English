import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import DictationBySegment from "./components/DictationBySegment";
import DictationChineseBySegment from "./components/DictationChineseBySegment";

import RandomSentenceApp from "./components/RandomSentence";
import RandomChineseSentenceApp from "./components/RandomChineseSentenceApp";


function App() {
  return (
    <Router>
      <div className="app-wrapper" style={{ fontFamily: "Arial", padding: 20 }}>


        {/* Navigation */}
        <nav style={{ marginBottom: 20 }}>
          <Link to="/" style={{ marginRight: 20 }}>📝 Dictation EN</Link>
          <Link to="/dictation-chinese" style={{ marginRight: 20 }}>🎧 Dictation Chinese</Link>
          <Link to="/translate" style={{ marginRight: 20 }}>🌍 Translate EN</Link>
          <Link to="/chinese">🈶 Random Chinese Sentence </Link>

        </nav>

        {/* Route view */}
        <Routes>
          <Route path="/" element={<DictationBySegment />} />
          <Route path="/dictation-chinese" element={<DictationChineseBySegment />} />
          <Route path="/translate" element={<RandomSentenceApp />} />
          <Route path="/chinese" element={<RandomChineseSentenceApp />} />

        </Routes>
      </div>
    </Router>
  );
}

export default App;
