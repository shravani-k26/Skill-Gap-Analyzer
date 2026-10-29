import { Schema, model, Types } from "mongoose";

export interface IAssessedSkill {
  skill: Types.ObjectId;
  proficiencyLevel: number;
}

export interface ISkillAssessment {
  learner: Types.ObjectId;
  targetRole: Types.ObjectId;
  skills: IAssessedSkill[];
  assessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const assessedSkillSchema = new Schema<IAssessedSkill>(
  {
    skill: {
      type: Schema.Types.ObjectId,
      ref: "Skill",
      required: true,
    },
    proficiencyLevel: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: "Proficiency level must be an integer from 0 to 5",
      },
    },
  },
  { _id: false }
);

const skillAssessmentSchema = new Schema<ISkillAssessment>(
  {
    learner: {
      type: Schema.Types.ObjectId,
      ref: "LearnerProfile",
      required: true,
      index: true,
    },
    targetRole: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    skills: {
      type: [assessedSkillSchema],
      default: [],
    },
    assessedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { timestamps: true }
);

// Helps retrieve a learner's assessments from newest to oldest.
skillAssessmentSchema.index({
  learner: 1,
  assessedAt: -1,
});

// Prevent duplicate skills in the same assessment.
skillAssessmentSchema.path("skills").validate(
  (skills: IAssessedSkill[]) => {
    const ids = skills.map((item) => item.skill.toString());
    return new Set(ids).size === ids.length;
  },
  "A skill can only appear once in an assessment"
);

const SkillAssessment = model<ISkillAssessment>(
  "SkillAssessment",
  skillAssessmentSchema
);

export default SkillAssessment;
