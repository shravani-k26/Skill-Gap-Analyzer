
import mongoose from "mongoose";
import ApiError from "../errors/ApiError.js";

import JobDescription from "../models/JobDescription.model.js";
import SkillAssessment from "../models/SkillAssessment.model.js";

import { getLearnerProfile } from "./learner.service.js";

import {
  getActiveSkills,
  matchSkillsInText,
} from "./skillExtraction.service.js";

import {
  analyzePredefinedSkillDependencies,
  analyzeAcceptedAISkillDependencies,
  analyzeSkillDependencies,
} from "./skillDependency.service.js";

import { prioritizeSkills } from "./skillPrioritization.service.js";

// --------------------------------------------------
// 1. Skill priority types
// --------------------------------------------------

type SkillPriority =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "assessment_needed";

type SkillGapStatus =
  | "high_learning_priority"
  | "needs_improvement"
  | "developing_proficiency"
  | "relative_strength"
  | "not_assessed";

interface SkillPriorityResult {
  priority: SkillPriority;
  priorityScore: number | null;
}

// --------------------------------------------------
// 2. Determine skill gap status
// --------------------------------------------------

const getSkillGapStatus = (
  proficiencyLevel: number | null
): SkillGapStatus => {
  if (proficiencyLevel === null) {
    return "not_assessed";
  }

  if (proficiencyLevel <= 1) {
    return "high_learning_priority";
  }

  if (proficiencyLevel === 2) {
    return "needs_improvement";
  }

  if (proficiencyLevel === 3) {
    return "developing_proficiency";
  }

  return "relative_strength";
};

// --------------------------------------------------
// 3. Calculate skill priority
// --------------------------------------------------

const getSkillPriority = (
  proficiencyLevel: number | null
): SkillPriorityResult => {
  if (proficiencyLevel === null) {
    return {
      priority: "assessment_needed",
      priorityScore: null,
    };
  }

  if (proficiencyLevel <= 1) {
    return {
      priority: "critical",
      priorityScore: proficiencyLevel === 0 ? 100 : 90,
    };
  }

  if (proficiencyLevel === 2) {
    return {
      priority: "high",
      priorityScore: 75,
    };
  }

  if (proficiencyLevel === 3) {
    return {
      priority: "medium",
      priorityScore: 50,
    };
  }

  return {
    priority: "low",
    priorityScore: proficiencyLevel === 4 ? 25 : 10,
  };
};

// --------------------------------------------------
// 4. Main comparison service
// --------------------------------------------------

