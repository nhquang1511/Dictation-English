import { lessons } from "./data/lessons";
import DictationBySegment from "./components/DictationBySegment";

function App() {
  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Daily Dictation Clone</h1>
      <DictationBySegment lesson={lessons[0]} />
    </div>
  );
}

export default App;
