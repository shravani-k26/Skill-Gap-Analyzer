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


export const getMySkillGapAnalysis = async (
  jobDescriptionId: string
) => {
  const response = await apiRequest<
    ApiResponse<{
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
      };
      skills: {
        skillId: string;
        skillName: string;
        category: string;
        proficiencyLevel: number | null;
        proficiencyLabel: string;
        status:
          | "high_learning_priority"
          | "needs_improvement"
          | "developing_proficiency"
          | "relative_strength"
          | "not_assessed";
      }[];
    }>
  >(
    `/learners/me/skill-gap-analysis/${encodeURIComponent(jobDescriptionId)}`
  );

  return response.data;
};


