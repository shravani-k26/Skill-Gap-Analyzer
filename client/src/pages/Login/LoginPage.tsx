
import { useState, type SyntheticEvent } from "react";
import { apiRequest } from "../../services/api";
import "./LoginPage.css";

interface LoginResponse {
  message?: string;
  data: {
    user: {
      id: string;
      fullName: string;
      email: string;
      [key: string]: unknown;
    };
  };
}

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = (await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })) as LoginResponse;

      console.log("Login successful:", response.data.user);

      window.location.href = "/dashboard";
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-layout">
        {/* Left branding section */}
        <section className="login-brand">
          <div className="login-glow login-glow-top" />
          <div className="login-glow login-glow-bottom" />

          <div className="login-brand-content">
            <a
              href="/"
              className="login-logo"
              aria-label="Skill Gap Analyzer home"
            >
              <span className="login-logo-icon">S</span>
              <span className="login-logo-text">
                Skill
                <span className="login-logo-accent">Scope</span>
              </span>
            </a>

            <div className="login-intro">
              <span className="login-eyebrow">
                <span className="login-status-dot" />
                YOUR NEXT CHAPTER STARTS HERE
              </span>

              <h1 className="login-title">
                Turn your
                <span className="login-title-accent">skills into</span>
                <span className="block">possibilities.</span>
              </h1>

              <p className="login-description">
                Discover your strengths, uncover skill gaps, and find a
                smarter path toward your dream software development role.
              </p>
            </div>
          </div>

          <div className="login-feature-grid">
            <div className="login-feature">
              <div className="login-feature-icon">✦</div>
              <p className="login-feature-title">Know your strengths</p>
              <p className="login-feature-description">
                Understand what you already do well.
              </p>
            </div>

            <div className="login-feature">
              <div className="login-feature-icon login-feature-icon-cyan">
                ↗
              </div>
              <p className="login-feature-title">Grow with purpose</p>
              <p className="login-feature-description">
                Focus on skills that move you forward.
              </p>
            </div>
          </div>

          <p className="login-brand-footer">
            Learn smarter. Grow stronger. Build your future.
          </p>
        </section>

        {/* Right login form section */}
        <section className="login-form-panel">
          <div className="login-form-content">
            <div className="login-heading">
              <span className="login-badge">Welcome back</span>

              <h2 className="login-form-title">
                Let&apos;s pick up
                <span className="login-form-title-accent">
                  where you left off.
                </span>
              </h2>

              <p className="login-subtitle">
                Sign in to continue your skill development journey.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div>
                <label htmlFor="email" className="login-field-label">
                  Email address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="login-input"
                />
              </div>

              <div>
                <label htmlFor="password" className="login-field-label">
                  Password
                </label>

                <div className="login-input-wrapper">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    className="login-input login-password-input"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    className="login-password-toggle"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="login-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="login-submit"
              >
                {loading ? "Signing you in..." : "Sign in to your account"}

                {!loading && (
                  <span aria-hidden="true" className="login-submit-arrow">
                    →
                  </span>
                )}
              </button>
              <p className="login-register-link">
  Don&apos;t have an account?{" "}
  <a href="/register">Register</a>
</p>
            </form>

            <div className="login-divider">
              <div className="login-divider-line" />
              <span className="login-divider-text">
                YOUR FUTURE, YOUR PACE
              </span>
              <div className="login-divider-line" />
            </div>

            <div className="login-tip">
              <div className="login-tip-content">
                <span className="login-tip-icon">💡</span>

                <div>
                  <p className="login-tip-title">
                    Small steps. Big progress.
                  </p>
                  <p className="login-tip-description">
                    Sign in to continue identifying the skills you need for
                    your target role.
                  </p>
                </div>
              </div>
            </div>

            <p className="login-footer">
              Skill Gap Analyzer · Build skills with intention
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default LoginPage;
