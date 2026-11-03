import mongoose from "mongoose";

import ApiError from "../errors/ApiError.js";

import SkillDependency, {
  DependencySource,
  DependencyValidationStatus,
} from "../models/SkillDependency.model.js";

import LearnerDependencyDecision, {
  LearnerDependencyDecisionType,
} from "../models/LearnerDependencyDecision.model.js";

// --------------------------------------------------
// 1. Get AI suggestions with individual learner decisions
// --------------------------------------------------

export const getLearnerAIDependencySuggestions = async (
  learnerId: string,
  roleId: string
) => {
  if (
    !mongoose.isValidObjectId(learnerId) ||
    !mongoose.isValidObjectId(roleId)
  ) {
    throw new ApiError(400, "Invalid learner or role ID");
  }

  // Retrieve shared AI suggestions.
  // These remain pending regardless of individual decisions.
  const suggestions = await SkillDependency.find({
    roleId,
    source: DependencySource.AI,
    validationStatus: DependencyValidationStatus.PENDING,
    isActive: false,
  })
    .populate("skillId", "name category")
    .populate("prerequisiteSkillId", "name category")
    .sort({ createdAt: -1 })
    .lean();

  const dependencyIds = suggestions.map(
    (suggestion) => suggestion._id
  );

  // Retrieve this learner's decisions only.
  const decisions = await LearnerDependencyDecision.find({
    learnerId,
    dependencyId: { $in: dependencyIds },
  }).lean();

  const decisionMap = new Map(
    decisions.map((decision) => [
      decision.dependencyId.toString(),
      decision.decision,
    ])
  );

  return suggestions.map((suggestion) => ({
    ...suggestion,
    learnerDecision:
      decisionMap.get(suggestion._id.toString()) ?? "pending",
  }));
};

// --------------------------------------------------
// 2. Accept or reject an AI suggestion individually
// --------------------------------------------------

export const saveLearnerDependencyDecision = async (
  learnerId: string,
  roleId: string,
  dependencyId: string,
  decision: LearnerDependencyDecisionType
) => {
  if (
    !mongoose.isValidObjectId(learnerId) ||
    !mongoose.isValidObjectId(roleId) ||
    !mongoose.isValidObjectId(dependencyId)
  ) {
    throw new ApiError(400, "Invalid learner, role or dependency ID");
  }

  if (
    !Object.values(LearnerDependencyDecisionType).includes(decision)
  ) {
    throw new ApiError(400, "Invalid dependency decision");
  }

  // Verify that the suggestion belongs to the selected role
  // and is an AI-generated pending shared suggestion.
  const dependency = await SkillDependency.findOne({
    _id: dependencyId,
    roleId,
    source: DependencySource.AI,
    validationStatus: DependencyValidationStatus.PENDING,
    isActive: false,
  });

  if (!dependency) {
    throw new ApiError(
      404,
      "AI dependency suggestion not found"
    );
  }

  // Create or update only this learner's decision.
  const learnerDecision =
    await LearnerDependencyDecision.findOneAndUpdate(
      {
        learnerId,
        dependencyId,
      },
      {
        $set: {
          decision,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

  return {
    dependencyId: dependency._id.toString(),
    learnerId,
    decision: learnerDecision.decision,
  };
};
