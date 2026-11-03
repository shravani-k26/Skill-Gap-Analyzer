import { apiRequest } from "../../services/api";

import type {
  ApiResponse,
  LearnerProfile,
  LearnerProfileInput,
  Skill,
  SkillAssessment,
  AssessedSkillInput,
  Role,
} from "./types";

// --------------------------------------------------
// 1. Skill Gap Analysis Types
// --------------------------------------------------

export type SkillGapStatus =
  | "high_learning_priority"
  | "needs_improvement"
  | "developing_proficiency"
  | "relative_strength"
  | "not_assessed";

export type SkillPriority =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "assessment_needed";

export type DependencyStrength =
  | "strong"
  | "moderate"
  | "optional";

export type DependencySource =
  | "predefined"
  | "ai";

export type DependencyValidationStatus =
  | "pending"
  | "accepted"
  | "rejected";

export type DependencyRelationshipType =
  | "prerequisite"
  | "recommended";

export interface AnalysisSkill {
  skillId: string;
  skillName: string;
  category: string;
  proficiencyLevel: number | null;
  proficiencyLabel: string;
  status: SkillGapStatus;
  priority: SkillPriority;
  priorityScore: number | null;
  learningOrder: number | null;
  prerequisiteSkills: string[];
  blockedBy: string[];
  learningReason: string;
  learningStatus:
  | "needs_learning"
  | "continue_developing"
  | "relative_strength"
  | "assessment_needed";
}

export interface DependencyResult {
  skillId: string;
  skillName: string;
  prerequisiteName: string;
  prerequisiteSkillId: string | null;
  prerequisiteProficiency: number | null;

  relationshipType: DependencyRelationshipType;
  strength: DependencyStrength;

  source: DependencySource;
  validationStatus: DependencyValidationStatus;

  confidence: number | null;
  explanation: string;

  isPrerequisiteAssessed: boolean;
  isReady: boolean;
}

export interface SkillGapAnalysis {
  jobDescription: {
    id: string;
    title: string;
    company?: string;
    targetRole: string;
  };

  assessment: {
    id: string;
    assessedAt: string;
  } | null;

  summary: {
    totalRequiredSkills: number;
    highLearningPriority: number;
    needsImprovement: number;
    developingProficiency: number;
    relativeStrength: number;
    notAssessed: number;

    priorityCounts: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      assessmentNeeded: number;
    };
  };

  skills: AnalysisSkill[];
  dependencies: DependencyResult[];
}


export interface ComparisonMethodResult {
  methodName: string;
  dependencyCount: number;
  predefinedDependencyCount?: number;
  acceptedAIDependencyCount?: number;
  dependencies: DependencyResult[];
  skills: AnalysisSkill[];
}

export interface SkillGapComparison {
  jobDescription: {
    id: string;
    title: string;
    company?: string;
    targetRole: string;
  };

  assessment: {
    id: string;
    assessedAt: string;
  } | null;

  commonInputs: {
    totalExtractedSkills: number;
    totalAssessedSkills: number;
    totalUnassessedSkills: number;
  };

  methods: {
    proficiencyOnly: ComparisonMethodResult;
    predefined: ComparisonMethodResult;
    hybrid: ComparisonMethodResult;
  };
}

// --------------------------------------------------
// 2. Learner Profile
// --------------------------------------------------

// Get the authenticated learner's profile.
export const getMyLearnerProfile = async () => {
  const response = await apiRequest<ApiResponse<LearnerProfile>>(
    "/learners/me"
  );

  return response.data;
};

// Create or update the learner's profile.
export const saveMyLearnerProfile = async (
  input: LearnerProfileInput
) => {
  const response = await apiRequest<ApiResponse<LearnerProfile>>(
    "/learners/me",
    {
      method: "PUT",
      body: JSON.stringify(input),
    }
  );

  return response.data;
};

// --------------------------------------------------
// 3. Roles and Skills
// --------------------------------------------------

// Get available roles from the existing Role Management API.
export const getAvailableRoles = async () => {
  const response = await apiRequest<ApiResponse<Role[]>>(
    "/roles"
  );

  return response.data;
};

// Get available skills from the existing Role Management API.
export const getAvailableSkills = async () => {
  const response = await apiRequest<ApiResponse<Skill[]>>(
    "/roles/skills"
  );

  return response.data;
};

// --------------------------------------------------
// 4. Skill Assessments
// --------------------------------------------------

// Submit a new assessment. Previous assessments are preserved.
export const submitSkillAssessment = async (
  skills: AssessedSkillInput[]
) => {
  const response = await apiRequest<ApiResponse<SkillAssessment>>(
    "/learners/me/assessments",
    {
      method: "POST",
      body: JSON.stringify({ skills }),
    }
  );

  return response.data;
};

// Get the latest assessment's skills.
export const getMyLatestSkills = async () => {
  const response = await apiRequest<
    ApiResponse<{
      assessmentId?: string;
      assessedAt?: string;
      skills: {
        skill: Skill;
        proficiencyLevel: number;
      }[];
    }>
  >("/learners/me/skills");

  return response.data;
};

// Get all historical assessments.
export const getMyAssessmentHistory = async () => {
  const response = await apiRequest<ApiResponse<SkillAssessment[]>>(
    "/learners/me/assessments"
  );

  return response.data;
};

// Get one assessment by ID.
export const getMyAssessmentById = async (id: string) => {
  const response = await apiRequest<ApiResponse<SkillAssessment>>(
    `/learners/me/assessments/${encodeURIComponent(id)}`
  );

  return response.data;
};

// --------------------------------------------------
// 5. Role Skill Requirements
// --------------------------------------------------

export interface RoleSkillRequirement {
  _id: string;
  role: string;
  skill: Skill;
  requirementType: string;
  status: string;
}

export const getSkillsByRole = async (roleName: string) => {
  const response = await apiRequest<ApiResponse<RoleSkillRequirement[]>>(
    `/roles/${encodeURIComponent(roleName)}/skills`
  );

  return response.data;
};

// --------------------------------------------------
// 6. Skill Gap Analysis
// --------------------------------------------------

export const getMySkillGapAnalysis = async (
  jobDescriptionId: string
): Promise<SkillGapAnalysis> => {
  const response = await apiRequest<
    ApiResponse<SkillGapAnalysis>
  >(
    `/learners/me/skill-gap-analysis/${encodeURIComponent(
      jobDescriptionId
    )}`
  );

  return response.data;
};


export const getMySkillGapComparison = async (
  jobDescriptionId: string
): Promise<SkillGapComparison> => {
  const response = await apiRequest<
    ApiResponse<SkillGapComparison>
  >(
    `/learners/me/skill-gap-comparison/${encodeURIComponent(
      jobDescriptionId
    )}`
  );

  return response.data;
};


