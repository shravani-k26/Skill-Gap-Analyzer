import { Schema, model, type Document, Types } from "mongoose";

export enum DependencyRelationshipType {
  PREREQUISITE = "prerequisite",
  RECOMMENDED = "recommended",
}

export enum DependencyStrength {
  STRONG = "strong",
  MODERATE = "moderate",
  OPTIONAL = "optional",
}

export enum DependencySource {
  PREDEFINED = "predefined",
  AI = "ai",
}

export enum DependencyValidationStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

export interface ISkillDependency extends Document {
  roleId: Types.ObjectId;
  skillId: Types.ObjectId;
  prerequisiteSkillId: Types.ObjectId;
  relationshipType: DependencyRelationshipType;
  strength: DependencyStrength;
  source: DependencySource;
  validationStatus: DependencyValidationStatus;
  confidence: number | null;
  explanation: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const skillDependencySchema = new Schema<ISkillDependency>(
  {
    roleId: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },

    skillId: {
      type: Schema.Types.ObjectId,
      ref: "Skill",
      required: true,
    },

    prerequisiteSkillId: {
      type: Schema.Types.ObjectId,
      ref: "Skill",
      required: true,
    },

    relationshipType: {
      type: String,
      enum: Object.values(DependencyRelationshipType),
      default: DependencyRelationshipType.PREREQUISITE,
      required: true,
    },

    strength: {
      type: String,
      enum: Object.values(DependencyStrength),
      required: true,
    },

    source: {
      type: String,
      enum: Object.values(DependencySource),
      default: DependencySource.PREDEFINED,
      required: true,
    },

    validationStatus: {
      type: String,
      enum: Object.values(DependencyValidationStatus),
      default: DependencyValidationStatus.ACCEPTED,
      required: true,
    },

    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },

    explanation: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate relationships for the same role and skill pair.
skillDependencySchema.index(
  {
    roleId: 1,
    skillId: 1,
    prerequisiteSkillId: 1,
    relationshipType: 1,
  },
  {
    unique: true,
  }
);

// Improve dependency lookup performance.
skillDependencySchema.index({
  roleId: 1,
  skillId: 1,
  validationStatus: 1,
  isActive: 1,
});

const SkillDependency = model<ISkillDependency>(
  "SkillDependency",
  skillDependencySchema
);

export default SkillDependency;