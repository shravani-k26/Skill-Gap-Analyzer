
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  createJobDescription,
  extractSkillsFromJobDescription,
  getAllJobDescriptions,
  uploadPdfJobDescription,
} from "../../features/job-description/jobDescription.service";
import type {
  CreateJobDescriptionInput,
} from "../../features/job-description/jobDescription.service";
import type {
  JobDescription,
  ExtractedSkillsResult,
} from "../../features/job-description/types";
import { getAllRoles } from "../../features/role-management/roleManagement.service";
import type { Role } from "../../features/role-management/types";
import "./JobDescriptionPage.css";

type InputMode = "text" | "pdf";

const JobDescriptionPage = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([]);
  const [inputMode, setInputMode] = useState<InputMode>("text");

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extractingId, setExtractingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [extraction, setExtraction] =
    useState<ExtractedSkillsResult | null>(null);

  const loadData = useCallback(async () => {
    setError("");

    try {
      const [rolesData, descriptionsData] = await Promise.all([
        getAllRoles(),
        getAllJobDescriptions(),
      ]);

      setRoles(rolesData);
      setJobDescriptions(descriptionsData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load job descriptions.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleModeChange = (mode: InputMode) => {
    setInputMode(mode);
    setError("");
    setSuccess("");
    setExtraction(null);
    setPdfFile(null);
  };

  const handleFileChange = (file: File | null) => {
    setError("");
    setPdfFile(null);

    if (!file) return;

    if (
      file.type !== "application/pdf" ||
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please select a valid PDF file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("The PDF file must be 5 MB or smaller.");
      return;
    }

    setPdfFile(file);

    if (!title.trim()) {
      setTitle(file.name.replace(/\.pdf$/i, ""));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setExtraction(null);

    if (title.trim().length < 3) {
      setError("Job title must contain at least 3 characters.");
      return;
    }

    if (!targetRole) {
      setError("Please select a target role.");
      return;
    }

    if (inputMode === "text" && description.trim().length < 50) {
      setError("Job description must contain at least 50 characters.");
      return;
    }

    if (inputMode === "pdf" && !pdfFile) {
      setError("Please select a PDF file to upload.");
      return;
    }

    setSaving(true);

    try {
      if (inputMode === "text") {
        const input: CreateJobDescriptionInput = {
          title: title.trim(),
          description: description.trim(),
          inputType: "text",
          targetRole,
          ...(company.trim() ? { company: company.trim() } : {}),
        };

        await createJobDescription(input);
      } else {
        await uploadPdfJobDescription({
          title: title.trim(),
          targetRole,
          file: pdfFile!,
          ...(company.trim() ? { company: company.trim() } : {}),
        });
      }

      setTitle("");
      setCompany("");
      setDescription("");
      setTargetRole("");
      setPdfFile(null);

      setSuccess(
        inputMode === "pdf"
          ? "PDF uploaded and job description saved successfully."
          : "Job description saved successfully.",
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save the job description.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleExtractSkills = async (id: string) => {
    setError("");
    setSuccess("");
    setExtraction(null);
    setExtractingId(id);

    try {
      const result = await extractSkillsFromJobDescription(id);
      setExtraction(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to extract skills.",
      );
    } finally {
      setExtractingId("");
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return "Date unavailable";

    const parsedDate = new Date(date);

    return Number.isNaN(parsedDate.getTime())
      ? "Date unavailable"
      : parsedDate.toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  };

  if (loading) {
    return (
      <main className="jd-page">
        <div className="jd-loading">
          <span className="jd-spinner" />
          <h2>Preparing your workspace</h2>
          <p>Loading roles and saved job descriptions...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="jd-page">
      <div className="jd-container">
        <header className="jd-hero">
          <div className="jd-hero-content">
            <span className="jd-eyebrow">
              <span className="jd-eyebrow-dot" />
              SKILL GAP ANALYZER
            </span>

            <h1>
              Job Description
              <span> Analysis</span>
            </h1>

            <p>
              Turn job descriptions into meaningful skill insights.
              Add a role, identify the skills employers need, and build
              a foundation for skill-gap analysis.
            </p>

            <div className="jd-hero-points">
              <span>✓ Text or PDF input</span>
              <span>✓ Skill extraction</span>
              <span>✓ Organized job library</span>
            </div>
          </div>

          <div className="jd-hero-art" aria-hidden="true">
            <div className="jd-art-orbit jd-art-orbit-one" />
            <div className="jd-art-orbit jd-art-orbit-two" />
            <div className="jd-art-document">
              <span className="jd-art-file-icon">JD</span>
              <span className="jd-art-line jd-art-line-long" />
              <span className="jd-art-line" />
              <span className="jd-art-line jd-art-line-medium" />
              <div className="jd-art-skill">
                <span>✦</span> Skills detected
              </div>
            </div>
            <span className="jd-art-spark jd-art-spark-one">✦</span>
            <span className="jd-art-spark jd-art-spark-two">✧</span>
          </div>
        </header>

        <section className="jd-stats" aria-label="Job description summary">
          <article className="jd-stat-card">
            <div className="jd-stat-icon jd-stat-icon-purple">▤</div>
            <div>
              <p>Total job descriptions</p>
              <strong>{jobDescriptions.length}</strong>
              <span>Saved in your library</span>
            </div>
          </article>

          <article className="jd-stat-card">
            <div className="jd-stat-icon jd-stat-icon-pink">◎</div>
            <div>
              <p>Available target roles</p>
              <strong>{roles.length}</strong>
              <span>Roles to choose from</span>
            </div>
          </article>

          <article className="jd-stat-card">
            <div className="jd-stat-icon jd-stat-icon-blue">✧</div>
            <div>
              <p>Input methods</p>
              <strong>02</strong>
              <span>Text and PDF supported</span>
            </div>
          </article>
        </section>

        {error && (
          <div className="jd-alert jd-alert-error" role="alert">
            <span className="jd-alert-icon">!</span>
            <p>{error}</p>
            <button
              type="button"
              className="jd-alert-close"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="jd-alert jd-alert-success" role="status">
            <span className="jd-alert-icon">✓</span>
            <p>{success}</p>
            <button
              type="button"
              className="jd-alert-close"
              onClick={() => setSuccess("")}
              aria-label="Dismiss success message"
            >
              ×
            </button>
          </div>
        )}

        <section className="jd-panel jd-form-panel">
          <div className="jd-section-heading">
            <div>
              <span className="jd-section-kicker">GET STARTED</span>
              <h2>Add a job description</h2>
              <p>Provide the job details to begin identifying relevant skills.</p>
            </div>
            <span className="jd-step-badge">STEP 01</span>
          </div>

          <div className="jd-mode-switch" aria-label="Choose input type">
            <button
              type="button"
              className={`jd-mode-option ${inputMode === "text" ? "active" : ""}`}
              onClick={() => handleModeChange("text")}
              disabled={saving}
              aria-pressed={inputMode === "text"}
            >
              <span className="jd-mode-icon">T</span>
              <span>
                <strong>Enter text</strong>
                <small>Paste a job description</small>
              </span>
              <span className="jd-mode-check">
                {inputMode === "text" ? "✓" : ""}
              </span>
            </button>

            <button
              type="button"
              className={`jd-mode-option ${inputMode === "pdf" ? "active" : ""}`}
              onClick={() => handleModeChange("pdf")}
              disabled={saving}
              aria-pressed={inputMode === "pdf"}
            >
              <span className="jd-mode-icon jd-mode-icon-pdf">PDF</span>
              <span>
                <strong>Upload PDF</strong>
                <small>Choose a PDF document</small>
              </span>
              <span className="jd-mode-check">
                {inputMode === "pdf" ? "✓" : ""}
              </span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="jd-form">
            <div className="jd-form-grid">
              <div className="jd-field">
                <label htmlFor="job-title">Job title <span>*</span></label>
                <input
                  id="job-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Full-Stack Developer"
                  minLength={3}
                  maxLength={200}
                  required
                  disabled={saving}
                />
              </div>

              <div className="jd-field">
                <label htmlFor="job-company">Company <small>(optional)</small></label>
                <input
                  id="job-company"
                  type="text"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  placeholder="e.g. Company name"
                  maxLength={200}
                  disabled={saving}
                />
              </div>

              <div className="jd-field jd-field-full">
                <label htmlFor="target-role">Target role <span>*</span></label>
                <select
                  id="target-role"
                  value={targetRole}
                  onChange={(event) => setTargetRole(event.target.value)}
                  required
                  disabled={saving}
                >
                  <option value="">Select the role this job description belongs to</option>
                  {roles.map((role) => (
                    <option key={role._id} value={role._id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                {roles.length === 0 && (
                  <small className="jd-field-note">
                    No roles are available yet. Add a role in Role Management first.
                  </small>
                )}
              </div>

              {inputMode === "text" ? (
                <div className="jd-field jd-field-full">
                  <div className="jd-label-row">
                    <label htmlFor="job-description">
                      Job description <span>*</span>
                    </label>
                    <span className="jd-character-count">
                      {description.length.toLocaleString()} / 20,000
                    </span>
                  </div>
                  <textarea
                    id="job-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Paste the job description here, including responsibilities, required qualifications, technical skills, and experience..."
                    rows={8}
                    minLength={50}
                    maxLength={20000}
                    required
                    disabled={saving}
                  />
                  <div className="jd-field-footer">
                    <span>Minimum 50 characters</span>
                    <span>{description.trim().length >= 50 ? "Ready to submit" : "Add more details"}</span>
                  </div>
                </div>
              ) : (
                <div className="jd-field jd-field-full">
                  <label htmlFor="pdf-file">Job description PDF <span>*</span></label>
                  <label
                    className={`jd-upload-zone ${pdfFile ? "jd-upload-selected" : ""}`}
                    htmlFor="pdf-file"
                  >
                    <input
                      id="pdf-file"
                      className="jd-file-input"
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(event) =>
                        handleFileChange(event.target.files?.[0] ?? null)
                      }
                      disabled={saving}
                      required={!pdfFile}
                    />
                    <span className="jd-upload-icon">↑</span>
                    <strong>
                      {pdfFile ? "PDF ready to upload" : "Choose a PDF file"}
                    </strong>
                    <span>
                      {pdfFile
                        ? "Select another file to replace it"
                        : "Click to browse files on your device"}
                    </span>
                    <small>PDF format · Maximum size 5 MB</small>
                  </label>

                  {pdfFile && (
                    <div className="jd-file-preview">
                      <span className="jd-file-badge">PDF</span>
                      <div className="jd-file-details">
                        <strong>{pdfFile.name}</strong>
                        <span>{(pdfFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                      <button
                        type="button"
                        className="jd-remove-file"
                        onClick={() => setPdfFile(null)}
                        disabled={saving}
                        aria-label="Remove selected PDF"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="jd-form-actions">
              <p><span>*</span> Required fields</p>
              <button
                type="submit"
                className="jd-primary-button"
                disabled={saving || (inputMode === "pdf" && !pdfFile)}
              >
                {saving ? (
                  <>
                    <span className="jd-button-spinner" />
                    {inputMode === "pdf" ? "Uploading PDF..." : "Saving..."}
                  </>
                ) : (
                  <>
                    {inputMode === "pdf" ? "Upload & Save" : "Save Job Description"}
                    <span aria-hidden="true">→</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        <section className="jd-library-section">
          <div className="jd-section-heading jd-library-heading">
            <div>
              <span className="jd-section-kicker">YOUR WORKSPACE</span>
              <h2>Saved job descriptions</h2>
              <p>Manage your saved job descriptions and extract their skills.</p>
            </div>
            <span className="jd-count-badge">
              {jobDescriptions.length} {jobDescriptions.length === 1 ? "item" : "items"}
            </span>
          </div>

          {jobDescriptions.length === 0 ? (
            <div className="jd-empty-state">
              <span className="jd-empty-icon">▤</span>
              <h3>Your library is ready</h3>
              <p>
                No job descriptions yet. Add your first one using the form above
                to start discovering the skills employers are looking for.
              </p>
            </div>
          ) : (
            <div className="jd-job-grid">
              {jobDescriptions.map((job) => {
                const roleName =
                  typeof job.targetRole === "string"
                    ? job.targetRole
                    : job.targetRole?.name;

                return (
                  <article className="jd-job-card" key={job._id}>
                    <div className="jd-job-card-top">
                      <span className={`jd-job-type ${job.inputType === "pdf" ? "jd-job-type-pdf" : ""}`}>
                        {job.inputType === "pdf" ? "PDF DOCUMENT" : "TEXT ENTRY"}
                      </span>
                      <span className="jd-job-symbol">↗</span>
                    </div>

                    <h3>{job.title}</h3>
                    <p className="jd-job-company">
                      {job.company || "Company not specified"}
                    </p>

                    <div className="jd-job-meta">
                      <span className="jd-meta-label">TARGET ROLE</span>
                      <span className="jd-role-chip">{roleName || "Not specified"}</span>
                    </div>

                    {job.originalFileName && (
                      <p className="jd-original-file" title={job.originalFileName}>
                        <span>▧</span> {job.originalFileName}
                      </p>
                    )}

                    <div className="jd-job-footer">
                      <span className="jd-job-date">
                        <span>◷</span> {formatDate(job.createdAt)}
                      </span>
                      <button
                        type="button"
                        className="jd-extract-button"
                        disabled={extractingId !== ""}
                        onClick={() => void handleExtractSkills(job._id)}
                      >
                        {extractingId === job._id ? (
                          <>
                            <span className="jd-button-spinner" />
                            Extracting...
                          </>
                        ) : (
                          <>Extract skills <span aria-hidden="true">→</span></>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {extraction && (
          <section className="jd-panel jd-results-panel" aria-live="polite">
            <div className="jd-section-heading">
              <div>
                <span className="jd-section-kicker">ANALYSIS RESULTS</span>
                <h2>Extracted skills</h2>
                <p>
                  Matched skills identified in{" "}
                  <strong>{extraction.title}</strong>.
                </p>
              </div>
              <span className="jd-results-count">
                {extraction.totalMatchedSkills} matched
              </span>
            </div>

            {extraction.matchedSkills.length === 0 ? (
              <div className="jd-no-skills">
                <span>✧</span>
                <h3>No matching skills found</h3>
                <p>
                  Try a more detailed job description with explicit technical
                  skills, tools, technologies, and qualifications.
                </p>
              </div>
            ) : (
              <>
                <div className="jd-skills-summary">
                  <span className="jd-skills-summary-icon">✦</span>
                  <div>
                    <strong>{extraction.totalMatchedSkills} skills matched</strong>
                    <p>Review the skills recognized from this job description.</p>
                  </div>
                </div>

                <div className="jd-skill-list">
                  {extraction.matchedSkills.map((skill) => (
                    <span className="jd-skill-tag" key={skill.id}>
                      <span>✓</span>
                      {skill.name}
                      {skill.category && (
                        <small>{skill.category}</small>
                      )}
                    </span>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
};

export default JobDescriptionPage;
