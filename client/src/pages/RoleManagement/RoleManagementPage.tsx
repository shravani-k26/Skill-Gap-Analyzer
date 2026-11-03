import { useEffect, useState } from "react";
import "./RoleManagementPage.css";

import {
  getAllRoles,
  getSkillsByRole,
} from "../../features/role-management/roleManagement.service";

import type {
  Role,
  RoleSkillRequirement,
} from "../../features/role-management/types";

const RoleManagementPage = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [requirements, setRequirements] = useState<
    RoleSkillRequirement[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [skillsLoading, setSkillsLoading] = useState(false);

  const [error, setError] = useState("");
  const [skillsError, setSkillsError] = useState("");

  // Load all available roles.
  useEffect(() => {
    let active = true;

    const loadRoles = async () => {
      try {
        const data = await getAllRoles();

        if (active) {
          setRoles(data);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load roles.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadRoles();

    return () => {
      active = false;
    };
  }, []);

  // Load active skills for the selected role.
  const handleRoleChange = async (roleName: string) => {
    setSelectedRole(roleName);
    setRequirements([]);
    setSkillsError("");

    if (!roleName) {
      setSkillsLoading(false);
      return;
    }

    setSkillsLoading(true);

    try {
      const data = await getSkillsByRole(roleName);

      setRequirements(
        data.filter((item) => item.status === "active"),
      );
    } catch (err) {
      setSkillsError(
        err instanceof Error
          ? err.message
          : "Failed to load required skills.",
      );
    } finally {
      setSkillsLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="role-page">
        <div className="role-loading-panel" role="status">
          <span className="role-spinner" />
          <p className="role-loading-title">Preparing your workspace</p>
          <p className="role-loading-description">
            Loading available developer roles...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="role-page">
      <div className="role-container">
        {/* Hero section */}
        <section className="role-hero">
          <div className="role-hero-glow role-hero-glow-one" />
          <div className="role-hero-glow role-hero-glow-two" />

          <div className="role-hero-content">
            <span className="role-eyebrow">
              <span className="role-eyebrow-dot" />
              SKILL GAP ANALYZER
            </span>

            <h1 className="role-hero-title">
              Every role has a
              <span className="role-hero-accent">skill story.</span>
            </h1>

            <p className="role-hero-description">
              Explore the skills required for your target software
              development role. Understand what matters and plan
              your next step with confidence.
            </p>

            <div className="role-hero-points">
              <span className="role-hero-point">
                <span className="role-point-check">✓</span>
                Role-specific skills
              </span>
              <span className="role-hero-point">
                <span className="role-point-check">✓</span>
                Clear requirements
              </span>
            </div>
          </div>

          <div className="role-hero-art" aria-hidden="true">
            <div className="role-art-orbit role-art-orbit-outer" />
            <div className="role-art-orbit role-art-orbit-inner" />

            <div className="role-art-center">
              <span className="role-art-sparkle">✦</span>
              <span className="role-art-code">&lt;/&gt;</span>
              <span className="role-art-caption">GROW WITH PURPOSE</span>
            </div>

            <span className="role-art-chip role-art-chip-top">
              Skills
            </span>
            <span className="role-art-chip role-art-chip-bottom">
              Growth ↗
            </span>
          </div>
        </section>

        {/* Page heading and role selector */}
        <section className="role-main-section">
          <div className="role-section-heading">
            <div>
              <span className="role-section-kicker">
                YOUR CAREER EXPLORER
              </span>
              <h2 className="role-section-title">
                Find your role
              </h2>
              <p className="role-section-description">
                Choose a role to discover its active skill requirements.
              </p>
            </div>

            <div className="role-count-card">
              <span className="role-count-icon">✧</span>
              <div>
                <strong className="role-count-number">
                  {roles.length}
                </strong>
                <span className="role-count-label">
                  {roles.length === 1 ? "Available role" : "Available roles"}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div role="alert" className="role-alert role-alert-error">
              <span className="role-alert-icon">!</span>
              <div>
                <strong>Couldn't load roles</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          <div className="role-selector-card">
            <div className="role-selector-icon" aria-hidden="true">
              <span>⌘</span>
            </div>

            <div className="role-selector-content">
              <label
                htmlFor="role-select"
                className="role-selector-label"
              >
                Select your target role
              </label>
              <p className="role-selector-help">
                Your selection determines which skills appear below.
              </p>

              <select
                id="role-select"
                value={selectedRole}
                onChange={(event) => {
                  void handleRoleChange(event.target.value);
                }}
                className="role-select"
              >
                <option value="">Choose your career role</option>

                {roles.map((role) => (
                  <option key={role._id} value={role.name}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Skills results */}
          {!selectedRole ? (
            <div className="role-empty-state">
              <div className="role-empty-icon" aria-hidden="true">
                <span>✦</span>
              </div>
              <h3 className="role-empty-title">
                Your next step starts here
              </h3>
              <p className="role-empty-description">
                Select a role above to explore its required skills,
                understand the expectations, and identify what to learn next.
              </p>
            </div>
          ) : (
            <section className="role-results-section">
              <div className="role-results-heading">
                <div>
                  <span className="role-section-kicker">
                    ROLE BREAKDOWN
                  </span>
                  <h2 className="role-results-title">
                    Required skills
                  </h2>
                  <p className="role-results-description">
                    Active requirements for{" "}
                    <strong>{selectedRole}</strong>
                  </p>
                </div>

                {!skillsLoading && !skillsError && (
                  <div className="role-skills-count">
                    {requirements.length}{" "}
                    {requirements.length === 1 ? "skill" : "skills"}
                  </div>
                )}
              </div>

              {skillsLoading && (
                <div className="role-inline-loading" role="status">
                  <span className="role-spinner role-spinner-small" />
                  <div>
                    <p className="role-loading-title">
                      Finding required skills...
                    </p>
                    <p className="role-loading-description">
                      Loading requirements for {selectedRole}.
                    </p>
                  </div>
                </div>
              )}

              {skillsError && (
                <div role="alert" className="role-alert role-alert-error">
                  <span className="role-alert-icon">!</span>
                  <div>
                    <strong>Couldn't load required skills</strong>
                    <p>{skillsError}</p>
                  </div>
                </div>
              )}

              {!skillsLoading &&
                !skillsError &&
                requirements.length === 0 && (
                  <div className="role-empty-state role-empty-state-compact">
                    <div className="role-empty-icon" aria-hidden="true">
                      <span>⌕</span>
                    </div>
                    <h3 className="role-empty-title">
                      No active skills yet
                    </h3>
                    <p className="role-empty-description">
                      There are currently no active skill requirements
                      configured for {selectedRole}.
                    </p>
                  </div>
                )}

              {!skillsLoading &&
                !skillsError &&
                requirements.length > 0 && (
                  <div className="role-skills-grid">
                    {requirements.map((requirement, index) => (
                      <article
                        key={requirement._id}
                        className="role-skill-card"
                      >
                        <div className="role-skill-card-top">
                          <span className="role-skill-index">
                            {String(index + 1).padStart(2, "0")}
                          </span>

                          <span className="role-skill-status">
                            <span className="role-skill-status-dot" />
                            Active
                          </span>
                        </div>

                        <div className="role-skill-icon" aria-hidden="true">
                          {index % 4 === 0
                            ? "✧"
                            : index % 4 === 1
                              ? "⌘"
                              : index % 4 === 2
                                ? "↗"
                                : "✦"}
                        </div>

                        <h3 className="role-skill-name">
                          {requirement.skill.name}
                        </h3>

                        <p className="role-skill-category">
                          {requirement.skill.category || "General skill"}
                        </p>

                        <div className="role-skill-card-divider" />

                        <div className="role-skill-meta">
                          <span className="role-skill-meta-label">
                            Requirement
                          </span>
                          <span className="role-requirement-badge">
                            {requirement.requirementType}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
            </section>
          )}
        </section>

        <footer className="role-footer">
          <span className="role-footer-mark">S</span>
          <p>
            Skill Gap Analyzer
            <span className="role-footer-separator">·</span>
            Build skills with intention
          </p>
        </footer>
      </div>
    </main>
  );
};

export default RoleManagementPage;
