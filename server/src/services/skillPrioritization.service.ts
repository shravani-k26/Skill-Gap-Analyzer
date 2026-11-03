
type SkillPriority =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "assessment_needed";

type DependencyStrength =
  | "strong"
  | "moderate"
  | "optional";

type LearningStatus =
  | "needs_learning"
  | "continue_developing"
  | "relative_strength"
  | "assessment_needed";

interface PrioritizationSkill {
  skillId: string;
  skillName: string;
  proficiencyLevel: number | null;
  priority: SkillPriority;
  priorityScore: number | null;
}

interface DependencyResult {
  skillId: string;
  skillName: string;
  prerequisiteName: string;
  prerequisiteSkillId: string | null;
  prerequisiteProficiency: number | null;
  isPrerequisiteAssessed: boolean;
  isReady: boolean;
  strength: DependencyStrength;
  source?: string;
}

interface PrerequisiteDetail {
  skillName: string;
  skillId: string | null;
  proficiencyLevel: number | null;
  isAssessed: boolean;
  isReady: boolean;
  strength: DependencyStrength;
  source: string | null;
}

interface PrioritizedSkill extends PrioritizationSkill {
  learningStatus: LearningStatus;
  learningOrder: number | null;
  prerequisiteSkills: string[];
  prerequisiteDetails: PrerequisiteDetail[];
  blockedBy: string[];
  learningReason: string;
}

const MINIMUM_PREREQUISITE_LEVEL = 3;

const priorityOrder: Record<SkillPriority, number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
  assessment_needed: 5,
};

// --------------------------------------------------
// 1. Determine learning status
// --------------------------------------------------

const getLearningStatus = (
  proficiencyLevel: number | null
): LearningStatus => {
  if (proficiencyLevel === null) {
    return "assessment_needed";
  }

  if (proficiencyLevel <= 2) {
    return "needs_learning";
  }

  if (proficiencyLevel === 3) {
    return "continue_developing";
  }

  return "relative_strength";
};

// --------------------------------------------------
// 2. Determine whether skill needs learning
// --------------------------------------------------

const isLearningSkill = (
  skill: PrioritizationSkill
): boolean => {
  return (
    skill.proficiencyLevel !== null &&
    skill.proficiencyLevel <= 3
  );
};

// --------------------------------------------------
// 3. Main prioritization function
// --------------------------------------------------