export const compareSkillGapMethods = async (
  userId: string,
  jobDescriptionId: string
) => {
  // Validate job description ID.
  if (!mongoose.isValidObjectId(jobDescriptionId)) {
    throw new ApiError(400, "Invalid job description ID");
  }

  // Retrieve selected job description.
  const jobDescription = await JobDescription.findById(
    jobDescriptionId
  ).lean();

  if (!jobDescription) {
    throw new ApiError(404, "Job description not found");
  }

  // Retrieve learner profile.
  const learner = await getLearnerProfile(userId);

  // Extract required skills from the job description.
  const activeSkills = await getActiveSkills();

  const extractedSkills = matchSkillsInText(
    jobDescription.description,
    activeSkills
  );

  // Retrieve learner's latest assessment.
  const latestAssessment = await SkillAssessment.findOne({
    learner: learner._id,
  })
    .sort({ assessedAt: -1, createdAt: -1 })
    .populate("skills.skill", "name normalizedName category")
    .lean();

  // Map proficiency scores.
  const proficiencyBySkill = new Map<string, number>();

  if (latestAssessment) {
    for (const item of latestAssessment.skills) {
      const skill = item.skill as unknown as {
        _id: mongoose.Types.ObjectId;
      };

      proficiencyBySkill.set(
        skill._id.toString(),
        item.proficiencyLevel
      );
    }
  }

  // --------------------------------------------------
  // 5. Prepare common skill data
  // --------------------------------------------------

  const analyzedSkills = extractedSkills.map((skill) => {
    const skillId = skill._id.toString();

    const proficiencyLevel =
      proficiencyBySkill.get(skillId) ?? null;

    const priorityResult =
      getSkillPriority(proficiencyLevel);

    return {
      skillId,
      skillName: skill.name,
      category: skill.category,
      proficiencyLevel,

      proficiencyLabel:
        proficiencyLevel === null
          ? "Not assessed"
          : `${proficiencyLevel}/5`,

      status: getSkillGapStatus(proficiencyLevel),

      priority: priorityResult.priority,
      priorityScore: priorityResult.priorityScore,
    };
  });

  // Prepare learner skill information.
  const learnerSkills = latestAssessment
    ? latestAssessment.skills.map((item) => {
        const skill = item.skill as unknown as {
          _id: mongoose.Types.ObjectId;
          name: string;
        };

        return {
          skillId: skill._id.toString(),
          skillName: skill.name,
          proficiencyLevel: item.proficiencyLevel,
        };
      })
    : [];

  // Prepare common inputs.
  const targetSkills = analyzedSkills.map((skill) => ({
    skillId: skill.skillId,
    skillName: skill.skillName,
  }));

  const roleId = jobDescription.targetRole.toString();

  // --------------------------------------------------
  // 6. Retrieve dependency sets
  // --------------------------------------------------

  // Method 1 does not use dependencies.
  const noDependencies: Parameters<typeof prioritizeSkills>[1] = [];

  // Method 2 uses predefined dependencies only.
  const predefinedDependencies =
    await analyzePredefinedSkillDependencies(
      roleId,
      targetSkills,
      learnerSkills
    );

  // Retrieve learner-accepted AI dependencies.
  const acceptedAIDependencies =
    await analyzeAcceptedAISkillDependencies(
      userId,
      roleId,
      targetSkills,
      learnerSkills
    );

  // Method 3 combines predefined and accepted AI dependencies.
  const hybridDependencies = await analyzeSkillDependencies(
    userId,
    roleId,
    targetSkills,
    learnerSkills
  );

  // --------------------------------------------------
  // 7. Run the three comparison methods
  // --------------------------------------------------

  const proficiencyOnlyResults = prioritizeSkills(
    analyzedSkills,
    noDependencies
  );

  const predefinedResults = prioritizeSkills(
    analyzedSkills,
    predefinedDependencies
  );

  const hybridResults = prioritizeSkills(
    analyzedSkills,
    hybridDependencies
  );

  // --------------------------------------------------
  // 8. Return comparison results
  // --------------------------------------------------

  return {
    jobDescription: {
      id: jobDescription._id.toString(),
      title: jobDescription.title,
      company: jobDescription.company,
      targetRole: roleId,
    },

    assessment: latestAssessment
      ? {
          id: latestAssessment._id.toString(),
          assessedAt: latestAssessment.assessedAt,
        }
      : null,

    commonInputs: {
      totalExtractedSkills: analyzedSkills.length,
      totalAssessedSkills: analyzedSkills.filter(
        (skill) => skill.proficiencyLevel !== null
      ).length,
      totalUnassessedSkills: analyzedSkills.filter(
        (skill) => skill.proficiencyLevel === null
      ).length,
    },

    methods: {
      proficiencyOnly: {
        methodName: "Proficiency-only baseline",
        dependencyCount: 0,
        dependencies: [],
        skills: proficiencyOnlyResults,
      },

      predefined: {
        methodName: "Predefined dependency-aware baseline",
        dependencyCount: predefinedDependencies.length,
        dependencies: predefinedDependencies,
        skills: predefinedResults,
      },

      hybrid: {
        methodName: "Hybrid AI-assisted method",
        dependencyCount: hybridDependencies.length,
        predefinedDependencyCount:
          predefinedDependencies.length,
        acceptedAIDependencyCount:
          acceptedAIDependencies.length,
        dependencies: hybridDependencies,
        skills: hybridResults,
      },
    },
  };
};
