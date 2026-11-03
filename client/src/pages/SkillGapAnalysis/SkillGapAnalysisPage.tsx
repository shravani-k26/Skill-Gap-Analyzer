
import { useEffect, useState, type FormEvent } from "react";

import { getAllJobDescriptions } from "../../features/job-description/jobDescription.service";

import type {
  JobDescription,
} from "../../features/job-description/types";

import {
  getMySkillGapAnalysis,
  getMySkillGapComparison,
  getMyLatestSkills,
  submitSkillAssessment,
} from "../../features/learner/learner.service";

import type {
  SkillGapComparison,
} from "../../features/learner/learner.service";

// --------------------------------------------------
// 1. Types
// --------------------------------------------------

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

type DependencyStrength =
  | "strong"
  | "moderate"
  | "optional";

type DependencySource =
  | "predefined"
  | "ai";

type DependencyValidationStatus =
  | "pending"
  | "accepted"
  | "rejected";

type DependencyRelationshipType =
  | "prerequisite"
  | "recommended";

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

  assessment: {
    id: string;
    assessedAt: string;
  } | null;

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

// --------------------------------------------------
// 2. Constants and labels
// --------------------------------------------------

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

const validationLabels: Record<
  DependencyValidationStatus,
  string
> = {
  pending: "Pending review",
  accepted: "Accepted",
  rejected: "Rejected",
};

// --------------------------------------------------
// 3. Comparison method information
// --------------------------------------------------

const comparisonMethods = [
  {
    key: "proficiencyOnly",
    title: "Based on Your Skill Level",
    subtitle: "Proficiency-only baseline",
    description:
      "Prioritizes skills according to your current proficiency gaps. It does not consider prerequisite relationships.",
  },
  {
    key: "predefined",
    title: "Based on Skill Relationships",
    subtitle: "Predefined dependency-aware method",
    description:
      "Uses predefined relationships between skills to organize a suitable learning order.",
  },
  {
    key: "hybrid",
    title: "AI-Assisted Learning Plan",
    subtitle: "Hybrid AI-assisted method",
    description:
      "Combines predefined skill relationships with AI suggestions that you have accepted.",
  },
] as const;

// --------------------------------------------------
// 4. Component
// --------------------------------------------------

