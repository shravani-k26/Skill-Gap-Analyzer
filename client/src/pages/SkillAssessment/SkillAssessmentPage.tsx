
import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  getMyLearnerProfile,
  getSkillsByRole,
  submitSkillAssessment,
  getMyAssessmentHistory,
  getMyLatestSkills,
} from "../../features/learner/learner.service";

import type {
  RoleSkillRequirement,
} from "../../features/learner/learner.service";

import type { SkillAssessment } from "../../features/learner/types";

const proficiencyLevels = [
  { value: 0, label: "0 - No knowledge" },
  { value: 1, label: "1 - Beginner" },
  { value: 2, label: "2 - Basic" },
  { value: 3, label: "3 - Intermediate" },
  { value: 4, label: "4 - Advanced" },
  { value: 5, label: "5 - Expert" },
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
    return <p>Loading your role-specific skills and assessment history...</p>;
  }

  if (error && requirements.length === 0) {
    return (
      <main>
        <h1>Skill Assessment</h1>
        <p role="alert">{error}</p>
        <p>
          If you haven't created your learner profile yet, complete it before
          starting a skill assessment.
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1>Skill Assessment</h1>

      <p>
        Target role: <strong>{roleName}</strong>
      </p>

      <p>
        Rate your current proficiency in the skills associated with your
        selected role.
      </p>

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      <section>
        <h2>Rate Your Skills</h2>

        {requirements.length === 0 ? (
          <p>No active skill requirements were found for this role.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            {requirements.map(({ skill }) => (
              <div key={skill._id}>
                <label htmlFor={`skill-${skill._id}`}>
                  {skill.name}
                  {skill.category ? ` (${skill.category})` : ""}
                </label>

                <select
                  id={`skill-${skill._id}`}
                  value={ratings[skill._id] ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;

                    setRatings((current) => {
                      const next = { ...current };

                      if (value === "") {
                        delete next[skill._id];
                      } else {
                        next[skill._id] = Number(value);
                      }

                      return next;
                    });
                  }}
                >
                  <option value="">Not rated</option>

                  {proficiencyLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <button
              type="submit"
              disabled={submitting || Object.keys(ratings).length === 0}
            >
              {submitting ? "Submitting..." : "Submit assessment"}
            </button>
          </form>
        )}
      </section>

      <hr />

      <section>
        <h2>Latest Assessment</h2>

        {latestSkills.length === 0 ? (
          <p>No assessment submitted yet.</p>
        ) : (
          <>
            <ul>
              {latestSkills.map((item) => (
                <li key={item.skill._id}>
                  {item.skill.name}: {item.proficiencyLevel}/5
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <hr />

      <section>
        <h2>Assessment History</h2>

        {historyError && <p role="alert">{historyError}</p>}

        {historyLoading && <p>Refreshing assessment history...</p>}

        {!historyLoading && history.length === 0 && (
          <p>No previous assessments found.</p>
        )}

        {history.map((assessment) => (
          <article key={assessment._id}>
            <h3>{assessment.targetRole.name}</h3>

            <p>
              Submitted:{" "}
              {new Date(assessment.assessedAt).toLocaleString()}
            </p>

            <ul>
              {assessment.skills.map((item) => (
                <li key={item.skill._id}>
                  {item.skill.name}: {item.proficiencyLevel}/5
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
};

export default SkillAssessmentPage;
