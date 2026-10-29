import { z } from "zod";
import mongoose from "mongoose";
import {
  EducationLevel,
  ProfessionalStatus,
} from "../models/LearnerProfile.model.js";

const objectIdSchema = z.string().refine(
  (value) => mongoose.isValidObjectId(value),
  "Invalid MongoDB ObjectId"
);

export const learnerProfileSchema = z.object({
  educationLevel: z.nativeEnum(EducationLevel),
  professionalStatus: z.nativeEnum(ProfessionalStatus),
  yearsOfExperience: z.number().finite().min(0),
  targetRole: objectIdSchema,
});

export const assessedSkillSchema = z.object({
  skill: objectIdSchema,
  proficiencyLevel: z
  .number()
  .int()
  .min(0, "Proficiency level must be at least 0")
  .max(5, "Proficiency level must not exceed 5"),
});

export const createSkillAssessmentSchema = z.object({
  skills: z.array(assessedSkillSchema),
});

export type LearnerProfileInput = z.infer<
  typeof learnerProfileSchema
>;

export type CreateSkillAssessmentInput = z.infer<
  typeof createSkillAssessmentSchema
>;
