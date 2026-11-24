import { useEffect, useState, type FormEvent } from "react";

import { getAllJobDescriptions } from "../../features/job-description/jobDescription.service";
import type { JobDescription } from "../../features/job-description/types";
import {
  getMySkillGapAnalysis,
  getMySkillGapComparison,
  getMyLatestSkills,
  submitSkillAssessment,
} from "../../features/learner/learner.service";
import type { SkillGapComparison } from "../../features/learner/learner.service";

import "./SkillGapAnalysisPage.css";

type SkillGapStatus =
  | "high_learning_priority"
  | "needs_improvement"
  | "developing_proficiency"
  | "relative_strength"
  | "not_assessed";

type SkillPriority =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "assessment_needed";

type LearningStatus =
  | "needs_learning"
  | "continue_developing"
  | "relative_strength"
  | "assessment_needed";

type DependencyStrength = "strong" | "moderate" | "optional";
type DependencySource = "predefined" | "ai";
type DependencyValidationStatus = "pending" | "accepted" | "rejected";
type DependencyRelationshipType = "prerequisite" | "recommended";

interface AnalysisSkill {
  skillId: string;
  skillName: string;
  category?: string;
  proficiencyLevel: number | null;
  proficiencyLabel: string;
  status: SkillGapStatus;
  priority: SkillPriority;
  priorityScore: number | null;
  learningStatus: LearningStatus;
  learningOrder: number | null;
  prerequisiteSkills: string[];
  blockedBy: string[];
  learningReason: string;
}

interface DependencyResult {
  skillId: string;
  skillName: string;
  prerequisiteName: string;
  prerequisiteSkillId: string | null;
  prerequisiteProficiency: number | null;
  relationshipType: DependencyRelationshipType;
  strength: DependencyStrength;
  source: DependencySource;
  validationStatus: DependencyValidationStatus;
  confidence: number | null;
  explanation: string;
  isPrerequisiteAssessed: boolean;
  isReady: boolean;
}

interface SkillGapAnalysis {
  jobDescription: {
    id: string;
    title: string;
    company?: string;
    targetRole: string;
  };
  assessment: { id: string; assessedAt: string } | null;
  summary: {
    totalRequiredSkills: number;
    highLearningPriority: number;
    needsImprovement: number;
    developingProficiency: number;
    relativeStrength: number;
    notAssessed: number;
    priorityCounts: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      assessmentNeeded: number;
    };
  };
  skills: AnalysisSkill[];
  dependencies: DependencyResult[];
}

const proficiencyLevels = [
  { value: 0, label: "0 - No knowledge" },
  { value: 1, label: "1 - Beginner" },
  { value: 2, label: "2 - Basic" },
  { value: 3, label: "3 - Intermediate" },
  { value: 4, label: "4 - Advanced" },
  { value: 5, label: "5 - Very confident" },
];

const statusLabels: Record<SkillGapStatus, string> = {
  high_learning_priority: "High learning priority",
  needs_improvement: "Needs improvement",
  developing_proficiency: "Developing proficiency",
  relative_strength: "Relative strength",
  not_assessed: "Not assessed",
};

const priorityLabels: Record<SkillPriority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  assessment_needed: "Assessment needed",
};

const learningStatusLabels: Record<LearningStatus, string> = {
  needs_learning: "Needs learning",
  continue_developing: "Continue developing",
  relative_strength: "Relative strength",
  assessment_needed: "Assessment needed",
};

const strengthLabels: Record<DependencyStrength, string> = {
  strong: "Strong",
  moderate: "Moderate",
  optional: "Optional",
};

const sourceLabels: Record<DependencySource, string> = {
  predefined: "Predefined",
  ai: "AI suggested",
};

const validationLabels: Record<DependencyValidationStatus, string> = {
  pending: "Pending review",
  accepted: "Accepted",
  rejected: "Rejected",
};

