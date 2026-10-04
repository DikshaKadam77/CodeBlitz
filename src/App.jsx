import { useState, useEffect, useCallback } from "react";

// Local fallback bank — used only if the live QuizAPI.io call fails

const ALL_QUESTIONS = [
  { question: "What does CSS stand for?", options: ["Cascading Style Sheets", "Computer Style Sheets", "Creative Style System", "Colorful Style Sheets"], answer: "Cascading Style Sheets" },
  { question: "Which company originally created React?", options: ["Google", "Facebook (Meta)", "Microsoft", "Amazon"], answer: "Facebook (Meta)" },
  { question: "What does HTML stand for?", options: ["HyperText Markup Language", "HighText Machine Language", "HyperTransfer Markup Language", "HyperText Modern Language"], answer: "HyperText Markup Language" },
  { question: "Which data structure uses FIFO (First In, First Out) order?", options: ["Stack", "Queue", "Tree", "Graph"], answer: "Queue" },
  { question: "What is the time complexity of binary search on a sorted array?", options: ["O(n)", "O(n log n)", "O(log n)", "O(1)"], answer: "O(log n)" },
  { question: "In Git, which command creates a new branch and switches to it?", options: ["git branch -new", "git checkout -b", "git switch --create", "Both git checkout -b and git switch -c"], answer: "Both git checkout -b and git switch -c" },
  { question: "Which HTTP method is typically used to update an existing resource entirely?", options: ["GET", "POST", "PUT", "DELETE"], answer: "PUT" },
  { question: "What does SQL's JOIN clause do?", options: ["Deletes duplicate rows", "Combines rows from two or more tables", "Sorts a table", "Creates a new table"], answer: "Combines rows from two or more tables" },
  { question: "In machine learning, what does 'overfitting' mean?", options: ["The model is too simple to learn patterns", "The model performs well on training data but poorly on new data", "The model trains too quickly", "The dataset is too small to load"], answer: "The model performs well on training data but poorly on new data" },
  { question: "Which of these is NOT a core principle of object-oriented programming?", options: ["Encapsulation", "Inheritance", "Polymorphism", "Compilation"], answer: "Compilation" },
  { question: "What does API stand for?", options: ["Application Programming Interface", "Automated Program Integration", "Application Process Interaction", "Advanced Programming Instruction"], answer: "Application Programming Interface" },
  { question: "In React, what hook is used to perform side effects after render?", options: ["useState", "useEffect", "useMemo", "useRef"], answer: "useEffect" },
  { question: "Which algorithm is commonly used to train neural networks by minimizing error?", options: ["Binary search", "Gradient descent", "Quicksort", "Dijkstra's algorithm"], answer: "Gradient descent" },
  { question: "What does 'CRUD' stand for in backend development?", options: ["Create, Read, Update, Delete", "Compile, Run, Update, Debug", "Create, Run, Undo, Deploy", "Connect, Read, Upload, Download"], answer: "Create, Read, Update, Delete" },
  { question: "Which of these is a NoSQL database?", options: ["PostgreSQL", "MySQL", "MongoDB", "SQLite"], answer: "MongoDB" },
  { question: "What is the main purpose of a CDN (Content Delivery Network)?", options: ["Encrypt user passwords", "Serve content from servers closer to the user for speed", "Compile JavaScript code", "Manage database transactions"], answer: "Serve content from servers closer to the user for speed" },
  { question: "In Python, what does the 'self' parameter refer to inside a class method?", options: ["The class itself", "The current instance of the class", "A global variable", "The parent class"], answer: "The current instance of the class" },
  { question: "Which sorting algorithm has the best average-case time complexity?", options: ["Bubble sort — O(n²)", "Selection sort — O(n²)", "Merge sort — O(n log n)", "Insertion sort — O(n²)"], answer: "Merge sort — O(n log n)" },
  { question: "What does 'supervised learning' require that 'unsupervised learning' does not?", options: ["A GPU", "Labeled training data", "A neural network", "Cloud hosting"], answer: "Labeled training data" },
  { question: "Which status code indicates a successful HTTP request?", options: ["404", "500", "200", "301"], answer: "200" },
  { question: "What is the purpose of a 'key' prop when rendering a list in React?", options: ["To style the list items", "To help React identify which items changed between renders", "To sort the list automatically", "To fetch data for the list"], answer: "To help React identify which items changed between renders" },
  { question: "Which term describes a function that calls itself to solve a problem?", options: ["Iteration", "Recursion", "Delegation", "Abstraction"], answer: "Recursion" },
  { question: "What does 'IDE' stand for?", options: ["Integrated Development Environment", "Internal Data Engine", "Interface Design Element", "Independent Deployment Environment"], answer: "Integrated Development Environment" },
  { question: "In a neural network, what is the role of an activation function?", options: ["To store training data", "To introduce non-linearity so the network can learn complex patterns", "To split data into train/test sets", "To compile the code into machine language"], answer: "To introduce non-linearity so the network can learn complex patterns" },
];

