
import { useEffect, useState, type FormEvent } from "react";
import {
  getMyLearnerProfile,
  getAvailableRoles,
  saveMyLearnerProfile,
} from "../../features/learner/learner.service";
import type {
  EducationLevel,
  LearnerProfile,
  LearnerProfileInput,
  ProfessionalStatus,
  Role,
} from "../../features/learner/types";
import "./LearnerProfilePage.css";

const educationLevels: { value: EducationLevel; label: string }[] = [
  { value: "high_school", label: "High School" },
  { value: "diploma", label: "Diploma" },
  { value: "bachelors", label: "Bachelor's Degree" },
  { value: "masters", label: "Master's Degree" },
  { value: "doctoral", label: "Doctoral Degree" },
  { value: "other", label: "Other" },
];

const professionalStatuses: {
  value: ProfessionalStatus;
  label: string;
}[] = [
  { value: "student", label: "Student" },
  { value: "employed", label: "Employed" },
  { value: "unemployed", label: "Unemployed" },
  { value: "freelancer", label: "Freelancer" },
  { value: "career_switcher", label: "Career Switcher" },
  { value: "other", label: "Other" },
];

const LearnerProfilePage = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [educationLevel, setEducationLevel] =
    useState<EducationLevel>("bachelors");
  const [professionalStatus, setProfessionalStatus] =
    useState<ProfessionalStatus>("student");
  const [yearsOfExperience, setYearsOfExperience] = useState("0");
  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const availableRoles = await getAvailableRoles();
        if (!active) return;

        setRoles(availableRoles);

        try {
          const savedProfile = await getMyLearnerProfile();
          if (!active) return;

          setProfile(savedProfile);
          setEducationLevel(savedProfile.educationLevel);
          setProfessionalStatus(savedProfile.professionalStatus);
          setYearsOfExperience(String(savedProfile.yearsOfExperience));
          setTargetRole(savedProfile.targetRole._id);
        } catch (err) {
          // A missing profile is normal for a first-time learner.
          if (
            !(err instanceof Error) ||
            !err.message.toLowerCase().includes("profile")
          ) {
            throw err;
          }
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load learner profile data.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const experience = Number(yearsOfExperience);

    if (
      yearsOfExperience.trim() === "" ||
      !Number.isFinite(experience) ||
      experience < 0
    ) {
      setError("Enter a valid, non-negative number of years.");
      return;
    }

    if (!targetRole) {
      setError("Please select your target role.");
      return;
    }

    const input: LearnerProfileInput = {
      educationLevel,
      professionalStatus,
      yearsOfExperience: experience,
      targetRole,
    };

    setSaving(true);

    try {
      const savedProfile = await saveMyLearnerProfile(input);
      setProfile(savedProfile);
      setTargetRole(savedProfile.targetRole._id);
      setMessage("Your learner profile has been saved successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save your learner profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="learner-page">
        <div className="learner-loading" role="status">
          <span className="learner-spinner" />
          <p>Loading your learner profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="learner-page">
      <div className="learner-container">
        <header className="learner-header">
          <div className="learner-header-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
              <path d="m17 11 2 2 4-4" />
            </svg>
          </div>

          <div>
            <p className="learner-eyebrow">YOUR LEARNING JOURNEY</p>
            <h1 className="learner-title">Learner Profile</h1>
            <p className="learner-subtitle">
              Tell us about your background and career goals so we can help
              identify the skills you need to grow.
            </p>
          </div>
        </header>

        <div className="learner-progress-card">
          <div className="learner-progress-copy">
            <div>
              <p className="learner-progress-title">
                {profile ? "Profile details" : "Build your learner profile"}
              </p>
              <p className="learner-progress-description">
                {profile
                  ? "Keep your information up to date as your career evolves."
                  : "Complete the details below to personalize your skill-gap analysis."}
              </p>
            </div>
            <span className="learner-status-pill">
              {profile ? "Profile saved" : "Getting started"}
            </span>
          </div>
          <div className="learner-progress-track">
            <div
              className={`learner-progress-fill ${
                profile ? "is-complete" : ""
              }`}
            />
          </div>
        </div>

        {error && (
          <div className="learner-alert learner-alert-error" role="alert">
            <span className="learner-alert-icon" aria-hidden="true">
              !
            </span>
            <p>{error}</p>
            <button
              type="button"
              className="learner-alert-dismiss"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {message && (
          <div className="learner-alert learner-alert-success" role="status">
            <span className="learner-alert-icon" aria-hidden="true">
              ✓
            </span>
            <p>{message}</p>
            <button
              type="button"
              className="learner-alert-dismiss"
              onClick={() => setMessage("")}
              aria-label="Dismiss success message"
            >
              ×
            </button>
          </div>
        )}

        <form className="learner-form-card" onSubmit={handleSubmit}>
          <div className="learner-section-heading">
            <span className="learner-section-number">01</span>
            <div>
              <h2>Background information</h2>
              <p>Share your current education and professional status.</p>
            </div>
          </div>

          <div className="learner-form-grid">
            <div className="learner-field">
              <label htmlFor="educationLevel">
                Education level <span className="learner-required">*</span>
              </label>
              <select
                id="educationLevel"
                value={educationLevel}
                onChange={(event) =>
                  setEducationLevel(event.target.value as EducationLevel)
                }
                required
              >
                {educationLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
              <span className="learner-field-hint">
                Select your highest or current level of education.
              </span>
            </div>

            <div className="learner-field">
              <label htmlFor="professionalStatus">
                Professional status{" "}
                <span className="learner-required">*</span>
              </label>
              <select
                id="professionalStatus"
                value={professionalStatus}
                onChange={(event) =>
                  setProfessionalStatus(
                    event.target.value as ProfessionalStatus,
                  )
                }
                required
              >
                {professionalStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <span className="learner-field-hint">
                Choose the option that best describes you.
              </span>
            </div>

            <div className="learner-field learner-field-full">
              <label htmlFor="yearsOfExperience">
                Years of experience{" "}
                <span className="learner-required">*</span>
              </label>
              <div className="learner-input-suffix">
                <input
                  id="yearsOfExperience"
                  type="number"
                  min="0"
                  step="any"
                  value={yearsOfExperience}
                  onChange={(event) =>
                    setYearsOfExperience(event.target.value)
                  }
                  placeholder="e.g. 1.5"
                  required
                />
                <span>years</span>
              </div>
              <span className="learner-field-hint">
                Include relevant professional or practical experience. Enter
                0 if you are just starting out.
              </span>
            </div>
          </div>

          <div className="learner-section-divider" />

          <div className="learner-section-heading">
            <span className="learner-section-number">02</span>
            <div>
              <h2>Career goals</h2>
              <p>Choose the role you want to work toward.</p>
            </div>
          </div>

          <div className="learner-field">
            <label htmlFor="targetRole">
              Target role <span className="learner-required">*</span>
            </label>
            <select
              id="targetRole"
              value={targetRole}
              onChange={(event) => setTargetRole(event.target.value)}
              required
              disabled={roles.length === 0}
            >
              <option value="">Select your target role</option>
              {roles.map((role) => (
                <option key={role._id} value={role._id}>
                  {role.name}
                </option>
              ))}
            </select>
            <span className="learner-field-hint">
              Your target role helps the analyzer determine which skills are
              relevant to your career path.
            </span>

            {roles.length === 0 && (
              <p className="learner-empty-roles">
                No active roles are available right now. Please try again later
                or contact your administrator.
              </p>
            )}
          </div>

          <div className="learner-form-footer">
            <div className="learner-footer-note">
              <span aria-hidden="true">🔒</span>
              <span>Your profile helps personalize your skill-gap analysis.</span>
            </div>

            <button
              type="submit"
              className="learner-submit-button"
              disabled={saving || roles.length === 0}
            >
              {saving ? (
                <>
                  <span className="learner-button-spinner" />
                  Saving...
                </>
              ) : (
                <>
                  {profile ? "Update profile" : "Save profile"}
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </div>
        </form>

        {profile && (
          <p className="learner-last-updated">
            Last updated{" "}
            <strong>
              {new Date(profile.updatedAt).toLocaleString()}
            </strong>
          </p>
        )}
      </div>
    </main>
  );
};

export default LearnerProfilePage;
