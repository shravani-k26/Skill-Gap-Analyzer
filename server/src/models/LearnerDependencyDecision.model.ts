import { Schema, model, type Document, Types } from "mongoose";

export enum LearnerDependencyDecisionType {
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

export interface ILearnerDependencyDecision extends Document {
  learnerId: Types.ObjectId;
  dependencyId: Types.ObjectId;
  decision: LearnerDependencyDecisionType;
  createdAt: Date;
  updatedAt: Date;
}

const learnerDependencyDecisionSchema =
  new Schema<ILearnerDependencyDecision>(
    {
      learnerId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      dependencyId: {
        type: Schema.Types.ObjectId,
        ref: "SkillDependency",
        required: true,
      },

      decision: {
        type: String,
        enum: Object.values(LearnerDependencyDecisionType),
        required: true,
      },
    },
    {
      timestamps: true,
    }
  );

// One decision per learner for each shared AI suggestion.
learnerDependencyDecisionSchema.index(
  {
    learnerId: 1,
    dependencyId: 1,
  },
  {
    unique: true,
  }
);

// Efficiently retrieve a learner's decisions.
learnerDependencyDecisionSchema.index({
  learnerId: 1,
  decision: 1,
});

const LearnerDependencyDecision =
  model<ILearnerDependencyDecision>(
    "LearnerDependencyDecision",
    learnerDependencyDecisionSchema
  );

export default LearnerDependencyDecision;
