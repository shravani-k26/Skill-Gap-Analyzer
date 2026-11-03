import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  getMyLearnerProfile,
  getSkillsByRole,
  submitSkillAssessment,
  getMyAssessmentHistory,
  getMyLatestSkills,
} from "../../features/learner/learner.service";

import type { RoleSkillRequirement } from "../../features/learner/learner.service";
import type { SkillAssessment } from "../../features/learner/types";

import "./SkillAssessmentPage.css";

const proficiencyLevels = [
  { value: 1, label: "Beginner", description: "Just starting", color: "level-1" },
  { value: 2, label: "Basic", description: "Know the fundamentals", color: "level-2" },
  { value: 3, label: "Intermediate", description: "Can work independently", color: "level-3" },
  { value: 4, label: "Advanced", description: "Confident and capable", color: "level-4" },
  { value: 5, label: "Expert", description: "Can guide others", color: "level-5" },
];

interface LatestSkill {
  skill: {
    _id: string;
    name: string;
  };
  proficiencyLevel: number;
}

const SkillAssessmentPage = () => {
  const [roleName, setRoleName] = useState("");
  const [requirements, setRequirements] = useState<RoleSkillRequirement[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<SkillAssessment[]>([]);
  const [latestSkills, setLatestSkills] = useState<LatestSkill[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [message, setMessage] = useState("");

  const ratedCount = Object.keys(ratings).length;
  const totalSkills = requirements.length;
  const progress = totalSkills > 0
    ? Math.round((ratedCount / totalSkills) * 100)
    : 0;

  const loadAssessmentHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const [assessments, latest] = await Promise.all([
        getMyAssessmentHistory(),
        getMyLatestSkills(),
      ]);

      setHistory(assessments);
      setLatestSkills(latest.skills);
    } catch (err) {
      setHistoryError(
        err instanceof Error
          ? err.message
          : "Unable to load assessment history."
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadRoleSkills = async () => {
      try {
        const profile = await getMyLearnerProfile();

        if (!active) return;

        setRoleName(profile.targetRole.name);

        const roleSkills = await getSkillsByRole(profile.targetRole.name);

        if (!active) return;

        setRequirements(
          roleSkills.filter((item) => item.status === "active")
        );

        const [assessments, latest] = await Promise.all([
          getMyAssessmentHistory(),
          getMyLatestSkills(),
        ]);

        if (!active) return;

        setHistory(assessments);
        setLatestSkills(latest.skills);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your role-specific skills."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadRoleSkills();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const assessedSkills = requirements
      .filter((item) => ratings[item.skill._id] !== undefined)
      .map((item) => ({
        skill: item.skill._id,
        proficiencyLevel: ratings[item.skill._id],
      }));

    if (assessedSkills.length === 0) {
      setError("Please rate at least one skill before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      await submitSkillAssessment(assessedSkills);

      setMessage("Your skill assessment was saved successfully.");
      setRatings({});

      await loadAssessmentHistory();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit your assessment."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="assessment-page">
        <div className="assessment-loading">
          <span className="assessment-spinner" />
          <h2>Preparing your assessment</h2>
          <p>Loading your role-specific skills and assessment history...</p>
        </div>
      </main>
    );
  }

  if (error && requirements.length === 0) {
    return (
      <main className="assessment-page">
        <section className="assessment-error-card" role="alert">
          <span className="assessment-status-icon">!</span>
          <h1>We couldn't load your skills</h1>
          <p>{error}</p>
          <p>
            If you haven't created your learner profile yet, complete it
            before starting a skill assessment.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="assessment-page">
      <div className="assessment-container">
        <header className="assessment-hero">
          <div className="assessment-hero-content">
            <span className="assessment-eyebrow">
              <span className="eyebrow-dot" />
              LEARNER WORKSPACE
            </span>

            <h1>Skill Assessment</h1>

            <p className="assessment-hero-description">
              Understand your strengths, evaluate your current abilities,
              and discover where you can grow next.
            </p>

            <div className="assessment-role-chip">
              <span className="role-chip-icon">✦</span>
              <span>
                <small>YOUR TARGET ROLE</small>
                <strong>{roleName || "Not specified"}</strong>
              </span>
            </div>
          </div>

          <div className="assessment-hero-art" aria-hidden="true">
            <div className="hero-orbit hero-orbit-one" />
            <div className="hero-orbit hero-orbit-two" />
            <div className="hero-center-icon">✦</div>
            <span className="hero-floating hero-floating-one">5/5</span>
            <span className="hero-floating hero-floating-two">↗</span>
            <span className="hero-floating hero-floating-three">✓</span>
          </div>
        </header>

        <section className="assessment-overview" aria-label="Assessment overview">
          <article className="overview-card">
            <div className="overview-icon overview-icon-purple">◈</div>
            <div>
              <span className="overview-label">Skills to assess</span>
              <strong className="overview-value">{totalSkills}</strong>
              <span className="overview-caption">Active role requirements</span>
            </div>
          </article>

          <article className="overview-card">
            <div className="overview-icon overview-icon-pink">✓</div>
            <div>
              <span className="overview-label">Skills rated</span>
              <strong className="overview-value">
                {ratedCount}
                <span className="overview-total"> / {totalSkills}</span>
              </strong>
              <span className="overview-caption">In this assessment</span>
            </div>
          </article>

          <article className="overview-card overview-progress-card">
            <div className="overview-icon overview-icon-blue">↗</div>
            <div className="overview-progress-content">
              <div className="overview-progress-heading">
                <span className="overview-label">Your progress</span>
                <strong>{progress}%</strong>
              </div>
              <div
                className="assessment-progress-track"
                role="progressbar"
                aria-label="Assessment completion"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
              >
                <div
                  className="assessment-progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="overview-caption">
                {totalSkills > 0 && ratedCount === totalSkills
                  ? "All skills rated!"
                  : "Keep going, you're making progress"}
              </span>
            </div>
          </article>
        </section>

        {error && (
          <div className="assessment-alert assessment-alert-error" role="alert">
            <span>!</span>
            <p>{error}</p>
          </div>
        )}

        {message && (
          <div className="assessment-alert assessment-alert-success" role="status">
            <span>✓</span>
            <p>{message}</p>
          </div>
        )}

        <section className="assessment-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">SELF-EVALUATION</span>
              <h2>Rate your skills</h2>
              <p>
                Choose the level that best reflects your current proficiency.
              </p>
            </div>
            <span className="panel-count">
              {ratedCount} of {totalSkills} rated
            </span>
          </div>

          <div className="proficiency-guide">
            {proficiencyLevels.map((level) => (
              <div className="guide-level" key={level.value}>
                <span className={`guide-number ${level.color}`}>
                  {level.value}
                </span>
                <span>{level.label}</span>
              </div>
            ))}
          </div>

          {requirements.length === 0 ? (
            <div className="assessment-empty">
              <span className="empty-illustration">◇</span>
              <h3>No active skills found</h3>
              <p>
                There are currently no active skill requirements for this role.
                Please check your learner profile or role configuration.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="assessment-skill-list">
                {requirements.map(({ skill }, index) => {
                  const selectedLevel = proficiencyLevels.find(
                    (level) => level.value === ratings[skill._id]
                  );

                  return (
                    <article className="skill-rating-card" key={skill._id}>
                      <div className="skill-card-top">
                        <div className="skill-identity">
                          <span className="skill-index">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <h3>{skill.name}</h3>
                            {skill.category && (
                              <span className="skill-category">
                                {skill.category}
                              </span>
                            )}
                          </div>
                        </div>

                        {selectedLevel ? (
                          <span className={`selected-level ${selectedLevel.color}`}>
                            Level {selectedLevel.value} · {selectedLevel.label}
                          </span>
                        ) : (
                          <span className="not-rated-label">Not rated yet</span>
                        )}
                      </div>

                      <div className="skill-level-options">
                        {proficiencyLevels.map((level) => (
                          <label
                            key={level.value}
                            className={`skill-level-option ${
                              ratings[skill._id] === level.value
                                ? `is-selected ${level.color}`
                                : ""
                            }`}
                          >
                            <input
                              type="radio"
                              name={`skill-${skill._id}`}
                              value={level.value}
                              checked={ratings[skill._id] === level.value}
                              onChange={() => {
                                setRatings((current) => ({
                                  ...current,
                                  [skill._id]: level.value,
                                }));
                              }}
                              aria-label={`${skill.name}: ${level.value} - ${level.label}`}
                            />
                            <span className="level-option-number">
                              {level.value}
                            </span>
                            <span className="level-option-label">
                              {level.label}
                            </span>
                            <span className="level-option-description">
                              {level.description}
                            </span>
                          </label>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="assessment-submit-row">
                <p>
                  <span className="submit-info-icon">ⓘ</span>
                  Rate at least one skill to save your assessment.
                </p>
                <button
                  className="assessment-submit-button"
                  type="submit"
                  disabled={submitting || ratedCount === 0}
                >
                  {submitting ? (
                    <>
                      <span className="button-spinner" />
                      Saving assessment...
                    </>
                  ) : (
                    <>
                      Submit assessment
                      <span aria-hidden="true">→</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </section>

        <div className="assessment-results-grid">
          <section className="assessment-panel results-panel">
            <div className="panel-heading compact-heading">
              <div>
                <span className="section-kicker">YOUR SNAPSHOT</span>
                <h2>Latest assessment</h2>
                <p>Your most recently recorded skill levels.</p>
              </div>
              <span className="results-heading-icon">✧</span>
            </div>

            {latestSkills.length === 0 ? (
              <div className="assessment-empty compact-empty">
                <span className="empty-illustration">◎</span>
                <h3>No results yet</h3>
                <p>Submit your first assessment to see your skill snapshot.</p>
              </div>
            ) : (
              <div className="latest-skill-list">
                {latestSkills.map((item) => (
                  <article className="latest-skill-item" key={item.skill._id}>
                    <div className="latest-skill-heading">
                      <span>{item.skill.name}</span>
                      <strong>{item.proficiencyLevel}/5</strong>
                    </div>
                    <div
                      className="latest-skill-track"
                      role="progressbar"
                      aria-label={`${item.skill.name} proficiency`}
                      aria-valuemin={0}
                      aria-valuemax={5}
                      aria-valuenow={item.proficiencyLevel}
                    >
                      <div
                        className="latest-skill-fill"
                        style={{
                          width: `${(item.proficiencyLevel / 5) * 100}%`,
                        }}
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="assessment-panel results-panel">
            <div className="panel-heading compact-heading">
              <div>
                <span className="section-kicker">YOUR JOURNEY</span>
                <h2>Assessment history</h2>
                <p>Review your previously submitted assessments.</p>
              </div>
              <span className="results-heading-icon">◷</span>
            </div>

            {historyError && (
              <div className="assessment-alert assessment-alert-error" role="alert">
                <p>{historyError}</p>
              </div>
            )}

            {historyLoading && (
              <p className="history-loading">
                <span className="small-spinner" />
                Refreshing assessment history...
              </p>
            )}

            {!historyLoading && history.length === 0 && (
              <div className="assessment-empty compact-empty">
                <span className="empty-illustration">◷</span>
                <h3>Your journey starts here</h3>
                <p>Your submitted assessments will appear here.</p>
              </div>
            )}

            <div className="assessment-history-list">
              {history.map((assessment) => (
                <article className="history-card" key={assessment._id}>
                  <div className="history-timeline-marker">
                    <span>✓</span>
                  </div>
                  <div className="history-card-content">
                    <h3>{assessment.targetRole.name}</h3>
                    <p className="history-date">
                      {new Date(assessment.assessedAt).toLocaleString()}
                    </p>
                    <div className="history-card-footer">
                      <span>
                        {assessment.skills.length}{" "}
                        {assessment.skills.length === 1 ? "skill" : "skills"}
                      </span>
                      <details className="history-details">
                        <summary>View details</summary>
                        <ul>
                          {assessment.skills.map((item) => (
                            <li key={item.skill._id}>
                              <span>{item.skill.name}</span>
                              <strong>{item.proficiencyLevel}/5</strong>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <footer className="assessment-footer">
          <span>✦</span>
          Every skill you assess is another step toward your career goals.
        </footer>
      </div>
    </main>
  );
};

export default SkillAssessmentPage;