const SkillGapAnalysisPage = () => {
  const [jobDescriptions, setJobDescriptions] = useState<
    JobDescription[]
  >([]);

  const [selectedId, setSelectedId] = useState("");

  const [analysis, setAnalysis] =
    useState<SkillGapAnalysis | null>(null);

  const [comparison, setComparison] =
    useState<SkillGapComparison | null>(null);

  const [missingRatings, setMissingRatings] = useState<
    Record<string, number>
  >({});

  const [loadingDescriptions, setLoadingDescriptions] =
    useState(true);

  const [analyzing, setAnalyzing] = useState(false);
  const [savingRatings, setSavingRatings] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // --------------------------------------------------
  // 5. Load saved job descriptions
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    const loadJobDescriptions = async () => {
      try {
        const descriptions = await getAllJobDescriptions();

        if (active) {
          setJobDescriptions(descriptions);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load saved job descriptions."
          );
        }
      } finally {
        if (active) {
          setLoadingDescriptions(false);
        }
      }
    };

    void loadJobDescriptions();

    return () => {
      active = false;
    };
  }, []);

  // --------------------------------------------------
  // 6. Analyze selected job description
  // --------------------------------------------------

  const handleAnalyze = async (
    event: FormEvent<HTMLFormElement>
  ) => {
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
      const [analysisResult, comparisonResult] =
        await Promise.all([
          getMySkillGapAnalysis(selectedId),
          getMySkillGapComparison(selectedId),
        ]);

      setAnalysis(analysisResult);
      setComparison(comparisonResult);

      setMessage(
        "Skill gap analysis and method comparison completed successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to analyze your skill gaps."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  // --------------------------------------------------
  // 7. Submit missing skill ratings
  // --------------------------------------------------

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
      setError(
        "Please rate every unassessed skill before submitting."
      );
      return;
    }

    setSavingRatings(true);

    try {
      const latest = await getMyLatestSkills();

      const ratingsBySkill = new Map<string, number>(
        latest.skills.map((item) => [
          item.skill._id,
          item.proficiencyLevel,
        ])
      );

      for (const skill of missingSkills) {
        ratingsBySkill.set(
          skill.skillId,
          missingRatings[skill.skillId]
        );
      }

      const skillsToSubmit = Array.from(
        ratingsBySkill,
        ([skill, proficiencyLevel]) => ({
          skill,
          proficiencyLevel,
        })
      );

      await submitSkillAssessment(skillsToSubmit);

      const jobDescriptionId = analysis.jobDescription.id;

      const [updatedAnalysis, updatedComparison] =
        await Promise.all([
          getMySkillGapAnalysis(jobDescriptionId),
          getMySkillGapComparison(jobDescriptionId),
        ]);

      setAnalysis(updatedAnalysis);
      setComparison(updatedComparison);
      setMissingRatings({});

      setMessage(
        "Missing skill ratings saved and analysis updated successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save missing skill ratings."
      );
    } finally {
      setSavingRatings(false);
    }
  };

  // --------------------------------------------------
  // 8. Loading state
  // --------------------------------------------------

  if (loadingDescriptions) {
    return (
      <main>
        <p>Loading saved job descriptions...</p>
      </main>
    );
  }

  // --------------------------------------------------
  // 9. Main UI
  // --------------------------------------------------

  return (
    <main>
      <h1>Skill Gap Analysis</h1>

      <p>
        Select a saved job description to compare its extracted skills
        with your latest self-assessment and identify learning priorities.
      </p>

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      {/* Job description selection */}

      <section>
        <h2>Select a Job Description</h2>

        {jobDescriptions.length === 0 ? (
          <p>
            No saved job descriptions were found. Save a job description
            before running an analysis.
          </p>
        ) : (
          <form onSubmit={handleAnalyze}>
            <label htmlFor="job-description">
              Job description
            </label>

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
                  {job.title}
                  {job.company ? ` — ${job.company}` : ""}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={analyzing || savingRatings}
            >
              {analyzing ? "Analyzing..." : "Analyze skill gaps"}
            </button>
          </form>
        )}
      </section>

      {/* Analysis results */}

      {analysis && (
        <>
          <hr />

          {/* 10. Job description information */}

          <section>
            <h2>{analysis.jobDescription.title}</h2>

            {analysis.jobDescription.company && (
              <p>
                Company: {analysis.jobDescription.company}
              </p>
            )}

            <p>
              Target role: {analysis.jobDescription.targetRole}
            </p>

            <p>
              Assessment used:{" "}
              {analysis.assessment
                ? new Date(
                    analysis.assessment.assessedAt
                  ).toLocaleString()
                : "No assessment available"}
            </p>
          </section>

          <hr />

          {/* 11. Analysis summary */}

          <section>
            <h2>Analysis Summary</h2>

            <ul>
              <li>
                Total extracted skills:{" "}
                {analysis.summary.totalRequiredSkills}
              </li>

              <li>
                High learning priority:{" "}
                {analysis.summary.highLearningPriority}
              </li>

              <li>
                Needs improvement:{" "}
                {analysis.summary.needsImprovement}
              </li>

              <li>
                Developing proficiency:{" "}
                {analysis.summary.developingProficiency}
              </li>

              <li>
                Relative strengths:{" "}
                {analysis.summary.relativeStrength}
              </li>

              <li>
                Not assessed: {analysis.summary.notAssessed}
              </li>
            </ul>

            <h3>Priority Distribution</h3>

            <ul>
              <li>
                Critical: {analysis.summary.priorityCounts.critical}
              </li>

              <li>
                High: {analysis.summary.priorityCounts.high}
              </li>

              <li>
                Medium: {analysis.summary.priorityCounts.medium}
              </li>

              <li>
                Low: {analysis.summary.priorityCounts.low}
              </li>

              <li>
                Assessment needed:{" "}
                {analysis.summary.priorityCounts.assessmentNeeded}
              </li>
            </ul>
          </section>

          <hr />

          {/* 12. Comparison of the three methods */}

          <section>
            <h2>Compare Learning Plans</h2>

            <p>
              The following methods use the same job description and
              skill assessment but organize learning recommendations
              differently.
            </p>

            {!comparison ? (
              <p>
                Comparison data is not available. Please run the
                analysis again.
              </p>
            ) : (
              <>
                <p>
                  <strong>Total extracted skills:</strong>{" "}
                  {comparison.commonInputs.totalExtractedSkills}
                </p>

                <p>
                  <strong>Skills assessed:</strong>{" "}
                  {comparison.commonInputs.totalAssessedSkills}
                </p>

                <p>
                  <strong>Skills not assessed:</strong>{" "}
                  {comparison.commonInputs.totalUnassessedSkills}
                </p>

                {comparisonMethods.map((item) => {
                  const method = comparison.methods[item.key];

                  const orderedSkills = [...method.skills]
                    .filter(
                      (skill) => skill.learningOrder !== null
                    )
                    .sort(
                      (a, b) =>
                        (a.learningOrder ?? 0) -
                        (b.learningOrder ?? 0)
                    );

                  const blockedSkills = method.skills.filter(
                    (skill) => skill.blockedBy.length > 0
                  );

                  return (
                    <article key={item.key}>
                      <hr />

                      <h3>{item.title}</h3>

                      <small>{item.subtitle}</small>

                      <p>{item.description}</p>

                      <ul>
                        <li>
                          <strong>Number of skill connections:</strong>{" "}
                          {method.dependencyCount}
                        </li>

                        {item.key === "hybrid" && (
                          <>
                            <li>
                              <strong>Predefined connections:</strong>{" "}
                              {method.predefinedDependencyCount ?? 0}
                            </li>

                            <li>
                              <strong>Accepted AI suggestions:</strong>{" "}
                              {method.acceptedAIDependencyCount ?? 0}
                            </li>
                          </>
                        )}
                      </ul>

                      <h4>What to Learn First</h4>

                      {orderedSkills.length === 0 ? (
                        <p>
                          No learning order is available.
                        </p>
                      ) : (
                        <ol>
                          {orderedSkills.map((skill) => (
                            <li key={skill.skillId}>
                              <strong>{skill.skillName}</strong>
                              {" — "}
                              {skill.proficiencyLabel}
                              {" | "}
                              Learning priority:{" "}
                              {skill.priorityScore !== null
                                ? `${skill.priorityScore}/100`
                                : "Not available"}
                            </li>
                          ))}
                        </ol>
                      )}

                      <h4>Skills to Learn Later</h4>

                      {blockedSkills.length === 0 ? (
                        <p>
                          No skills are currently blocked by
                          unready prerequisites.
                        </p>
                      ) : (
                        <ul>
                          {blockedSkills.map((skill) => (
                            <li key={skill.skillId}>
                              <strong>{skill.skillName}</strong>
                              {" — learn "}
                              {skill.blockedBy.join(", ")}
                              {" first."}
                            </li>
                          ))}
                        </ul>
                      )}

                      <h4>All Skill Priorities</h4>

                      {method.skills.length === 0 ? (
                        <p>No skills are available.</p>
                      ) : (
                        <table>
                          <thead>
                            <tr>
                              <th>Skill</th>
                              <th>Proficiency</th>
                              <th>Learning priority</th>
                              <th>Priority score</th>
                              <th>Learning order</th>
                            </tr>
                          </thead>

                          <tbody>
                            {method.skills.map((skill) => (
                              <tr key={skill.skillId}>
                                <td>{skill.skillName}</td>

                                <td>{skill.proficiencyLabel}</td>

                                <td>
                                  {priorityLabels[skill.priority]}
                                </td>

                                <td>
                                  {skill.priorityScore !== null
                                    ? `${skill.priorityScore}/100`
                                    : "—"}
                                </td>

                                <td>
                                  {skill.learningOrder !== null
                                    ? skill.learningOrder
                                    : "Not sequenced"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </article>
                  );
                })}
              </>
            )}
          </section>

          <hr />

          {/* 13. Learning priority and sequence */}

          <section>
            <h2>Learning Priority &amp; Sequence</h2>

            <p>
              This detailed view uses the hybrid method: predefined
              relationships and AI suggestions accepted by the learner.
            </p>

            {analysis.skills.length === 0 ? (
              <p>No skills are available for prioritization.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>What to learn first</th>
                    <th>Skill</th>
                    <th>Proficiency</th>
                    <th>Priority</th>
                    <th>Priority score</th>
                    <th>Prerequisites</th>
                    <th>Blocked by</th>
                    <th>Learning reason</th>
                    <th>Learning status</th>
                  </tr>
                </thead>

                <tbody>
                  {analysis.skills.map((skill) => (
                    <tr key={skill.skillId}>
                      <td>
                        {skill.learningOrder !== null
                          ? skill.learningOrder
                          : "Not sequenced"}
                      </td>

                      <td>
                        <strong>{skill.skillName}</strong>
                      </td>

                      <td>{skill.proficiencyLabel}</td>

                      <td>
                        {priorityLabels[skill.priority]}
                      </td>

                      <td>
                        {skill.priorityScore !== null
                          ? `${skill.priorityScore}/100`
                          : "—"}
                      </td>

                      <td>
                        {skill.prerequisiteSkills.length > 0
                          ? skill.prerequisiteSkills.join(", ")
                          : "None"}
                      </td>

                      <td>
                        {skill.blockedBy.length > 0
                          ? skill.blockedBy.join(", ")
                          : "None"}
                      </td>

                      <td>{skill.learningReason}</td>

                      <td>
                        {learningStatusLabels[skill.learningStatus]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <hr />

          {/* 14. Skill dependency analysis */}

          <section>
            <h2>Skill Dependency Analysis</h2>

            <p>
              This section displays the prerequisite relationships
              associated with skills extracted from the selected
              job description.
            </p>

            {analysis.dependencies.length === 0 ? (
              <p>
                No accepted dependencies were found for the
                extracted skills and selected role.
              </p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Target skill</th>
                    <th>Skill to learn first</th>
                    <th>Strength</th>
                    <th>Relationship type</th>
                    <th>Current proficiency</th>
                    <th>Readiness</th>
                    <th>Source</th>
                    <th>Validation status</th>
                    <th>AI confidence</th>
                    <th>Explanation</th>
                  </tr>
                </thead>

                <tbody>
                  {analysis.dependencies.map(
                    (dependency, index) => (
                      <tr
                        key={`${dependency.skillId}-${dependency.prerequisiteSkillId ?? dependency.prerequisiteName}-${index}`}
                      >
                        <td>
                          <strong>{dependency.skillName}</strong>
                        </td>

                        <td>{dependency.prerequisiteName}</td>

                        <td>
                          {strengthLabels[dependency.strength]}
                        </td>

                        <td>
                          {dependency.relationshipType}
                        </td>

                        <td>
                          {dependency.isPrerequisiteAssessed
                            ? `${dependency.prerequisiteProficiency}/5`
                            : "Not assessed"}
                        </td>

                        <td>
                          {dependency.isReady
                            ? "Ready"
                            : dependency.isPrerequisiteAssessed
                              ? "Needs improvement"
                              : "Assessment needed"}
                        </td>

                        <td>
                          {sourceLabels[dependency.source]}
                        </td>

                        <td>
                          {validationLabels[
                            dependency.validationStatus
                          ]}
                        </td>

                        <td>
                          {dependency.source === "ai" &&
                          dependency.confidence !== null
                            ? `${Math.round(
                                dependency.confidence * 100
                              )}%`
                            : "—"}
                        </td>

                        <td>
                          {dependency.explanation || "—"}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            )}
          </section>

          <hr />

          {/* 15. Skill-by-skill results */}

          <section>
            <h2>Skill-by-Skill Results</h2>

            {analysis.skills.length === 0 ? (
              <p>
                No active skills were matched in this job description.
                The analysis cannot assess technologies that were not
                recognized by the current skill database.
              </p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Skill</th>
                    <th>Category</th>
                    <th>Self-assessed proficiency</th>
                    <th>Analysis result</th>
                  </tr>
                </thead>

                <tbody>
                  {analysis.skills.map((skill) => (
                    <tr key={skill.skillId}>
                      <td>{skill.skillName}</td>

                      <td>{skill.category ?? "—"}</td>

                      <td>
                        {skill.proficiencyLevel === null
                          ? "Not assessed"
                          : `${skill.proficiencyLevel}/5`}
                      </td>

                      <td>{statusLabels[skill.status]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <hr />

          {/* 16. Missing skill assessment */}

          <section>
            <h2>Complete Missing Skills Assessment</h2>

            <p>
              Rate your current knowledge of the skills required by
              this job description. Choose 0 if you have no knowledge
              of a skill.
            </p>

            {analysis.skills.filter(
              (skill) => skill.status === "not_assessed"
            ).length === 0 ? (
              <p>All extracted skills have been assessed.</p>
            ) : (
              <form onSubmit={handleSubmitMissingRatings}>
                {analysis.skills
                  .filter(
                    (skill) => skill.status === "not_assessed"
                  )
                  .map((skill) => (
                    <div key={skill.skillId}>
                      <label htmlFor={`missing-${skill.skillId}`}>
                        <strong>{skill.skillName}</strong>

                        {skill.category
                          ? ` (${skill.category})`
                          : ""}
                      </label>

                      <select
                        id={`missing-${skill.skillId}`}
                        value={missingRatings[skill.skillId] ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;

                          setMissingRatings((current) => {
                            const next = { ...current };

                            if (value === "") {
                              delete next[skill.skillId];
                            } else {
                              next[skill.skillId] = Number(value);
                            }

                            return next;
                          });
                        }}
                        required
                      >
                        <option value="">Select proficiency</option>

                        {proficiencyLevels.map((level) => (
                          <option
                            key={level.value}
                            value={level.value}
                          >
                            {level.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}

                <button
                  type="submit"
                  disabled={savingRatings || analyzing}
                >
                  {savingRatings
                    ? "Saving ratings..."
                    : "Submit missing skill ratings"}
                </button>
              </form>
            )}
          </section>

          <hr />

          {/* 17. Research disclaimer */}

          <p>
            Results are based on self-reported proficiency and
            automatically extracted skills. They do not represent
            an objective test of technical competence.
          </p>
        </>
      )}
    </main>
  );
};

export default SkillGapAnalysisPage;
