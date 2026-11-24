
import { Router } from "express";

import authenticateUser from "../middleware/auth.middleware.js";

import {
  saveProfile,
  getMyProfile,
  submitAssessment,
  getMyAssessmentHistory,
  getMyAssessmentById,
  getMySkills,
  getMySkillGapAnalysis,
  generateMyAIDependencies,
  getMyAIDependencySuggestions,
  decideMyAIDependency,
  getMySkillGapComparison,
  generateMyLearningRecommendations,
  getMyLearningRecommendations,
} from "../controllers/learner.controller.js";

const router = Router();

// All learner endpoints require authentication.
router.use(authenticateUser);

// Learner profile
router.get("/me", getMyProfile);
router.put("/me", saveProfile);

// Current skills and assessment history
router.get("/me/skills", getMySkills);
router.post("/me/assessments", submitAssessment);
router.get("/me/assessments", getMyAssessmentHistory);
router.get("/me/assessments/:id", getMyAssessmentById);

// Skill gap analysis
router.get(
  "/me/skill-gap-analysis/:jobDescriptionId",
  getMySkillGapAnalysis
);

// AI dependency suggestions
router.post(
  "/me/ai-dependencies/:jobDescriptionId",
  generateMyAIDependencies
);

router.get(
  "/me/ai-dependencies/role/:roleId",
  getMyAIDependencySuggestions
);

router.put(
  "/me/ai-dependencies/role/:roleId/:dependencyId/decision",
  decideMyAIDependency
);

// Compare the three research methods.
router.get(
  "/me/skill-gap-comparison/:jobDescriptionId",
  getMySkillGapComparison
);

// Personalized learning recommendations
router.post(
  "/me/learning-recommendations",
  generateMyLearningRecommendations
);

router.get(
  "/me/learning-recommendations",
  getMyLearningRecommendations
);

export default router;
