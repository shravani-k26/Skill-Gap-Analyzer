import mongoose from "mongoose";
import ApiError from "../errors/ApiError.js";
import JobDescription from "../models/JobDescription.model.js";
import SkillAssessment from "../models/SkillAssessment.model.js";
import { getLearnerProfile } from "./learner.service.js";
import {
  getActiveSkills,
  matchSkillsInText,
} from "./skillExtraction.service.js";

type SkillGapStatus =
  | "high_learning_priority"
  | "needs_improvement"
  | "developing_proficiency"
  | "relative_strength"
  | "not_assessed";

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

export const analyzeSkillGaps = async (
  userId: string,
  jobDescriptionId: string
) => {
  if (!mongoose.isValidObjectId(jobDescriptionId)) {
    throw new ApiError(400, "Invalid job description ID");
  }

  // 1. Find the selected saved job description.
  const jobDescription = await JobDescription.findById(
    jobDescriptionId
  ).lean();

  if (!jobDescription) {
    throw new ApiError(404, "Job description not found");
  }

  // 2. Retrieve the authenticated learner's profile.
  const learner = await getLearnerProfile(userId);

  // 3. Extract skills from the selected job description.
  const activeSkills = await getActiveSkills();

  const extractedSkills = matchSkillsInText(
    jobDescription.description,
    activeSkills
  );

  // 4. Retrieve the learner's latest assessment.
  const latestAssessment = await SkillAssessment.findOne({
    learner: learner._id,
  })
    .sort({ assessedAt: -1, createdAt: -1 })
    .populate("skills.skill", "name normalizedName category")
    .lean();

  // Map the latest ratings by skill ID.
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

  // 5. Compare each extracted skill with the latest assessment.
  const analyzedSkills = extractedSkills.map((skill) => {
    const skillId = skill._id.toString();

    const proficiencyLevel =
      proficiencyBySkill.get(skillId) ?? null;

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
    };
  });

  const counts = {
    highLearningPriority: 0,
    needsImprovement: 0,
    developingProficiency: 0,
    relativeStrength: 0,
    notAssessed: 0,
  };

  for (const skill of analyzedSkills) {
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
  }

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
    },
    skills: analyzedSkills,
  };
};
