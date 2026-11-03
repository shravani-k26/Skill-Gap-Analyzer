import {
  type AIDependencySuggestion,
} from "./aiDependency.service.js";

import {
  normalizeSkillName,
} from "../config/skillDependencies.js";

export interface ValidatedDependencySuggestion {
  skillId: string;
  skillName: string;
  prerequisiteSkillId: string;
  prerequisiteSkillName: string;
  relationshipType: "prerequisite" | "recommended";
  strength: "strong" | "moderate" | "optional";
  confidence: number;
  explanation: string;
}

export interface DependencyValidationResult {
  acceptedForStorage: ValidatedDependencySuggestion[];
  rejected: {
    suggestion: AIDependencySuggestion;
    reason: string;
  }[];
}

// --------------------------------------------------
// Detect circular dependencies
// --------------------------------------------------

const createsCycle = (
  target: string,
  prerequisite: string,
  existingEdges: Map<string, Set<string>>
): boolean => {
  const visited = new Set<string>();

  const hasPath = (current: string): boolean => {
    if (current === target) {
      return true;
    }

    if (visited.has(current)) {
      return false;
    }

    visited.add(current);

    const nextSkills = existingEdges.get(current) ?? new Set();

    for (const next of nextSkills) {
      if (hasPath(next)) {
        return true;
      }
    }

    return false;
  };

  return hasPath(prerequisite);
};

// --------------------------------------------------
// Validate AI dependency suggestions
// --------------------------------------------------

export const validateAIDependencySuggestions = (
  suggestions: AIDependencySuggestion[],
  availableSkills: {
    skillId: string;
    skillName: string;
  }[],
  existingDependencies: {
    skillId: string;
    prerequisiteSkillId: string;
  }[]
): DependencyValidationResult => {
  const skillMap = new Map(
    availableSkills.map((skill) => [
      normalizeSkillName(skill.skillName),
      skill,
    ])
  );

  const existingEdges = new Map<string, Set<string>>();

  for (const dependency of existingDependencies) {
    const target = dependency.skillId;
    const prerequisite = dependency.prerequisiteSkillId;

    if (!existingEdges.has(target)) {
      existingEdges.set(target, new Set());
    }

    existingEdges.get(target)!.add(prerequisite);
  }

  const acceptedForStorage: ValidatedDependencySuggestion[] = [];

  const rejected: DependencyValidationResult["rejected"] = [];

  const seenPairs = new Set<string>();

  for (const suggestion of suggestions) {
    const target = skillMap.get(
      normalizeSkillName(suggestion.skillName)
    );

    const prerequisite = skillMap.get(
      normalizeSkillName(suggestion.prerequisiteSkillName)
    );

    if (!target || !prerequisite) {
      rejected.push({
        suggestion,
        reason: "One or both skills do not exist in the available skill list.",
      });
      continue;
    }

    if (target.skillId === prerequisite.skillId) {
      rejected.push({
        suggestion,
        reason: "A skill cannot depend on itself.",
      });
      continue;
    }

    const pairKey = `${target.skillId}:${prerequisite.skillId}:${suggestion.relationshipType}`;

    if (seenPairs.has(pairKey)) {
      rejected.push({
        suggestion,
        reason: "Duplicate relationship in AI suggestions.",
      });
      continue;
    }

    seenPairs.add(pairKey);

    const alreadyExists = existingDependencies.some(
      (dependency) =>
        dependency.skillId === target.skillId &&
        dependency.prerequisiteSkillId === prerequisite.skillId
    );

    if (alreadyExists) {
      rejected.push({
        suggestion,
        reason: "This relationship already exists in the database.",
      });
      continue;
    }

    if (
      suggestion.relationshipType === "prerequisite" &&
      createsCycle(
        target.skillId,
        prerequisite.skillId,
        existingEdges
      )
    ) {
      rejected.push({
        suggestion,
        reason: "This relationship would create a circular dependency.",
      });
      continue;
    }

    acceptedForStorage.push({
      skillId: target.skillId,
      skillName: target.skillName,
      prerequisiteSkillId: prerequisite.skillId,
      prerequisiteSkillName: prerequisite.skillName,
      relationshipType: suggestion.relationshipType,
      strength: suggestion.strength,
      confidence: suggestion.confidence,
      explanation: suggestion.explanation,
    });

    // Include accepted suggestions when checking subsequent cycles.
    if (suggestion.relationshipType === "prerequisite") {
      if (!existingEdges.has(target.skillId)) {
        existingEdges.set(target.skillId, new Set());
      }

      existingEdges.get(target.skillId)!.add(prerequisite.skillId);
    }
  }

  return {
    acceptedForStorage,
    rejected,
  };
};