export const prioritizeSkills = (
  skills: PrioritizationSkill[],
  dependencies: DependencyResult[]
): PrioritizedSkill[] => {
  const skillMap = new Map(
    skills.map((skill) => [skill.skillId, skill])
  );

  const dependencyMap = new Map<string, DependencyResult[]>();

  for (const dependency of dependencies) {
    const existing =
      dependencyMap.get(dependency.skillId) ?? [];

    existing.push(dependency);

    dependencyMap.set(dependency.skillId, existing);
  }

  // --------------------------------------------------
  // 4. Determine prerequisite readiness
  // --------------------------------------------------

  const isPrerequisiteReady = (
    dependency: DependencyResult
  ): boolean => {
    const prerequisiteId =
      dependency.prerequisiteSkillId;

    // Use the latest proficiency from the target skill list
    // when the prerequisite is included in the analysis.
    const prerequisiteSkill = prerequisiteId
      ? skillMap.get(prerequisiteId)
      : undefined;

    const proficiencyLevel = prerequisiteSkill
      ? prerequisiteSkill.proficiencyLevel
      : dependency.prerequisiteProficiency;

    // Unassessed prerequisites are never considered ready.
    if (proficiencyLevel === null) {
      return false;
    }

    return proficiencyLevel >= MINIMUM_PREREQUISITE_LEVEL;
  };

  // --------------------------------------------------
  // 5. Prepare skill information
  // --------------------------------------------------

  const results: PrioritizedSkill[] = skills.map((skill) => {
    const skillDependencies =
      dependencyMap.get(skill.skillId) ?? [];

    const prerequisiteDetails: PrerequisiteDetail[] =
      skillDependencies.map((dependency) => {
        const prerequisiteId =
          dependency.prerequisiteSkillId;

        const prerequisiteSkill = prerequisiteId
          ? skillMap.get(prerequisiteId)
          : undefined;

        const proficiencyLevel = prerequisiteSkill
          ? prerequisiteSkill.proficiencyLevel
          : dependency.prerequisiteProficiency;

        return {
          skillName: dependency.prerequisiteName,
          skillId: prerequisiteId,
          proficiencyLevel,
          isAssessed: proficiencyLevel !== null,
          isReady: isPrerequisiteReady(dependency),
          strength: dependency.strength,
          source: dependency.source ?? null,
        };
      });

    return {
      ...skill,
      learningStatus: getLearningStatus(
        skill.proficiencyLevel
      ),
      learningOrder: null,
      prerequisiteSkills: [
        ...new Set(
          prerequisiteDetails.map((item) => item.skillName)
        ),
      ],
      prerequisiteDetails,
      blockedBy: [],
      learningReason:
        "Prioritized according to current proficiency.",
    };
  });

  // --------------------------------------------------
  // 6. Identify strong prerequisite blockers
  // --------------------------------------------------

  for (const skill of results) {
    const skillDependencies =
      dependencyMap.get(skill.skillId) ?? [];

    const unresolvedStrongDependencies =
      skillDependencies.filter(
        (dependency) =>
          dependency.strength === "strong" &&
          !isPrerequisiteReady(dependency)
      );

    skill.blockedBy = [
      ...new Set(
        unresolvedStrongDependencies.map(
          (dependency) => dependency.prerequisiteName
        )
      ),
    ];
  }

  // --------------------------------------------------
  // 7. Build learning sequence
  // --------------------------------------------------

  const remaining = results.filter(
    (skill) =>
      isLearningSkill(skill) &&
      skill.blockedBy.length === 0
  );

  const ordered: PrioritizedSkill[] = [];

  const scheduled = new Set<string>();

  while (remaining.length > 0) {
    // Moderate dependencies influence ordering only.
    // They do not prevent a skill from being scheduled.
    const getUnscheduledModerateCount = (
      skill: PrioritizedSkill
    ): number => {
      const skillDependencies =
        dependencyMap.get(skill.skillId) ?? [];

      return skillDependencies.filter((dependency) => {
        if (
          dependency.strength !== "moderate" ||
          isPrerequisiteReady(dependency)
        ) {
          return false;
        }

        const prerequisiteId =
          dependency.prerequisiteSkillId;

        if (!prerequisiteId) {
          return false;
        }

        const prerequisiteSkill = skillMap.get(prerequisiteId);

        return (
          prerequisiteSkill !== undefined &&
          isLearningSkill(prerequisiteSkill) &&
          !scheduled.has(prerequisiteId)
        );
      }).length;
    };

    // Sort by:
    // 1. Moderate prerequisite sequencing guidance.
    // 2. Proficiency priority.
    // 3. Priority score.
    // 4. Skill name.
    remaining.sort((a, b) => {
      return (
        getUnscheduledModerateCount(a) -
          getUnscheduledModerateCount(b) ||
        priorityOrder[a.priority] -
          priorityOrder[b.priority] ||
        (b.priorityScore ?? -1) -
          (a.priorityScore ?? -1) ||
        a.skillName.localeCompare(b.skillName)
      );
    });

    const selected = remaining.shift()!;

    selected.learningOrder = ordered.length + 1;

    ordered.push(selected);

    scheduled.add(selected.skillId);
  }

  // --------------------------------------------------
  // 8. Explain blocked and scheduled skills
  // --------------------------------------------------

  for (const skill of results) {
    if (skill.learningStatus === "assessment_needed") {
      skill.learningReason =
        "Assess this skill before assigning a learning priority.";

      continue;
    }

    if (skill.learningStatus === "relative_strength") {
      skill.learningReason =
        "This skill is a relative strength based on current proficiency.";

      continue;
    }

    if (skill.blockedBy.length > 0) {
      skill.learningReason =
        `This skill is blocked until the following strong prerequisites reach proficiency ${MINIMUM_PREREQUISITE_LEVEL}/5: ${skill.blockedBy.join(", ")}.`;

      continue;
    }

    if (skill.learningStatus === "continue_developing") {
      skill.learningReason =
        "Continue developing this skill to improve proficiency.";

      continue;
    }

    if (skill.priority === "critical") {
      skill.learningReason =
        "This skill has a significant proficiency gap.";
    } else if (skill.priority === "high") {
      skill.learningReason =
        "This skill needs improvement for the target role.";
    } else {
      skill.learningReason =
        "This skill is included in the learning plan based on its proficiency gap.";
    }
  }

  // --------------------------------------------------
  // 9. Separate relative strengths and unassessed skills
  // --------------------------------------------------

  const blockedSkills = results.filter(
    (skill) =>
      isLearningSkill(skill) &&
      skill.blockedBy.length > 0
  );

  const relativeStrength = results.filter(
    (skill) =>
      skill.learningStatus === "relative_strength"
  );

  const assessmentNeeded = results.filter(
    (skill) =>
      skill.learningStatus === "assessment_needed"
  );

  // --------------------------------------------------
  // 10. Return final result
  // --------------------------------------------------

  return [
    ...ordered,
    ...blockedSkills,
    ...relativeStrength,
    ...assessmentNeeded,
  ];
};
