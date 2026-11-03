
import { Link } from "react-router-dom";
import "./HomePage.css";

const HomePage = () => {
  return (
    
    <main className="home-page">
      <nav className="home-navbar">
  <Link to="/" className="home-brand" aria-label="Skill Gap Analyzer home">
    <span className="home-brand-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M4 18V6l8 6 8-6v12"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 18v-4m8 4v-4"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
    <span className="home-brand-name">
      Skill<span>Gap</span>
      <small>ANALYZER</small>
    </span>
  </Link>

  <Link to="/login" className="home-login-button">
    Login
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5m5 5H3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </Link>
</nav>
      <section className="home-hero">
        <div className="home-hero-content">
          <span className="home-eyebrow">
            <span className="home-eyebrow-dot" />
            YOUR NEXT CAREER STEP STARTS HERE
          </span>

          <h1 className="home-title">
            Discover your skills.
            <br />
            <span>Unlock your potential.</span>
          </h1>

          <p className="home-description">
            Understand where you stand, discover the skills your dream role
            requires, and build a clearer path toward your software development
            career.
          </p>

          <div className="home-actions">
            <Link to="/learner-profile" className="home-primary-button">
              Get Started <span aria-hidden="true">→</span>
            </Link>
            <a href="#how-it-works" className="home-secondary-button">
              Explore how it works
            </a>
          </div>

          <div className="home-trust-note">
            <span className="home-check-icon" aria-hidden="true">
              ✓
            </span>
            Personalized insights for your career journey
          </div>
        </div>

        <div className="home-hero-visual" aria-label="Skill analysis overview">
          <div className="home-orbit home-orbit-one" />
          <div className="home-orbit home-orbit-two" />

          <div className="home-analysis-card">
            <div className="home-analysis-top">
              <div>
                <span className="home-card-kicker">YOUR CAREER JOURNEY</span>
                <h2>Skill overview</h2>
              </div>
              <span className="home-sparkle" aria-hidden="true">
                ✦
              </span>
            </div>

            <div className="home-analysis-icon" aria-hidden="true">
              <svg viewBox="0 0 100 100" fill="none">
                <circle
                  cx="50"
                  cy="50"
                  r="39"
                  stroke="#E9D5FF"
                  strokeWidth="9"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="39"
                  stroke="#8B5CF6"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray="176 245"
                  transform="rotate(-90 50 50)"
                />
                <path
                  d="M36 51L46 61L66 40"
                  stroke="#6D28D9"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="home-card-message">
              <strong>Your growth, made clearer.</strong>
              <span>
                Compare your current skills with the skills needed for your
                target role.
              </span>
            </div>

            <div className="home-skill-preview">
              <div className="home-skill-row">
                <span>Technical skills</span>
                <span className="home-skill-dot home-skill-dot-purple" />
              </div>
              <div className="home-skill-row">
                <span>Role requirements</span>
                <span className="home-skill-dot home-skill-dot-pink" />
              </div>
              <div className="home-skill-row">
                <span>Learning priorities</span>
                <span className="home-skill-dot home-skill-dot-blue" />
              </div>
            </div>
          </div>

          <div className="home-floating-chip home-chip-top">
            <span aria-hidden="true">✦</span> Find your skill gaps
          </div>
          <div className="home-floating-chip home-chip-bottom">
            <span aria-hidden="true">↗</span> Plan your next move
          </div>
        </div>
      </section>

      <section className="home-benefits" aria-label="Platform benefits">
        <div className="home-benefit">
          <span className="home-benefit-icon">01</span>
          <div>
            <strong>Know your skills</strong>
            <p>Understand your current capabilities.</p>
          </div>
        </div>

        <div className="home-benefit">
          <span className="home-benefit-icon">02</span>
          <div>
            <strong>See the difference</strong>
            <p>Identify skills to develop for your target role.</p>
          </div>
        </div>

        <div className="home-benefit">
          <span className="home-benefit-icon">03</span>
          <div>
            <strong>Move forward</strong>
            <p>Focus your learning on relevant skills.</p>
          </div>
        </div>
      </section>

      <section className="home-how-section" id="how-it-works">
        <div className="home-section-heading">
          <span className="home-section-eyebrow">A CLEARER PATH FORWARD</span>
          <h2>
            From uncertainty to <span>understanding.</span>
          </h2>
          <p>
            Turn your career goals into a more focused approach to skill
            development.
          </p>
        </div>

        <div className="home-steps">
          <article className="home-step-card">
            <div className="home-step-icon home-step-purple">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" />
                <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
              </svg>
            </div>
            <span className="home-step-label">STEP 01</span>
            <h3>Tell us about yourself</h3>
            <p>
              Share your educational background, experience, and career
              aspirations.
            </p>
          </article>

          <article className="home-step-card">
            <div className="home-step-icon home-step-pink">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m16 16 5 5M8 10.5h5M10.5 8v5" />
              </svg>
            </div>
            <span className="home-step-label">STEP 02</span>
            <h3>Explore your skill gaps</h3>
            <p>
              Compare your current skill profile with the requirements of your
              chosen software development role.
            </p>
          </article>

          <article className="home-step-card">
            <div className="home-step-icon home-step-blue">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M4 19V5M4 19h17" />
                <path d="m7 15 4-4 3 2 6-7" />
                <path d="M15 6h5v5" />
              </svg>
            </div>
            <span className="home-step-label">STEP 03</span>
            <h3>Prioritize your growth</h3>
            <p>
              Use your identified gaps to decide which skills to strengthen
              next.
            </p>
          </article>
        </div>
      </section>

      <section className="home-cta">
        <div>
          <span className="home-cta-eyebrow">YOUR FUTURE IS A WORK IN PROGRESS</span>
          <h2>Ready to understand your skill gaps?</h2>
          <p>
            Start with your learner profile and take the next step in your
            development journey.
          </p>
        </div>
        <Link to="/learner-profile" className="home-cta-button">
          Build your profile <span aria-hidden="true">→</span>
        </Link>
      </section>
    </main>
  );
};

export default HomePage;