const QUESTIONS_PER_GAME = 8;
const TIME_PER_QUESTION = 15;

// When times runs out, and the option is not choosen
const TIMED_OUT = "__TIMED_OUT__";

// QuizAPI.io key. NOTE: any key used from the browser like this is visible

const QUIZAPI_KEY = "qa_sk_ff2aae862a2c12ff135202e7337803f916335296";

// Fisher-Yates shuffle — returns a new shuffled array without mutating the original.
function shuffleArray(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Picks a random 8-question subset from the LOCAL pool, and shuffles each

function buildLocalQuizQuestions() {
  const picked = shuffleArray(ALL_QUESTIONS).slice(0, QUESTIONS_PER_GAME);
  return picked.map((q) => ({ ...q, options: shuffleArray(q.options) }));
}

// Fetches 8 live programming questions from QuizAPI.io and reshapes them
// into the same {question, options, answer} format the rest of the app

async function fetchQuizQuestions() {
  try {
    const res = await fetch(
      `https://quizapi.io/api/v1/questions?category=Programming&limit=${QUESTIONS_PER_GAME}`,
      { headers: { Authorization: `Bearer ${QUIZAPI_KEY}` } }
    );
    if (!res.ok) throw new Error(`API responded with ${res.status}`);

    const data = await res.json();
    const results = data?.data ?? [];
    if (!results.length) throw new Error("API returned no usable questions");

    const mapped = results
      .filter((item) => Array.isArray(item.answers) && item.answers.length)
      .map((item) => {
        const correct = item.answers.find((a) => a.isCorrect);
        if (!correct) return null;
        return {
          question: item.text,
          answer: correct.text,
          options: shuffleArray(item.answers.map((a) => a.text)),
        };
      })
      .filter(Boolean);

    if (!mapped.length) throw new Error("API returned no valid questions");
    return mapped.slice(0, QUESTIONS_PER_GAME);
  } catch (err) {
    console.warn("QuizAPI unavailable, using local question bank:", err.message);
    return buildLocalQuizQuestions();
  }
}

function App() {
  const [screen, setScreen] = useState("start");
  const [loading, setLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [bestScore, setBestScore] = useState(() => {
    return Number(localStorage.getItem("quizdash-best") || 0);
  });

  const currentQuestion = quizQuestions[currentIndex];

  function getButtonClass(option) {
    if (selectedAnswer === null) return "answer-btn";
    if (option === currentQuestion.answer) return "answer-btn correct";
    if (option === selectedAnswer) return "answer-btn incorrect";
    return "answer-btn disabled";
  }

  function handleAnswer(option) {
    if (selectedAnswer !== null) return; // already answered, ignore extra clicks
    setSelectedAnswer(option);

    if (option === currentQuestion.answer) {
      const newStreak = streak + 1;
      const bonus = newStreak >= 3 ? 20 : 10; // streak of 3+ earns a bonus
      setScore((s) => s + bonus);
      setStreak(newStreak);
    } else {
      setStreak(0); // wrong answer resets the streak
    }
  }

  // Timer: ticks every second while a question is active and unanswered.
  const handleTick = useCallback(() => {
    setTimeLeft((t) => {
      if (t <= 1) {
        handleAnswer(TIMED_OUT); // time ran out — lock in "no answer"
        return 0;
      }
      return t - 1;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAnswer, currentQuestion]);

  useEffect(() => {
    if (screen !== "playing" || selectedAnswer !== null) return;
    const id = setInterval(handleTick, 1000);
    return () => clearInterval(id); // cleanup: stops the old interval every re-render
  }, [screen, selectedAnswer, handleTick]);

  // Auto-advance to the next question a beat after a timeout, so the
  // person sees the correct answer highlighted before it moves on. A
  // manually-clicked answer does NOT auto-advance — only a timeout does.
  useEffect(() => {
    if (selectedAnswer !== TIMED_OUT) return;
    const id = setTimeout(() => {
      handleNext();
    }, 1500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAnswer]);

  function handleNext() {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= quizQuestions.length) {
      if (score > bestScore) {
        setBestScore(score);
        localStorage.setItem("quizdash-best", String(score));
      }
      setScreen("results");
      return;
    }
    setCurrentIndex(nextIndex);
    setSelectedAnswer(null);
    setTimeLeft(TIME_PER_QUESTION);
  }

  async function handleStart() {
    setLoading(true);
    const fetched = await fetchQuizQuestions();
    setQuizQuestions(fetched);
    setScreen("playing");
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setSelectedAnswer(null);
    setTimeLeft(TIME_PER_QUESTION);
    setLoading(false);
  }

  if (screen === "start") {
    return (
      <div className="app">
        <div className="card start-card">
          <div className="hero-badge" aria-hidden="true">{"</>"}</div>
          <h1>CodeBlitz</h1>
          <p>Live software engineering &amp; AI/ML questions, eight at a time, fifteen seconds each.</p>
          <p className="best-score"> Best Score: {bestScore}</p>
          <button className="primary-btn" onClick={handleStart} disabled={loading}>
            {loading ? "Loading questions..." : "Start Quiz"}
          </button>
        </div>
      </div>
    );
  }

  if (screen === "results") {
    return (
      <div className="app">
        <div className="card start-card">
          <h1>Quiz Complete</h1>
          <p className="final-score">{score} points</p>
          <p className="best-score">Best Score: {bestScore}</p>
          <button className="primary-btn" onClick={handleStart}>Play Again</button>
        </div>
      </div>
    );
  }

  const timerPercent = (timeLeft / TIME_PER_QUESTION) * 100;

  return (
    <div className="app">
      <div className="card">
        <div className="top-bar">
          <span className="quiz-title">CodeBlitz</span>
          <span className="question-count">Question {currentIndex + 1}/{quizQuestions.length}</span>
          <span className="score-display">Score: {score} {streak >= 2 && (
            <span className="streak">🔥 {streak}</span>
          )}</span>
        </div>

        <div className="timer-track">
          <div
            className={`timer-fill ${timeLeft <= 5 ? "timer-low" : ""}`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>

        <h2>{currentQuestion.question}</h2>

        <div className="answers-list">
          {currentQuestion.options.map((option) => (
            <button
              key={option}
              className={getButtonClass(option)}
              onClick={() => handleAnswer(option)}
            >
              <span className="answer-text">{option}</span>
              <span className="radio-dot" aria-hidden="true" />
            </button>
          ))}
        </div>

        {selectedAnswer !== null && (
          <button className="primary-btn" onClick={handleNext}>
            {currentIndex + 1 === quizQuestions.length ? "See Results" : "Next Question"}
          </button>
        )}
      </div>
    </div>
  );
}

export default App;