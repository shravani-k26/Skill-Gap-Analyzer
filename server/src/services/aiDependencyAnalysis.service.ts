import mongoose from "mongoose";
import ApiError from "../errors/ApiError.js";
import JobDescription from "../models/JobDescription.model.js";
import Role from "../models/Role.model.js";

import {
  getActiveSkills,
  matchSkillsInText,
} from "./skillExtraction.service.js";

import {
  generateAIDependencySuggestions,
} from "./aiDependency.service.js";

import {
  saveAIDependencySuggestions,
} from "./aiDependencyPersistence.service.js";

export const generateDependenciesForJobDescription = async (
  jobDescriptionId: string
) => {
  if (!mongoose.isValidObjectId(jobDescriptionId)) {
    throw new ApiError(400, "Invalid job description ID");
  }

  const jobDescription = await JobDescription.findById(
    jobDescriptionId
  ).lean();

  if (!jobDescription) {
    throw new ApiError(404, "Job description not found");
  }

  const role = await Role.findById(
    jobDescription.targetRole
  ).lean();

  if (!role) {
    throw new ApiError(404, "Target role not found");
  }

  const activeSkills = await getActiveSkills();

  const extractedSkills = matchSkillsInText(
    jobDescription.description,
    activeSkills
  );

  if (extractedSkills.length < 2) {
    throw new ApiError(
      400,
      "At least two recognized skills are required to generate dependencies."
    );
  }

  const availableSkills = extractedSkills.map((skill) => ({
    skillId: skill._id.toString(),
    skillName: skill.name,
  }));

  const suggestions = await generateAIDependencySuggestions(
    role.name,
    availableSkills
  );

  const result = await saveAIDependencySuggestions(
    role._id.toString(),
    suggestions,
    availableSkills
  );

  return {
    role: role.name,
    totalExtractedSkills: availableSkills.length,
    totalAISuggestions: suggestions.length,
    savedAsPending: result.inserted,
    rejectedSuggestions: result.rejected,
  };
};