const comparisonMethods = [
  {
    key: "proficiencyOnly",
    title: "Proficiency-only baseline",
    subtitle: "Based on your current skill level",
    description:
      "Prioritizes skills according to your current proficiency gaps. It does not consider prerequisite relationships.",
  },
  {
    key: "predefined",
    title: "Predefined dependency-aware method",
    subtitle: "Based on skill relationships",
    description:
      "Uses predefined relationships between skills to organize a suitable learning order.",
  },
  {
    key: "hybrid",
    title: "Hybrid AI-assisted method",
    subtitle: "AI-assisted learning plan",
    description:
      "Combines predefined skill relationships with AI suggestions that you have accepted.",
  },
] as const;

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

const SkillGapAnalysisPage = () => {
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [analysis, setAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [comparison, setComparison] = useState<SkillGapComparison | null>(null);
  const [missingRatings, setMissingRatings] = useState<Record<string, number>>({});
  const [loadingDescriptions, setLoadingDescriptions] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [savingRatings, setSavingRatings] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    const loadJobDescriptions = async () => {
      try {
        const descriptions = await getAllJobDescriptions();
        if (active) setJobDescriptions(descriptions);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load saved job descriptions."
          );
        }
      } finally {
        if (active) setLoadingDescriptions(false);
      }
    };

    void loadJobDescriptions();
    return () => {
      active = false;
    };
  }, []);

  const handleAnalyze = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedId) {
      setError("Please select a job description.");
      return;
    }

    setError("");
    setMessage("");
    setAnalysis(null);
    setComparison(null);
    setMissingRatings({});
    setAnalyzing(true);

    try {
      const [analysisResult, comparisonResult] = await Promise.all([
        getMySkillGapAnalysis(selectedId),
        getMySkillGapComparison(selectedId),
      ]);
      setAnalysis(analysisResult);
      setComparison(comparisonResult);
      setMessage("Your skill gap analysis and method comparison are ready.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to analyze your skill gaps."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmitMissingRatings = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!analysis) return;

    setError("");
    setMessage("");

    const missingSkills = analysis.skills.filter(
      (skill) => skill.status === "not_assessed"
    );

    if (missingSkills.length === 0) {
      setError("There are no missing skills to assess.");
      return;
    }

    const allMissingSkillsRated = missingSkills.every(
      (skill) => missingRatings[skill.skillId] !== undefined
    );

    if (!allMissingSkillsRated) {
      setError("Please rate every unassessed skill before submitting.");
      return;
    }

    setSavingRatings(true);

    try {
      const latest = await getMyLatestSkills();
      const ratingsBySkill = new Map<string, number>(
        latest.skills.map((item) => [item.skill._id, item.proficiencyLevel])
      );

      for (const skill of missingSkills) {
        ratingsBySkill.set(skill.skillId, missingRatings[skill.skillId]);
      }

      const skillsToSubmit = Array.from(
        ratingsBySkill,
        ([skill, proficiencyLevel]) => ({ skill, proficiencyLevel })
      );

      await submitSkillAssessment(skillsToSubmit);

      const jobDescriptionId = analysis.jobDescription.id;
      const [updatedAnalysis, updatedComparison] = await Promise.all([
        getMySkillGapAnalysis(jobDescriptionId),
        getMySkillGapComparison(jobDescriptionId),
      ]);

      setAnalysis(updatedAnalysis);
      setComparison(updatedComparison);
      setMissingRatings({});
      setMessage("Your ratings have been saved and the analysis is updated.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save missing skill ratings."
      );
    } finally {
      setSavingRatings(false);
    }
  };

  const updateMissingRating = (skillId: string, value: string) => {
    setMissingRatings((current) => {
      const next = { ...current };
      if (value === "") delete next[skillId];
      else next[skillId] = Number(value);
      return next;
    });
  };

  if (loadingDescriptions) {
    return (
      <main className="skill-analysis-page">
        <div className="analysis-loading">
          <span className="analysis-spinner" />
          <h2>Preparing your analysis workspace</h2>
          <p>Loading your saved job descriptions...</p>
        </div>
      </main>
    );
  }

  const missingSkills =
    analysis?.skills.filter((skill) => skill.status === "not_assessed") ?? [];

  return (
    <main className="skill-analysis-page">
      <div className="analysis-container">
        <header className="analysis-hero">
          <div className="analysis-hero-content">
            <span className="analysis-eyebrow">
              <span className="analysis-eyebrow-dot" />
              CAREER DEVELOPMENT WORKSPACE
            </span>
            <h1>
              Skill Gap <span>Analysis</span>
            </h1>
            <p>
              Turn your target role into a clear learning direction. Review
              your strengths, identify missing skills, and understand what to
              learn first.
            </p>
            <div className="hero-highlights">
              <span><i>✓</i> Role-focused insights</span>
              <span><i>✓</i> Learning priorities</span>
              <span><i>✓</i> Skill dependencies</span>
            </div>
          </div>
          <div className="analysis-hero-visual" aria-hidden="true">
            <div className="hero-orbit hero-orbit-one" />
            <div className="hero-orbit hero-orbit-two" />
            <div className="hero-glow" />
            <div className="hero-visual-card">
              <span className="visual-sparkle">✦</span>
              <small>YOUR NEXT STEP</small>
              <strong>Learn with<br />direction.</strong>
              <div className="visual-progress"><span /></div>
              <span className="visual-caption">Understand · Prioritize · Grow</span>
            </div>
          </div>
        </header>

        {error && (
          <div role="alert" className="analysis-message error-message">
            <span className="message-icon">!</span><p>{error}</p>
            <button type="button" onClick={() => setError("")} aria-label="Dismiss error">×</button>
          </div>
        )}
        {message && (
          <div role="status" className="analysis-message success-message">
            <span className="message-icon">✓</span><p>{message}</p>
            <button type="button" onClick={() => setMessage("")} aria-label="Dismiss message">×</button>
          </div>
        )}

        <section className="analysis-panel selection-panel">
          <div className="section-heading">
            <div>
              <span className="section-kicker">START HERE</span>
              <h2>Choose your target role</h2>
              <p>Select a saved job description to compare its required skills with your latest self-assessment.</p>
            </div>
            <span className="section-icon">⌕</span>
          </div>

          {jobDescriptions.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">▤</span>
              <h3>No saved job descriptions yet</h3>
              <p>Save a job description first. You can then return here to run your skill gap analysis.</p>
            </div>
          ) : (
            <form className="job-select-form" onSubmit={handleAnalyze}>
              <div className="form-field">
                <label htmlFor="job-description">Saved job description</label>
                <select
                  id="job-description"
                  value={selectedId}
                  onChange={(event) => {
                    setSelectedId(event.target.value);
                    setAnalysis(null);
                    setComparison(null);
                    setMissingRatings({});
                    setMessage("");
                    setError("");
                  }}
                  required
                >
                  <option value="">Choose a job description</option>
                  {jobDescriptions.map((job) => (
                    <option key={job._id} value={job._id}>
                      {job.title}{job.company ? ` — ${job.company}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <button className="primary-button analyze-button" type="submit" disabled={analyzing || savingRatings}>
                {analyzing ? <><span className="button-spinner" /> Analyzing...</> : <>Analyze skill gaps <span>→</span></>}
              </button>
            </form>
          )}
        </section>

        {analyzing && (
          <div className="inline-loading">
            <span className="analysis-spinner" />
            <div><strong>Analyzing your skill profile</strong><p>Comparing required skills and preparing learning recommendations...</p></div>
          </div>
        )}

        {analysis && (
          <div className="analysis-results">
            <section className="role-overview">
              <div className="role-overview-main">
                <span className="section-kicker">ANALYSIS FOR</span>
                <h2>{analysis.jobDescription.title}</h2>
                <p>{analysis.jobDescription.company ? `${analysis.jobDescription.company} · ` : ""}{analysis.jobDescription.targetRole}</p>
              </div>
              <div className="assessment-meta">
                <span className="meta-label">Assessment used</span>
                <strong>{analysis.assessment ? formatDate(analysis.assessment.assessedAt) : "No assessment available"}</strong>
              </div>
            </section>

            <section className="analysis-panel">
              <div className="section-heading">
                <div><span className="section-kicker">AT A GLANCE</span><h2>Analysis summary</h2><p>A snapshot of how your current skills align with this role.</p></div>
              </div>
              <div className="summary-grid">
                <div className="summary-card summary-total"><span className="summary-label">Required skills</span><strong>{analysis.summary.totalRequiredSkills}</strong><small>Extracted from role</small></div>
                <div className="summary-card summary-critical"><span className="summary-label">High learning priority</span><strong>{analysis.summary.highLearningPriority}</strong><small>Focus your attention</small></div>
                <div className="summary-card summary-improve"><span className="summary-label">Needs improvement</span><strong>{analysis.summary.needsImprovement}</strong><small>Build proficiency</small></div>
                <div className="summary-card summary-develop"><span className="summary-label">Developing</span><strong>{analysis.summary.developingProficiency}</strong><small>Keep progressing</small></div>
                <div className="summary-card summary-strength"><span className="summary-label">Relative strengths</span><strong>{analysis.summary.relativeStrength}</strong><small>Skills you can leverage</small></div>
                <div className="summary-card summary-unassessed"><span className="summary-label">Not assessed</span><strong>{analysis.summary.notAssessed}</strong><small>Ratings still needed</small></div>
              </div>
              <div className="priority-distribution">
                <div className="subsection-heading"><h3>Priority distribution</h3><span>Based on your analysis</span></div>
                <div className="priority-chips">
                  <span className="priority-chip critical">Critical <strong>{analysis.summary.priorityCounts.critical}</strong></span>
                  <span className="priority-chip high">High <strong>{analysis.summary.priorityCounts.high}</strong></span>
                  <span className="priority-chip medium">Medium <strong>{analysis.summary.priorityCounts.medium}</strong></span>
                  <span className="priority-chip low">Low <strong>{analysis.summary.priorityCounts.low}</strong></span>
                  <span className="priority-chip pending">Assessment needed <strong>{analysis.summary.priorityCounts.assessmentNeeded}</strong></span>
                </div>
              </div>
            </section>

            <section className="analysis-panel comparison-panel">
              <div className="section-heading">
                <div><span className="section-kicker">RESEARCH COMPARISON</span><h2>Compare learning methods</h2><p>All three methods use the same job description and skill assessment, but organize learning recommendations differently.</p></div>
              </div>
              {!comparison ? (
                <div className="empty-state compact"><p>Comparison data is not available. Please run the analysis again.</p></div>
              ) : (
                <>
                  <div className="comparison-inputs">
                    <div><span>Total extracted skills</span><strong>{comparison.commonInputs.totalExtractedSkills}</strong></div>
                    <div><span>Skills assessed</span><strong>{comparison.commonInputs.totalAssessedSkills}</strong></div>
                    <div><span>Skills not assessed</span><strong>{comparison.commonInputs.totalUnassessedSkills}</strong></div>
                  </div>
                  <div className="comparison-grid">
                    {comparisonMethods.map((item, index) => {
                      const method = comparison.methods[item.key];
                      const orderedSkills = [...method.skills]
                        .filter((skill) => skill.learningOrder !== null)
                        .sort((a, b) => (a.learningOrder ?? 0) - (b.learningOrder ?? 0));
                      const blockedSkills = method.skills.filter((skill) => skill.blockedBy.length > 0);

                      return (
                        <article className={`comparison-card method-${item.key}`} key={item.key}>
                          <div className="method-card-top"><span className="method-number">0{index + 1}</span><span className="method-tag">{item.key === "hybrid" ? "AI ASSISTED" : item.key === "predefined" ? "DEPENDENCY BASED" : "BASELINE"}</span></div>
                          <h3>{item.title}</h3>
                          <span className="method-subtitle">{item.subtitle}</span>
                          <p className="method-description">{item.description}</p>
                          <div className="method-stat"><span>Skill connections</span><strong>{method.dependencyCount}</strong></div>
                          {item.key === "hybrid" && <div className="hybrid-stats"><span>Predefined <strong>{method.predefinedDependencyCount ?? 0}</strong></span><span>Accepted AI <strong>{method.acceptedAIDependencyCount ?? 0}</strong></span></div>}
                          <div className="method-list-block">
                            <h4>What to learn first</h4>
                            {orderedSkills.length === 0 ? <p className="muted-copy">No learning order is available.</p> : (
                              <ol className="learning-order-list">
                                {orderedSkills.map((skill) => <li key={skill.skillId}><span className="order-number">{skill.learningOrder}</span><div><strong>{skill.skillName}</strong><small>{skill.proficiencyLabel} · Priority Score: {skill.priorityScore !== null ? `${skill.priorityScore}/100` : "N/A"}</small></div></li>)}
                              </ol>
                            )}
                          </div>
                          <div className="method-list-block blocked-block">
                            <h4>Skills to learn later</h4>
                            {blockedSkills.length === 0 ? <p className="muted-copy">No skills are currently blocked by unready prerequisites.</p> : <ul>{blockedSkills.map((skill) => <li key={skill.skillId}><strong>{skill.skillName}</strong><span>Learn {skill.blockedBy.join(", ")} first.</span></li>)}</ul>}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  <div className="table-section">
                    <div className="subsection-heading"><h3>All method skill priorities</h3><span>Detailed method-by-method values</span></div>
                    {comparisonMethods.map((item) => {
                      const method = comparison.methods[item.key];
                      return (
                        <details className="method-details" key={item.key}>
                          <summary>{item.title}<span>{method.skills.length} skills</span></summary>
                          {method.skills.length === 0 ? <p className="empty-table-copy">No skills are available.</p> : (
                            <div className="table-scroll"><table><thead><tr><th>Skill</th><th>Proficiency</th><th>Priority</th><th>Score</th><th>Learning order</th></tr></thead><tbody>
                              {method.skills.map((skill) => <tr key={skill.skillId}><td className="table-primary">{skill.skillName}</td><td>{skill.proficiencyLabel}</td><td><span className={`status-pill priority-${skill.priority}`}>{priorityLabels[skill.priority]}</span></td><td>{skill.priorityScore !== null ? `${skill.priorityScore}/100` : "—"}</td><td>{skill.learningOrder !== null ? skill.learningOrder : "Not sequenced"}</td></tr>)}
                            </tbody></table></div>
                          )}
                        </details>
                      );
                    })}
                  </div>
                </>
              )}
            </section>

            <section className="analysis-panel">
              <div className="section-heading"><div><span className="section-kicker">YOUR ACTION PLAN</span><h2>Learning priority &amp; sequence</h2><p>This detailed view uses the hybrid method: predefined relationships and AI suggestions accepted by the learner.</p></div></div>
              {analysis.skills.length === 0 ? <div className="empty-state compact"><p>No skills are available for prioritization.</p></div> : (
                <div className="table-scroll"><table><thead><tr><th>Order</th><th>Skill</th><th>Proficiency</th><th>Priority</th><th>Score</th><th>Prerequisites</th><th>Blocked by</th><th>Learning reason</th><th>Status</th></tr></thead><tbody>
                  {[...analysis.skills].sort((a, b) => (a.learningOrder ?? 9999) - (b.learningOrder ?? 9999)).map((skill) => <tr key={skill.skillId}><td><span className="order-number">{skill.learningOrder ?? "—"}</span></td><td className="table-primary">{skill.skillName}</td><td>{skill.proficiencyLabel}</td><td><span className={`status-pill priority-${skill.priority}`}>{priorityLabels[skill.priority]}</span></td><td>{skill.priorityScore !== null ? `${skill.priorityScore}/100` : "—"}</td><td>{skill.prerequisiteSkills.length ? skill.prerequisiteSkills.join(", ") : "None"}</td><td>{skill.blockedBy.length ? skill.blockedBy.join(", ") : "None"}</td><td className="reason-cell">{skill.learningReason}</td><td>{learningStatusLabels[skill.learningStatus]}</td></tr>)}
                </tbody></table></div>
              )}
            </section>

            <section className="analysis-panel">
              <div className="section-heading"><div><span className="section-kicker">LEARNING CONNECTIONS</span><h2>Skill dependency analysis</h2><p>Prerequisite relationships associated with the skills extracted from this job description.</p></div></div>
              {analysis.dependencies.length === 0 ? <div className="empty-state compact"><p>No accepted dependencies were found for the extracted skills and selected role.</p></div> : (
                <div className="table-scroll"><table><thead><tr><th>Target skill</th><th>Learn first</th><th>Strength</th><th>Relationship</th><th>Proficiency</th><th>Readiness</th><th>Source</th><th>Validation</th><th>AI confidence</th><th>Explanation</th></tr></thead><tbody>
                  {analysis.dependencies.map((dependency, index) => <tr key={`${dependency.skillId}-${dependency.prerequisiteSkillId ?? dependency.prerequisiteName}-${index}`}><td className="table-primary">{dependency.skillName}</td><td>{dependency.prerequisiteName}</td><td>{strengthLabels[dependency.strength]}</td><td>{dependency.relationshipType}</td><td>{dependency.isPrerequisiteAssessed ? `${dependency.prerequisiteProficiency}/5` : "Not assessed"}</td><td><span className={`status-pill ${dependency.isReady ? "status-ready" : "status-waiting"}`}>{dependency.isReady ? "Ready" : dependency.isPrerequisiteAssessed ? "Needs improvement" : "Assessment needed"}</span></td><td>{sourceLabels[dependency.source]}</td><td>{validationLabels[dependency.validationStatus]}</td><td>{dependency.source === "ai" && dependency.confidence !== null ? `${Math.round(dependency.confidence * 100)}%` : "—"}</td><td className="reason-cell">{dependency.explanation || "—"}</td></tr>)}
                </tbody></table></div>
              )}
            </section>

            <section className="analysis-panel">
              <div className="section-heading"><div><span className="section-kicker">SKILL BREAKDOWN</span><h2>Skill-by-skill results</h2><p>Review your self-assessed proficiency and the resulting gap classification.</p></div></div>
              {analysis.skills.length === 0 ? <div className="empty-state compact"><p>No active skills were matched in this job description. The analysis cannot assess technologies that were not recognized by the current skill database.</p></div> : (
                <div className="table-scroll"><table><thead><tr><th>Skill</th><th>Category</th><th>Self-assessed proficiency</th><th>Analysis result</th></tr></thead><tbody>
                  {analysis.skills.map((skill) => <tr key={skill.skillId}><td className="table-primary">{skill.skillName}</td><td>{skill.category ?? "—"}</td><td>{skill.proficiencyLevel === null ? "Not assessed" : `${skill.proficiencyLevel}/5`}</td><td><span className={`status-pill status-${skill.status}`}>{statusLabels[skill.status]}</span></td></tr>)}
                </tbody></table></div>
              )}
            </section>

            <section className="analysis-panel assessment-panel">
              <div className="section-heading"><div><span className="section-kicker">COMPLETE YOUR PROFILE</span><h2>Assess missing skills</h2><p>Rate your current knowledge of each unassessed skill. Choose 0 if you have no knowledge of a skill.</p></div><span className="assessment-count">{missingSkills.length} <small>to assess</small></span></div>
              {missingSkills.length === 0 ? <div className="assessment-complete"><span>✓</span><div><strong>You're all caught up!</strong><p>All extracted skills have been assessed.</p></div></div> : (
                <form className="missing-skills-form" onSubmit={handleSubmitMissingRatings}>
                  <div className="missing-skills-grid">
                    {missingSkills.map((skill, index) => (
                      <div className="missing-skill-card" key={skill.skillId}>
                        <div className="missing-skill-heading"><span className="missing-skill-index">{String(index + 1).padStart(2, "0")}</span><div><label htmlFor={`missing-${skill.skillId}`}>{skill.skillName}</label><small>{skill.category || "Required skill"}</small></div></div>
                        <select id={`missing-${skill.skillId}`} value={missingRatings[skill.skillId] ?? ""} onChange={(event) => updateMissingRating(skill.skillId, event.target.value)} required>
                          <option value="">Select your proficiency</option>
                          {proficiencyLevels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="assessment-form-footer"><p>Your latest skill assessment will be updated with these ratings.</p><button className="primary-button" type="submit" disabled={savingRatings || analyzing}>{savingRatings ? <><span className="button-spinner" /> Saving ratings...</> : <>Save ratings &amp; refresh analysis <span>→</span></>}</button></div>
                </form>
              )}
            </section>

            <div className="research-note"><span className="research-note-icon">i</span><p><strong>Research note</strong> Results are based on self-reported proficiency and automatically extracted skills. They do not represent an objective test of technical competence.</p></div>
          </div>
        )}
      </div>
    </main>
  );
};

export default SkillGapAnalysisPage;
