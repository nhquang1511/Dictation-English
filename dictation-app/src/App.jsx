import DictationBySegment from "./components/DictationBySegment";
import StudyTimer from "./components/StudyTimer";

function App() {
  return (
    <div className="app-wrapper">
      <StudyTimer studyMinutes={30} />
      <div className="content">
        <DictationBySegment />
      </div>
    </div>
  );
}

export default App;
