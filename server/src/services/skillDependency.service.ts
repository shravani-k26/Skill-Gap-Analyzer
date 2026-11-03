
import { Types, type InferSchemaType } from "mongoose";

import Skill from "../models/Skill.model.js";

import SkillDependency, {
  DependencyRelationshipType,
  DependencyStrength,
  DependencySource,
  DependencyValidationStatus,
} from "../models/SkillDependency.model.js";

import LearnerDependencyDecision, {
  LearnerDependencyDecisionType,
} from "../models/LearnerDependencyDecision.model.js";

// --------------------------------------------------
// 1. Define types
// --------------------------------------------------

interface TargetSkill {
  skillId: string;
  skillName: string;
}

interface LearnerSkill {
  skillId: string;
  skillName: string;
  proficiencyLevel: number | null;
}

export interface DependencyResult {
  skillId: string;
  skillName: string;
  prerequisiteName: string;
  prerequisiteSkillId: string;

  prerequisiteProficiency: number | null;
  relationshipType: DependencyRelationshipType;
  strength: DependencyStrength;

  source: string;
  validationStatus: string;
  learnerDecision: "accepted" | null;
  confidence: number | null;
  explanation: string;

  isPrerequisiteAssessed: boolean;
  isReady: boolean;
}

// Infer the dependency document's schema type.
type SkillDependencyRecord =
  InferSchemaType<typeof SkillDependency.schema> & {
    _id: Types.ObjectId;
  };

const MINIMUM_PREREQUISITE_LEVEL = 3;

// --------------------------------------------------
// 2. Retrieve and format dependency results
// --------------------------------------------------

const formatDependencyResults = async (
  dependencies: SkillDependencyRecord[],
  targetSkills: TargetSkill[],
  learnerSkills: LearnerSkill[]
): Promise<DependencyResult[]> => {
  if (dependencies.length === 0) {
    return [];
  }

  // Retrieve prerequisite skill IDs.
  const prerequisiteIds = [
    ...new Set(
      dependencies.map((dependency) =>
        dependency.prerequisiteSkillId.toString()
      )
    ),
  ];

  // Retrieve prerequisite skill names.
  const prerequisiteSkills = await Skill.find({
    _id: { $in: prerequisiteIds },
    isActive: true,
  })
    .select("name")
    .lean();

  const prerequisiteNameMap = new Map(
    prerequisiteSkills.map((skill) => [
      skill._id.toString(),
      skill.name,
    ])
  );

  // Map learner proficiency.
  const learnerSkillMap = new Map(
    learnerSkills.map((skill) => [
      skill.skillId,
      skill,
    ])
  );

  // Map target skills.
  const targetSkillMap = new Map(
    targetSkills.map((skill) => [
      skill.skillId,
      skill,
    ])
  );

  const results: DependencyResult[] = [];

  // Prepare dependency results.
  for (const dependency of dependencies) {
    const targetSkill = targetSkillMap.get(
      dependency.skillId.toString()
    );

    const prerequisiteId =
      dependency.prerequisiteSkillId.toString();

    const prerequisiteName =
      prerequisiteNameMap.get(prerequisiteId);

    if (!targetSkill || !prerequisiteName) {
      continue;
    }

    const learnerSkill =
      learnerSkillMap.get(prerequisiteId);

    const proficiencyLevel =
      learnerSkill?.proficiencyLevel ?? null;

    const isPrerequisiteAssessed =
      proficiencyLevel !== null;

    const isReady =
      proficiencyLevel !== null &&
      proficiencyLevel >= MINIMUM_PREREQUISITE_LEVEL;

    results.push({
      skillId: targetSkill.skillId,
      skillName: targetSkill.skillName,
      prerequisiteName,
      prerequisiteSkillId: prerequisiteId,

      prerequisiteProficiency: proficiencyLevel,
      relationshipType: dependency.relationshipType,
      strength: dependency.strength,

      source: dependency.source,
      validationStatus: dependency.validationStatus,

      learnerDecision:
        dependency.source === DependencySource.AI
          ? "accepted"
          : null,

      confidence: dependency.confidence ?? null,
      explanation: dependency.explanation,

      isPrerequisiteAssessed,
      isReady,
    });
  }

  return results;
};

// --------------------------------------------------
// 3. Retrieve predefined dependencies only
// --------------------------------------------------

export const analyzePredefinedSkillDependencies = async (
  roleId: string,
  targetSkills: TargetSkill[],
  learnerSkills: LearnerSkill[]
): Promise<DependencyResult[]> => {
  if (targetSkills.length === 0) {
    return [];
  }

  const dependencies = await SkillDependency.find({
    roleId: new Types.ObjectId(roleId),

    skillId: {
      $in: targetSkills.map(
        (skill) => new Types.ObjectId(skill.skillId)
      ),
    },

    source: DependencySource.PREDEFINED,
    validationStatus: DependencyValidationStatus.ACCEPTED,
    isActive: true,
  }).lean();

  return formatDependencyResults(
    dependencies as SkillDependencyRecord[],
    targetSkills,
    learnerSkills
  );
};

// --------------------------------------------------
// 4. Retrieve AI dependencies accepted by this learner
// --------------------------------------------------

export const analyzeAcceptedAISkillDependencies = async (
  learnerId: string,
  roleId: string,
  targetSkills: TargetSkill[],
  learnerSkills: LearnerSkill[]
): Promise<DependencyResult[]> => {
  if (targetSkills.length === 0) {
    return [];
  }

  // Retrieve pending and inactive shared AI suggestions.
  const aiSuggestions = await SkillDependency.find({
    roleId: new Types.ObjectId(roleId),

    skillId: {
      $in: targetSkills.map(
        (skill) => new Types.ObjectId(skill.skillId)
      ),
    },

    source: DependencySource.AI,
    validationStatus: DependencyValidationStatus.PENDING,
    isActive: false,
  }).lean();

  if (aiSuggestions.length === 0) {
    return [];
  }

  // Retrieve suggestions individually accepted by the learner.
  const decisions = await LearnerDependencyDecision.find({
    learnerId: new Types.ObjectId(learnerId),

    dependencyId: {
      $in: aiSuggestions.map(
        (dependency) => dependency._id
      ),
    },

    decision: LearnerDependencyDecisionType.ACCEPTED,
  }).lean();

  const acceptedIds = new Set(
    decisions.map((decision) =>
      decision.dependencyId.toString()
    )
  );

  // Keep only accepted AI dependencies.
  const acceptedDependencies = aiSuggestions.filter(
    (dependency) =>
      acceptedIds.has(dependency._id.toString())
  );

  return formatDependencyResults(
    acceptedDependencies as SkillDependencyRecord[],
    targetSkills,
    learnerSkills
  );
};

// --------------------------------------------------
// 5. Hybrid method: predefined + accepted AI
// --------------------------------------------------

export const analyzeSkillDependencies = async (
  learnerId: string,
  roleId: string,
  targetSkills: TargetSkill[],
  learnerSkills: LearnerSkill[]
): Promise<DependencyResult[]> => {
  const [
    predefinedDependencies,
    acceptedAIDependencies,
  ] = await Promise.all([
    analyzePredefinedSkillDependencies(
      roleId,
      targetSkills,
      learnerSkills
    ),

    analyzeAcceptedAISkillDependencies(
      learnerId,
      roleId,
      targetSkills,
      learnerSkills
    ),
  ]);

  return [
    ...predefinedDependencies,
    ...acceptedAIDependencies,
  ];
};
