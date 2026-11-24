
import { Schema, model, Types } from "mongoose";

// --------------------------------------------------
// 1. Enums
// --------------------------------------------------

export enum LearningDifficulty {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
}

export enum LearningResourceType {
  DOCUMENTATION = "documentation",
  TUTORIAL = "tutorial",
  VIDEO = "video",
  ARTICLE = "article",
  COURSE = "course",
  OTHER = "other",
}

export enum ResourceVerificationStatus {
  VERIFIED = "verified",
  UNVERIFIED = "unverified",
  INVALID = "invalid",
}


export enum ResourceRelevanceStatus {
  RELEVANT = "relevant",
  NEEDS_REVIEW = "needs_review",
  NOT_RELEVANT = "not_relevant",
}

// --------------------------------------------------
// 2. Interfaces
// --------------------------------------------------

export interface ILearningResource {
  title: string;
  provider: string;
  url: string;
  resourceType: LearningResourceType;
  description: string;
  verificationStatus: ResourceVerificationStatus;
  verifiedAt: Date | null;
  relevanceStatus: ResourceRelevanceStatus;
}

export interface ILearningTopic {
  skill: Types.ObjectId;
  topicTitle: string;
  reason: string;
  sequenceOrder: number;
  difficulty: LearningDifficulty;
  learningObjectives: string[];
  estimatedDuration: string;
  resources: ILearningResource[];
}

export interface ISkillSummary {
  skill: Types.ObjectId;
  proficiencyLevel: number;
  summary: string;
  suggestedResources: ILearningResource[];
}

export interface IUnassessedSkill {
  skill: Types.ObjectId;
  message: string;
}

export interface ILearningRecommendation {
  learner: Types.ObjectId;
  targetRole: Types.ObjectId;
  sourceAssessment: Types.ObjectId | null;
  topics: ILearningTopic[];
  skillSummaries: ISkillSummary[];
  unassessedSkills: IUnassessedSkill[];
  generatedBy: string;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// --------------------------------------------------
// 3. Resource schema
// --------------------------------------------------

const learningResourceSchema = new Schema<ILearningResource>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
    },
    resourceType: {
      type: String,
      enum: Object.values(LearningResourceType),
      required: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    verificationStatus: {
      type: String,
      enum: Object.values(ResourceVerificationStatus),
      default: ResourceVerificationStatus.UNVERIFIED,
      required: true,
    },
    relevanceStatus: {
      type: String,
      enum: Object.values(ResourceRelevanceStatus),
      default: ResourceRelevanceStatus.NEEDS_REVIEW,
      required: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

// --------------------------------------------------
// 4. Detailed learning topic schema
// --------------------------------------------------

const learningTopicSchema = new Schema<ILearningTopic>(
  {
    skill: {
      type: Schema.Types.ObjectId,
      ref: "Skill",
      required: true,
    },
    topicTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    sequenceOrder: {
      type: Number,
      required: true,
      min: 1,
    },
    difficulty: {
      type: String,
      enum: Object.values(LearningDifficulty),
      required: true,
    },
    learningObjectives: {
      type: [String],
      required: true,
      validate: {
        validator: (items: string[]) => items.length > 0,
        message: "At least one learning objective is required",
      },
    },
    estimatedDuration: {
      type: String,
      required: true,
      trim: true,
    },
    resources: {
      type: [learningResourceSchema],
      default: [],
    },
  },
  { _id: false }
);

// --------------------------------------------------
// 5. Skill summary schema
// --------------------------------------------------

const skillSummarySchema = new Schema<ISkillSummary>(
  {
    skill: {
      type: Schema.Types.ObjectId,
      ref: "Skill",
      required: true,
    },
    proficiencyLevel: {
      type: Number,
      required: true,
      min: 4,
      max: 5,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    suggestedResources: {
      type: [learningResourceSchema],
      default: [],
    },
  },
  { _id: false }
);

// --------------------------------------------------
// 6. Unassessed skill schema
// --------------------------------------------------

const unassessedSkillSchema = new Schema<IUnassessedSkill>(
  {
    skill: {
      type: Schema.Types.ObjectId,
      ref: "Skill",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
  },
  { _id: false }
);

// --------------------------------------------------
// 7. Main recommendation schema
// --------------------------------------------------

const learningRecommendationSchema =
  new Schema<ILearningRecommendation>(
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
      sourceAssessment: {
        type: Schema.Types.ObjectId,
        ref: "SkillAssessment",
        default: null,
      },
      topics: {
        type: [learningTopicSchema],
        default: [],
      },
      skillSummaries: {
        type: [skillSummarySchema],
        default: [],
      },
      unassessedSkills: {
        type: [unassessedSkillSchema],
        default: [],
      },
      generatedBy: {
        type: String,
        default: "Gemini",
      },
      generatedAt: {
        type: Date,
        default: Date.now,
        required: true,
      },
    },
    { timestamps: true }
  );

// --------------------------------------------------
// 8. Indexes
// --------------------------------------------------

learningRecommendationSchema.index({
  learner: 1,
  targetRole: 1,
  generatedAt: -1,
});

// --------------------------------------------------
// 9. Model
// --------------------------------------------------

const LearningRecommendation = model<ILearningRecommendation>(
  "LearningRecommendation",
  learningRecommendationSchema
);

export default LearningRecommendation;
