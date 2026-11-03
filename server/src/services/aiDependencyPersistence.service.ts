import { Types } from "mongoose";

import SkillDependency, {
  DependencyRelationshipType,
  DependencyStrength,
  DependencySource,
  DependencyValidationStatus,
} from "../models/SkillDependency.model.js";

import type {
  AIDependencySuggestion,
} from "./aiDependency.service.js";

import {
  validateAIDependencySuggestions,
} from "./aiDependencyValidation.service.js";

// --------------------------------------------------
// Save shared role-level AI suggestions
// --------------------------------------------------

export const saveAIDependencySuggestions = async (
  roleId: string,
  suggestions: AIDependencySuggestion[],
  availableSkills: {
    skillId: string;
    skillName: string;
  }[]
) => {
  if (!Types.ObjectId.isValid(roleId)) {
    throw new Error("Invalid role ID.");
  }

  if (suggestions.length === 0) {
    return {
      inserted: 0,
      alreadyExists: 0,
      rejected: [],
    };
  }

  const roleObjectId = new Types.ObjectId(roleId);

  // Retrieve all existing role-level relationships.
  const existingRecords = await SkillDependency.find({
    roleId: roleObjectId,
  })
    .select("skillId prerequisiteSkillId")
    .lean();

  const existingDependencies = existingRecords.map((item) => ({
    skillId: item.skillId.toString(),
    prerequisiteSkillId: item.prerequisiteSkillId.toString(),
  }));

  // Validate suggestions against available skills
  // and existing role-level relationships.
  const validation = validateAIDependencySuggestions(
    suggestions,
    availableSkills,
    existingDependencies
  );

  let inserted = 0;
  let alreadyExists = 0;

  // Save valid suggestions as pending and inactive.
  for (const suggestion of validation.acceptedForStorage) {
    const result = await SkillDependency.updateOne(
      {
        roleId: roleObjectId,
        skillId: new Types.ObjectId(suggestion.skillId),
        prerequisiteSkillId: new Types.ObjectId(
          suggestion.prerequisiteSkillId
        ),
        relationshipType:
          suggestion.relationshipType as DependencyRelationshipType,
      },
      {
        $setOnInsert: {
          roleId: roleObjectId,
          skillId: new Types.ObjectId(suggestion.skillId),
          prerequisiteSkillId: new Types.ObjectId(
            suggestion.prerequisiteSkillId
          ),
          relationshipType:
            suggestion.relationshipType as DependencyRelationshipType,
          strength: suggestion.strength as DependencyStrength,
          source: DependencySource.AI,
          validationStatus: DependencyValidationStatus.PENDING,
          confidence: suggestion.confidence,
          explanation: suggestion.explanation,
          isActive: false,
        },
      },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      inserted++;
    } else {
      alreadyExists++;
    }
  }

  return {
    inserted,
    alreadyExists,
    rejected: validation.rejected,
  };
};
