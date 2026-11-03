// Skill dependency configuration for Full-Stack Development.
//
// Each key is a skill, and its values are the skills
// that should generally be learned before it.

export const skillDependencies: Record<string, string[]> = {
  // Frontend development
  react: ["javascript"],
  typescript: ["javascript"],
  nextjs: ["react"],

  // Backend development
  nodejs: ["javascript"],
  expressjs: ["nodejs"],

  // Database integration
  mongodb: ["nodejs"],
};

// Normalize skill names to make matching consistent.
export const normalizeSkillName = (skillName: string): string => {
  return skillName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
};

// Get prerequisites for a particular skill.
export const getSkillPrerequisites = (
  skillName: string
): string[] => {
  const normalizedName = normalizeSkillName(skillName);

  return skillDependencies[normalizedName] ?? [];
};

// Check whether a skill has predefined prerequisites.
export const hasSkillPrerequisites = (
  skillName: string
): boolean => {
  return getSkillPrerequisites(skillName).length > 0;
};
