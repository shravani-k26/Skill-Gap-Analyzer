import { useEffect, useState, type FormEvent } from "react";

import {
  getAllJobDescriptions,
} from "../../features/job-description/jobDescription.service";

import type {
  JobDescription,
} from "../../features/job-description/types";

import {
  getMySkillGapAnalysis,
  getMyLatestSkills,
  submitSkillAssessment,
} from "../../features/learner/learner.service";

type SkillGapStatus =
  | "high_learning_priority"
  | "needs_improvement"
  | "developing_proficiency"
  | "relative_strength"
  | "not_assessed";

interface AnalysisSkill {
  skillId: string;
  skillName: string;
  category?: string;
  proficiencyLevel: number | null;
  proficiencyLabel: string;
  status: SkillGapStatus;
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
  };
  skills: AnalysisSkill[];
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

const SkillGapAnalysisPage = () => {
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [analysis, setAnalysis] = useState<SkillGapAnalysis | null>(null);

  const [missingRatings, setMissingRatings] = useState<
    Record<string, number>
  >({});

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

  const handleAnalyze = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedId) {
      setError("Please select a job description.");
      return;
    }

    setError("");
    setMessage("");
    setAnalysis(null);
    setMissingRatings({});
    setAnalyzing(true);

    try {
      const result = await getMySkillGapAnalysis(selectedId);

      setAnalysis(result);
      setMessage("Skill gap analysis completed successfully.");
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
      // Retrieve the learner's latest assessment.
      const latest = await getMyLatestSkills();

      // Preserve existing ratings so they are not lost in the new
      // assessment document.
      const ratingsBySkill = new Map<string, number>(
        latest.skills.map((item) => [
          item.skill._id,
          item.proficiencyLevel,
        ])
      );

      // Add ratings for skills missing from the latest assessment.
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

      // This creates a new assessment; it does not overwrite history.
      await submitSkillAssessment(skillsToSubmit);

      // Fetch the updated analysis using the newly saved assessment.
      const updatedAnalysis = await getMySkillGapAnalysis(
        analysis.jobDescription.id
      );

      setAnalysis(updatedAnalysis);
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

  if (loadingDescriptions) {
    return (
      <main>
        <p>Loading saved job descriptions...</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Skill Gap Analysis</h1>

      <p>
        Select a saved job description to compare its extracted skills
        with your latest self-assessment.
      </p>

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

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

      {analysis && (
        <>
          <hr />

          <section>
            <h2>{analysis.jobDescription.title}</h2>

            {analysis.jobDescription.company && (
              <p>Company: {analysis.jobDescription.company}</p>
            )}

            <p>
              Assessment used:{" "}
              {analysis.assessment
                ? new Date(
                    analysis.assessment.assessedAt
                  ).toLocaleString()
                : "No assessment available"}
            </p>

            <h3>Analysis Summary</h3>

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
          </section>

          <hr />

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
