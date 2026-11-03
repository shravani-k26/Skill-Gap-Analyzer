
import { useNavigate } from "react-router-dom";
import "./NotFoundPage.css";

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <main className="not-found-page">
      <div className="not-found-card">
        <div className="not-found-illustration" aria-hidden="true">
          <span className="not-found-orbit not-found-orbit-one" />
          <span className="not-found-orbit not-found-orbit-two" />

          <span className="not-found-spark not-found-spark-one">✦</span>
          <span className="not-found-spark not-found-spark-two">✧</span>
          <span className="not-found-spark not-found-spark-three">✦</span>

          <div className="not-found-number">
            <span>4</span>
            <span className="not-found-zero">0</span>
            <span>4</span>
          </div>

          <div className="not-found-floating-icon not-found-floating-top">
            ?
          </div>
          <div className="not-found-floating-icon not-found-floating-bottom">
            <span>↗</span>
          </div>
        </div>

        <span className="not-found-badge">
          <span className="not-found-badge-dot" />
          PAGE NOT FOUND
        </span>

        <h1>Oops! You took a wrong turn.</h1>

        <p className="not-found-description">
          Looks like this page has gone off the learning path. It may have
          been moved, deleted, or the link might be incorrect.
        </p>

        <div className="not-found-actions">
          <button
            type="button"
            className="not-found-home-button"
            onClick={() => navigate("/")}
          >
            <span aria-hidden="true">←</span>
            Back to Home
          </button>

          <button
            type="button"
            className="not-found-back-button"
            onClick={() => navigate(-1)}
          >
            Go Back
          </button>
        </div>

        <div className="not-found-divider" />

        <p className="not-found-footer">
          <span aria-hidden="true">✦</span>
          Keep learning. Your next step is just around the corner.
        </p>
      </div>
    </main>
  );
};

export default NotFoundPage;
