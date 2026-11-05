import { useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { apiRequest } from "../../services/api";
import type { CurrentUser } from "../../components/ProtectedRoute";
import "./DashboardPage.css";

const DashboardPage = () => {
  const { user } = useOutletContext<{ user: CurrentUser }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogout = async () => {
    setLoading(true);
    setError("");

    try {
      await apiRequest("/auth/logout", {
        method: "POST",
      });

      navigate("/login", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Logout failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const firstName = user.fullName?.trim().split(/\s+/)[0] || "there";

  return (
    <main className="dashboard-page">
      <div className="dashboard-container">
        {/* Navbar */}
        <nav className="dashboard-navbar">
          <Link
            to="/dashboard"
            className="dashboard-brand"
            aria-label="Skill Gap Analyzer dashboard"
          >
            <span className="dashboard-brand-icon">S</span>
            <span className="dashboard-brand-name">
              Skill<span>Scope</span>
              <small>ANALYZER</small>
            </span>
          </Link>

          <div className="dashboard-nav-right">
            <div className="dashboard-user-mini">
              <span className="dashboard-avatar">
                {user.fullName?.charAt(0).toUpperCase() || "U"}
              </span>
              <span className="dashboard-user-name">{user.fullName}</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              className="dashboard-logout"
            >
              {loading ? "Logging out..." : "Logout"}
              <span aria-hidden="true">↗</span>
            </button>
          </div>
        </nav>

        {/* Welcome section */}
        <section className="dashboard-welcome">
          <div className="dashboard-welcome-content">
            <span className="dashboard-eyebrow">
              <span className="dashboard-status-dot" />
              YOUR PERSONAL LEARNING SPACE
            </span>

            <h1>
              Welcome back, <span>{firstName}!</span>
            </h1>

            <p>
              Every step forward counts. Explore your skills, identify areas
              to improve, and move closer to your dream software development
              role.
            </p>
          </div>

          <div className="dashboard-welcome-art" aria-hidden="true">
            <div className="dashboard-art-circle dashboard-art-circle-one" />
            <div className="dashboard-art-circle dashboard-art-circle-two" />
            <div className="dashboard-art-card">
              <span className="dashboard-art-star">✦</span>
              <strong>Your growth journey</strong>
              <span>Starts with one step.</span>
              <div className="dashboard-art-line">
                <span />
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div role="alert" className="dashboard-error">
            <span>!</span>
            {error}
          </div>
        )}

        {/* Account information */}
        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <div>
              <span className="dashboard-section-label">YOUR ACCOUNT</span>
              <h2>Account overview</h2>
              <p>Your account information at a glance.</p>
            </div>
          </div>

          <div className="dashboard-account-card">
            <div className="dashboard-account-avatar">
              {user.fullName?.charAt(0).toUpperCase() || "U"}
            </div>

            <div className="dashboard-account-details">
              <span className="dashboard-account-label">FULL NAME</span>
              <h3>{user.fullName}</h3>
              <span className="dashboard-account-email">{user.email}</span>
            </div>

            <div className="dashboard-account-status">
              <span />
              Signed in
            </div>
          </div>
        </section>

        {/* Quick actions */}
        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <div>
              <span className="dashboard-section-label">GET STARTED</span>
              <h2>Build your career roadmap</h2>
              <p>Take the next step in understanding and improving your skills.</p>
            </div>
          </div>

          <div className="dashboard-action-grid">
            <Link to="/learner-profile" className="dashboard-action-card">
              <div className="dashboard-action-icon profile-icon">
                <span>✦</span>
              </div>

              <span className="dashboard-action-number">01</span>
              <h3>Complete your profile</h3>
              <p>
                Tell us about your education, experience, and professional
                background.
              </p>

              <span className="dashboard-action-link">
                Go to learner profile <span>→</span>
              </span>
            </Link>

            <Link to="/job-description" className="dashboard-action-card">
              <div className="dashboard-action-icon role-icon">
                <span>⌘</span>
              </div>

              <span className="dashboard-action-number">02</span>
              <h3>Explore your target role</h3>
              <p>
                Review the skills and expectations associated with your
                desired software development role.
              </p>

              <span className="dashboard-action-link">
                Explore job description <span>→</span>
              </span>
            </Link>
          </div>
        </section>

        {/* Bottom message */}
        <section className="dashboard-bottom-banner">
          <div className="dashboard-bottom-icon">✧</div>
          <div>
            <h3>Your future is built one skill at a time.</h3>
            <p>
              Keep learning, keep exploring, and make progress at your own
              pace.
            </p>
          </div>
        </section>

        <footer className="dashboard-footer">
          <span>Skill Gap Analyzer</span>
          <span>Learn smarter. Grow stronger. Build your future.</span>
        </footer>
      </div>
    </main>
  );
};

export default DashboardPage;