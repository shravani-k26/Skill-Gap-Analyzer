
import mongoose, { Types } from "mongoose";

import ApiError from "../errors/ApiError.js";

import LearnerProfile from "../models/LearnerProfile.model.js";
import RoleRequirement, {
  RequirementStatus,
} from "../models/RoleRequirement.model.js";

import SkillAssessment from "../models/SkillAssessment.model.js";

import LearningRecommendation, {
  LearningDifficulty,
  LearningResourceType,
  ResourceVerificationStatus,
} from "../models/LearningRecommendation.model.js";

import { getLearnerProfile } from "./learner.service.js";

import {
  analyzeSkillDependencies,
} from "./skillDependency.service.js";

import {
  prioritizeSkills,
} from "./skillPrioritization.service.js";

import {
  generateAILearningRecommendations,
  type LearningSkillInput,
  type LearningDependencyInput,
} from "./aiLearningRecommendation.service.js";

import {
  verifyLearningResourceUrl,
} from "./resourceVerification.service.js";

import {
  validateLearningResourceRelevance,
} from "./resourceRelevance.service.js";

// --------------------------------------------------
// 1. Generate personalized learning recommendations
// --------------------------------------------------

export const generateLearningRecommendations = async (
  userId: string
) => {

  // --------------------------------------------------
  // A. Retrieve learner profile
  // --------------------------------------------------

  const learner = await getLearnerProfile(userId);

  type TargetRoleData = {
    _id: Types.ObjectId;
    name?: string;
    description?: string;
  };

  const targetRole = learner.targetRole as unknown as
    | Types.ObjectId
    | TargetRoleData;

  const targetRoleId =
    targetRole instanceof Types.ObjectId
      ? targetRole.toString()
      : targetRole?._id?.toString();

  if (
    !targetRoleId ||
    !mongoose.isValidObjectId(targetRoleId)
  ) {
    throw new ApiError(
      400,
      "Your target role is missing or invalid. Please update your learner profile."
    );
  }

  const roleName: string =
    targetRole instanceof Types.ObjectId
      ? "your target role"
      : targetRole.name ?? "your target role";

  // --------------------------------------------------
  // B. Retrieve active role requirements
  // --------------------------------------------------

  const roleRequirements = await RoleRequirement.find({
    role: new Types.ObjectId(targetRoleId),
    status: RequirementStatus.ACTIVE,
  })
    .populate("role", "name description")
    .populate(
      "skill",
      "name normalizedName category description isActive"
    )
    .lean();

  if (roleRequirements.length === 0) {
    throw new ApiError(
      404,
      "No active skill requirements found for your target role"
    );
  }

  // --------------------------------------------------
  // C. Prepare unique active target skills
  // --------------------------------------------------

  const skillMap = new Map<
    string,
    {
      skillId: string;
      skillName: string;
      category: string;
      requirementType: string;
    }
  >();

  for (const requirement of roleRequirements) {
    const skill = requirement.skill as unknown as {
      _id: Types.ObjectId;
      name: string;
      category: string;
      isActive: boolean;
    } | null;

    if (!skill || !skill.isActive) {
      continue;
    }

    const skillId = skill._id.toString();

    skillMap.set(skillId, {
      skillId,
      skillName: skill.name,
      category: skill.category,
      requirementType: requirement.requirementType,
    });
  }

  const targetSkills = Array.from(skillMap.values());

  if (targetSkills.length === 0) {
    throw new ApiError(
      404,
      "No active skills found for your target role"
    );
  }

  // --------------------------------------------------
  // D. Retrieve latest role-specific assessment
  // --------------------------------------------------

  const latestAssessment = await SkillAssessment.findOne({
    learner: learner._id,
    targetRole: new Types.ObjectId(targetRoleId),
  })
    .sort({
      assessedAt: -1,
      createdAt: -1,
    })
    .populate(
      "skills.skill",
      "name normalizedName category"
    )
    .lean();

  // --------------------------------------------------
  // E. Prepare learner proficiency information
  // --------------------------------------------------

  const proficiencyMap = new Map<string, number>();

  const learnerSkills = latestAssessment
    ? latestAssessment.skills.map((item) => {
        const skill = item.skill as unknown as {
          _id: Types.ObjectId;
          name: string;
        };

        const skillId = skill._id.toString();

        proficiencyMap.set(
          skillId,
          item.proficiencyLevel
        );

        return {
          skillId,
          skillName: skill.name,
          proficiencyLevel: item.proficiencyLevel,
        };
      })
    : [];

  // --------------------------------------------------
  // F. Build initial skill analysis
  // --------------------------------------------------

  const analyzedSkills = targetSkills.map((skill) => {
    const proficiencyLevel =
      proficiencyMap.get(skill.skillId) ?? null;

    let priority: LearningSkillInput["priority"];
    let priorityScore: number | null;
    let learningStatus: string;

    if (proficiencyLevel === null) {
      priority = "assessment_needed";
      priorityScore = null;
      learningStatus = "assessment_needed";
    } else if (proficiencyLevel <= 1) {
      priority = "critical";
      priorityScore = proficiencyLevel === 0 ? 100 : 90;
      learningStatus = "needs_learning";
    } else if (proficiencyLevel === 2) {
      priority = "high";
      priorityScore = 75;
      learningStatus = "needs_learning";
    } else if (proficiencyLevel === 3) {
      priority = "medium";
      priorityScore = 50;
      learningStatus = "continue_developing";
    } else {
      priority = "low";
      priorityScore = proficiencyLevel === 4 ? 25 : 10;
      learningStatus = "relative_strength";
    }

    return {
      skillId: skill.skillId,
      skillName: skill.skillName,
      category: skill.category,
      proficiencyLevel,
      priority,
      priorityScore,
      learningStatus,
      learningOrder: null as number | null,
    };
  });

  // --------------------------------------------------
  // G. Retrieve dependencies
  // --------------------------------------------------

  const dependencyResults = await analyzeSkillDependencies(
    userId,
    targetRoleId,
    targetSkills.map((skill) => ({
      skillId: skill.skillId,
      skillName: skill.skillName,
    })),
    learnerSkills
  );

  // --------------------------------------------------
  // H. Apply prioritization logic
  // --------------------------------------------------

  const prioritizedSkills = prioritizeSkills(
    analyzedSkills as Parameters<typeof prioritizeSkills>[0],
    dependencyResults
  );

  // --------------------------------------------------
  // I. Prepare Gemini input
  // --------------------------------------------------

  const learningInputSkills: LearningSkillInput[] =
    prioritizedSkills.map((skill) => {
      const originalSkill = skillMap.get(skill.skillId);

      return {
        skillId: skill.skillId,
        skillName: skill.skillName,
        proficiencyLevel: skill.proficiencyLevel,
        priority: skill.priority,
        priorityScore: skill.priorityScore,
        learningStatus: skill.learningStatus,
        learningOrder: skill.learningOrder,
        category: originalSkill?.category ?? "other",
      };
    });

  const learningInputDependencies: LearningDependencyInput[] =
    dependencyResults.map((dependency) => ({
      skillName: dependency.skillName,
      prerequisiteName: dependency.prerequisiteName,
      strength: dependency.strength,
      relationshipType: dependency.relationshipType,
      isReady: dependency.isReady,
      prerequisiteProficiency:
        dependency.prerequisiteProficiency,
      explanation: dependency.explanation,
    }));

  // --------------------------------------------------
  // J. Generate AI recommendations
  // --------------------------------------------------

  const aiRecommendations =
    await generateAILearningRecommendations({
      roleName,
      educationLevel: learner.educationLevel,
      professionalStatus: learner.professionalStatus,
      yearsOfExperience: learner.yearsOfExperience,
      skills: learningInputSkills,
      dependencies: learningInputDependencies,
    });

  // --------------------------------------------------
  // K. Validate generated skill IDs and eligibility
  // --------------------------------------------------

  const allowedSkillIds = new Set(
    targetSkills.map((skill) => skill.skillId)
  );

  const detailedSkillIds = new Set(
    learningInputSkills
      .filter(
        (skill) =>
          skill.proficiencyLevel !== null &&
          skill.proficiencyLevel <= 3
      )
      .map((skill) => skill.skillId)
  );

  const strengthSkillIds = new Set(
    learningInputSkills
      .filter(
        (skill) =>
          skill.proficiencyLevel !== null &&
          skill.proficiencyLevel >= 4
      )
      .map((skill) => skill.skillId)
  );

  const scheduledSkillIds = new Set(
    prioritizedSkills
      .filter(
        (skill) => skill.learningOrder !== null
      )
      .map((skill) => skill.skillId)
  );

  const validTopics = aiRecommendations.topics.filter(
    (topic) =>
      mongoose.isValidObjectId(topic.skillId) &&
      allowedSkillIds.has(topic.skillId) &&
      detailedSkillIds.has(topic.skillId) &&
      scheduledSkillIds.has(topic.skillId)
  );

  const validSummaries =
    aiRecommendations.skillSummaries.filter(
      (summary) =>
        mongoose.isValidObjectId(summary.skillId) &&
        allowedSkillIds.has(summary.skillId) &&
        strengthSkillIds.has(summary.skillId)
    );

  // --------------------------------------------------
  // L. Verify and prepare learning resources
  // --------------------------------------------------

  type AIResource = {
    title: string;
    provider: string;
    url: string;
    resourceType:
      | "documentation"
      | "tutorial"
      | "video"
      | "article"
      | "course"
      | "other";
    description: string;
  };

  const prepareResources = async (
    resources: AIResource[],
    learningContext: string
  ) => {
    const verifiedResources = await Promise.all(
      resources.map(async (resource) => {
        const verificationStatus =
          await verifyLearningResourceUrl(resource.url);

        const relevanceStatus =
          validateLearningResourceRelevance(
            {
              ...resource,
              resourceType:
                resource.resourceType as LearningResourceType,
            },
            learningContext
          );

        return {
          ...resource,
          resourceType:
            resource.resourceType as LearningResourceType,
          verificationStatus,
          verifiedAt:
            verificationStatus ===
            ResourceVerificationStatus.UNVERIFIED
              ? null
              : new Date(),
          relevanceStatus,
        };
      })
    );

    // Exclude resources whose URLs are invalid.
    // Retain verified and unverified resources.
    return verifiedResources.filter(
      (resource) =>
        resource.verificationStatus !==
        ResourceVerificationStatus.INVALID
    );
  };

  // --------------------------------------------------
  // M. Prepare detailed learning topics
  // --------------------------------------------------

  const topicOrder = new Map(
    prioritizedSkills
      .filter(
        (skill) => skill.learningOrder !== null
      )
      .map((skill) => [
        skill.skillId,
        skill.learningOrder as number,
      ])
  );

  const sortedTopics = validTopics
    .slice()
    .sort((a, b) => {
      const orderA =
        topicOrder.get(a.skillId) ??
        Number.MAX_SAFE_INTEGER;

      const orderB =
        topicOrder.get(b.skillId) ??
        Number.MAX_SAFE_INTEGER;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return a.sequenceOrder - b.sequenceOrder;
    });

  const finalTopics = await Promise.all(
    sortedTopics.map(async (topic, index) => {
      const skillName =
        skillMap.get(topic.skillId)?.skillName ??
        topic.topicTitle;

      return {
        skill: new Types.ObjectId(topic.skillId),
        topicTitle: topic.topicTitle,
        reason: topic.reason,
        sequenceOrder: index + 1,
        difficulty:
          topic.difficulty as LearningDifficulty,
        learningObjectives: topic.learningObjectives,
        estimatedDuration: topic.estimatedDuration,
        resources: await prepareResources(
          topic.resources,
          `${skillName} ${topic.topicTitle}`
        ),
      };
    })
  );

  // --------------------------------------------------
  // N. Prepare skill summaries
  // --------------------------------------------------

  const finalSummaries = await Promise.all(
    validSummaries.map(async (summary) => {
      const originalSkill = skillMap.get(summary.skillId);

      const skillName =
        originalSkill?.skillName ?? "Advanced Skill";

      // Correct course-search titles and URLs.
      // Use actual skill names instead of MongoDB IDs.
      const correctedResources = summary.suggestedResources.map(
        (resource) => {
          if (resource.resourceType !== "course") {
            return resource;
          }

          const platform =
            resource.provider.toLowerCase().includes("coursera")
              ? "Coursera"
              : "Udemy";

          const query = encodeURIComponent(
            `Advanced ${skillName}`
          );

          const url =
            platform === "Coursera"
              ? `https://www.coursera.org/search?query=${query}`
              : `https://www.udemy.com/courses/search/?q=${query}`;

          return {
            ...resource,
            title: `Search ${platform} courses for Advanced ${skillName}`,
            provider: platform,
            url,
            description:
              `This link opens ${platform} search results for advanced ${skillName}. It is a course search link, not a verified individual course.`,
          };
        }
      );

      return {
        skill: new Types.ObjectId(summary.skillId),
        proficiencyLevel:
          proficiencyMap.get(summary.skillId)!,
        summary: summary.summary,
        suggestedResources: await prepareResources(
          correctedResources,
          `${skillName} ${summary.summary}`
        ),
      };
    })
  );

  // --------------------------------------------------
  // O. Prepare unassessed skills
  // --------------------------------------------------

  const unassessedSkills = targetSkills
    .filter(
      (skill) => !proficiencyMap.has(skill.skillId)
    )
    .map((skill) => ({
      skill: new Types.ObjectId(skill.skillId),
      message:
        "Complete a skill assessment to receive personalized learning recommendations.",
    }));

  // --------------------------------------------------
  // P. Save recommendation snapshot
  // --------------------------------------------------

  const recommendation =
    await LearningRecommendation.create({
      learner: learner._id,
      targetRole: new Types.ObjectId(targetRoleId),

      sourceAssessment:
        latestAssessment?._id ?? null,

      topics: finalTopics,
      skillSummaries: finalSummaries,
      unassessedSkills,

      generatedBy: "Gemini",
      generatedAt: new Date(),
    });

  // --------------------------------------------------
  // Q. Return populated recommendation
  // --------------------------------------------------

  return LearningRecommendation.findById(
    recommendation.id
  )
    .populate("targetRole", "name description")
    .populate(
      "topics.skill",
      "name category description"
    )
    .populate(
      "skillSummaries.skill",
      "name category description"
    )
    .populate(
      "unassessedSkills.skill",
      "name category description"
    );
};

// --------------------------------------------------
// 2. Retrieve latest learning recommendations
// --------------------------------------------------

export const getLatestLearningRecommendations = async (
  userId: string
) => {
  const learner = await LearnerProfile.findOne({
    user: userId,
  }).select("_id targetRole");

  if (!learner) {
    throw new ApiError(
      404,
      "Learner profile not found"
    );
  }

  const recommendation =
    await LearningRecommendation.findOne({
      learner: learner._id,
      targetRole: learner.targetRole,
    })
      .sort({ generatedAt: -1 })
      .populate("targetRole", "name description")
      .populate(
        "topics.skill",
        "name category description"
      )
      .populate(
        "skillSummaries.skill",
        "name category description"
      )
      .populate(
        "unassessedSkills.skill",
        "name category description"
      );

  if (!recommendation) {
    throw new ApiError(
      404,
      "No learning recommendations found. Generate recommendations first."
    );
  }

  return recommendation;
};
