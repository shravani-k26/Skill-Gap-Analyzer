import mongoose from "mongoose";
import ApiError from "../errors/ApiError.js";
import JobDescription from "../models/JobDescription.model.js";
import SkillAssessment from "../models/SkillAssessment.model.js";
import { getLearnerProfile } from "./learner.service.js";
import {
  getActiveSkills,
  matchSkillsInText,
} from "./skillExtraction.service.js";
import { analyzeSkillDependencies } from "./skillDependency.service.js";
import { prioritizeSkills } from "./skillPrioritization.service.js";

// --------------------------------------------------
// 1. Skill gap status types
// --------------------------------------------------

type SkillGapStatus =
  | "high_learning_priority"
  | "needs_improvement"
  | "developing_proficiency"
  | "relative_strength"
  | "not_assessed";

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
// 3. Skill priority types
// --------------------------------------------------

type SkillPriority =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "assessment_needed";

interface SkillPriorityResult {
  priority: SkillPriority;
  priorityScore: number | null;
}

// --------------------------------------------------
// 4. Calculate skill priority
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
// 5. Priority sorting order
// --------------------------------------------------

const priorityOrder: Record<SkillPriority, number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
  assessment_needed: 5,
};

// --------------------------------------------------
// 6. Main skill gap analysis function
// --------------------------------------------------

export const analyzeSkillGaps = async (
  userId: string,
  jobDescriptionId: string
) => {
  // Validate job description ID
  if (!mongoose.isValidObjectId(jobDescriptionId)) {
    throw new ApiError(400, "Invalid job description ID");
  }

  // Find the selected job description
  const jobDescription = await JobDescription.findById(
    jobDescriptionId
  ).lean();

  if (!jobDescription) {
    throw new ApiError(404, "Job description not found");
  }

  // Retrieve learner profile
  const learner = await getLearnerProfile(userId);

  // Extract skills from job description
  const activeSkills = await getActiveSkills();

  const extractedSkills = matchSkillsInText(
    jobDescription.description,
    activeSkills
  );

  // Retrieve learner's latest assessment
  const latestAssessment = await SkillAssessment.findOne({
    learner: learner._id,
  })
    .sort({ assessedAt: -1, createdAt: -1 })
    .populate("skills.skill", "name normalizedName category")
    .lean();

  // Create a map of skill IDs and proficiency levels
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
  // 7. Analyze extracted skills and calculate priority
  // --------------------------------------------------

  const analyzedSkills = extractedSkills.map((skill) => {
    const skillId = skill._id.toString();

    const proficiencyLevel =
      proficiencyBySkill.get(skillId) ?? null;

    const priorityResult = getSkillPriority(proficiencyLevel);

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

const dependencyResults = await analyzeSkillDependencies(
  userId,
  jobDescription.targetRole.toString(),
  analyzedSkills.map(skill => ({
    skillId: skill.skillId,
    skillName: skill.skillName
  })),
  learnerSkills
);

const prioritizedSkills = prioritizeSkills(
  analyzedSkills,
  dependencyResults
);

  // --------------------------------------------------
  // 8. Sort skills by priority
  // --------------------------------------------------

  analyzedSkills.sort((a, b) => {
    return (
      priorityOrder[a.priority] - priorityOrder[b.priority] ||
      (b.priorityScore ?? -1) - (a.priorityScore ?? -1) ||
      a.skillName.localeCompare(b.skillName)
    );
  });

  // --------------------------------------------------
  // 9. Calculate summary counts
  // --------------------------------------------------

  const counts = {
    highLearningPriority: 0,
    needsImprovement: 0,
    developingProficiency: 0,
    relativeStrength: 0,
    notAssessed: 0,
  };

  const priorityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    assessmentNeeded: 0,
  };

  for (const skill of analyzedSkills) {
    // Count skill gap statuses
    switch (skill.status) {
      case "high_learning_priority":
        counts.highLearningPriority++;
        break;

      case "needs_improvement":
        counts.needsImprovement++;
        break;

      case "developing_proficiency":
        counts.developingProficiency++;
        break;

      case "relative_strength":
        counts.relativeStrength++;
        break;

      case "not_assessed":
        counts.notAssessed++;
        break;
    }

    // Count skill priorities
    switch (skill.priority) {
      case "critical":
        priorityCounts.critical++;
        break;

      case "high":
        priorityCounts.high++;
        break;

      case "medium":
        priorityCounts.medium++;
        break;

      case "low":
        priorityCounts.low++;
        break;

      case "assessment_needed":
        priorityCounts.assessmentNeeded++;
        break;
    }
  }

  // --------------------------------------------------
  // 10. Return analysis results
  // --------------------------------------------------

  return {
    jobDescription: {
      id: jobDescription._id.toString(),
      title: jobDescription.title,
      company: jobDescription.company,
      targetRole: jobDescription.targetRole.toString(),
    },

    assessment: latestAssessment
      ? {
          id: latestAssessment._id.toString(),
          assessedAt: latestAssessment.assessedAt,
        }
      : null,

    summary: {
      totalRequiredSkills: analyzedSkills.length,
      ...counts,
      priorityCounts,
    },

    skills: prioritizedSkills,
    dependencies: dependencyResults,
    
  };
};


