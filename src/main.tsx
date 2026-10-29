import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "./context";
import App from "./App";
import "./styles.css";
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="fatal">
        <h1>Let’s get you back on track.</h1>
        <p>
          The workspace could not load. Try reloading this page. If demo storage
          is corrupted, reset it below.
        </p>
        <button onClick={() => location.reload()}>Reload page</button>{" "}
        <button
          onClick={() => {
            localStorage.removeItem("quizforge-demo-v1");
            location.href = "/";
          }}
        >
          Reset demo data
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <BrowserRouter>
      <Provider>
        <App />
      </Provider>
    </BrowserRouter>
  </ErrorBoundary>,
);
