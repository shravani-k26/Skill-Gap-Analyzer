import mongoose from "mongoose";

import ApiError from "../errors/ApiError.js";

import SkillDependency, {
  DependencySource,
  DependencyValidationStatus,
} from "../models/SkillDependency.model.js";

// --------------------------------------------------
// Get pending AI suggestions for a role
// --------------------------------------------------

export const getPendingAIDependencies = async (
  roleId: string
) => {
  if (!mongoose.isValidObjectId(roleId)) {
    throw new ApiError(400, "Invalid role ID");
  }

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

  return suggestions;
};

// --------------------------------------------------
// Accept an AI dependency suggestion
// --------------------------------------------------

export const acceptAIDependency = async (
  roleId: string,
  dependencyId: string
) => {
  if (
    !mongoose.isValidObjectId(roleId) ||
    !mongoose.isValidObjectId(dependencyId)
  ) {
    throw new ApiError(400, "Invalid role or dependency ID");
  }

  const dependency = await SkillDependency.findOneAndUpdate(
    {
      _id: dependencyId,
      roleId,
      source: DependencySource.AI,
      validationStatus: DependencyValidationStatus.PENDING,
      isActive: false,
    },
    {
      $set: {
        validationStatus: DependencyValidationStatus.ACCEPTED,
        isActive: true,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  )
    .populate("skillId", "name category")
    .populate("prerequisiteSkillId", "name category");

  if (!dependency) {
    throw new ApiError(
      404,
      "Pending AI dependency suggestion not found"
    );
  }

  return dependency;
};

// --------------------------------------------------
// Reject an AI dependency suggestion
// --------------------------------------------------

export const rejectAIDependency = async (
  roleId: string,
  dependencyId: string
) => {
  if (
    !mongoose.isValidObjectId(roleId) ||
    !mongoose.isValidObjectId(dependencyId)
  ) {
    throw new ApiError(400, "Invalid role or dependency ID");
  }

  const dependency = await SkillDependency.findOneAndUpdate(
    {
      _id: dependencyId,
      roleId,
      source: DependencySource.AI,
      validationStatus: DependencyValidationStatus.PENDING,
      isActive: false,
    },
    {
      $set: {
        validationStatus: DependencyValidationStatus.REJECTED,
        isActive: false,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  )
    .populate("skillId", "name category")
    .populate("prerequisiteSkillId", "name category");

  if (!dependency) {
    throw new ApiError(
      404,
      "Pending AI dependency suggestion not found"
    );
  }

  return dependency;
};
