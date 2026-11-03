import "dotenv/config";
import mongoose from "mongoose";

import connectDatabase from "../config/database.js";
import Role from "../models/Role.model.js";
import Skill from "../models/Skill.model.js";

import SkillDependency, {
  DependencyRelationshipType,
  DependencyStrength,
  DependencySource,
  DependencyValidationStatus,
} from "../models/SkillDependency.model.js";

// --------------------------------------------------
// 1. Define initial role-specific dependencies
// --------------------------------------------------

interface DependencySeed {
  role: string;
  skill: string;
  prerequisite: string;
  strength: DependencyStrength;
  explanation: string;
}

const dependencies: DependencySeed[] = [
  // FRONTEND DEVELOPER
  {
    role: "frontend developer",
    skill: "css",
    prerequisite: "html",
    strength: DependencyStrength.MODERATE,
    explanation: "HTML structure helps learners understand how CSS styles web content.",
  },
  {
    role: "frontend developer",
    skill: "react",
    prerequisite: "javascript",
    strength: DependencyStrength.STRONG,
    explanation: "JavaScript fundamentals support understanding React components and application behaviour.",
  },
  {
    role: "frontend developer",
    skill: "typescript",
    prerequisite: "javascript",
    strength: DependencyStrength.MODERATE,
    explanation: "JavaScript knowledge helps learners understand TypeScript syntax and its relationship with JavaScript.",
  },
  {
    role: "frontend developer",
    skill: "next.js",
    prerequisite: "react",
    strength: DependencyStrength.MODERATE,
    explanation: "React knowledge helps learners understand Next.js framework concepts.",
  },

  // BACKEND DEVELOPER
  {
    role: "backend developer",
    skill: "node.js",
    prerequisite: "javascript",
    strength: DependencyStrength.STRONG,
    explanation: "JavaScript fundamentals support development with the Node.js runtime.",
  },
  {
    role: "backend developer",
    skill: "express.js",
    prerequisite: "node.js",
    strength: DependencyStrength.STRONG,
    explanation: "Node.js knowledge supports understanding Express.js server-side development.",
  },
  {
    role: "backend developer",
    skill: "typescript",
    prerequisite: "javascript",
    strength: DependencyStrength.MODERATE,
    explanation: "JavaScript knowledge helps learners understand TypeScript in backend development.",
  },
  {
    role: "backend developer",
    skill: "rest api development",
    prerequisite: "node.js",
    strength: DependencyStrength.MODERATE,
    explanation: "Node.js provides a possible environment for implementing REST APIs.",
  },

  // FULL-STACK DEVELOPER
  {
    role: "full-stack developer",
    skill: "react",
    prerequisite: "javascript",
    strength: DependencyStrength.STRONG,
    explanation: "JavaScript fundamentals support React-based frontend development.",
  },
  {
    role: "full-stack developer",
    skill: "node.js",
    prerequisite: "javascript",
    strength: DependencyStrength.STRONG,
    explanation: "JavaScript fundamentals support backend development using Node.js.",
  },
  {
    role: "full-stack developer",
    skill: "express.js",
    prerequisite: "node.js",
    strength: DependencyStrength.STRONG,
    explanation: "Node.js knowledge supports Express.js backend development.",
  },
  {
    role: "full-stack developer",
    skill: "next.js",
    prerequisite: "react",
    strength: DependencyStrength.MODERATE,
    explanation: "React knowledge helps learners understand Next.js concepts.",
  },
  {
    role: "full-stack developer",
    skill: "typescript",
    prerequisite: "javascript",
    strength: DependencyStrength.MODERATE,
    explanation: "JavaScript knowledge supports learning TypeScript.",
  },

  // SOFTWARE TESTER / QA ENGINEER
  {
    role: "software tester qa engineer",
    skill: "jest",
    prerequisite: "software testing",
    strength: DependencyStrength.MODERATE,
    explanation: "Software testing concepts help learners understand unit testing with Jest.",
  },
  {
    role: "software tester qa engineer",
    skill: "playwright",
    prerequisite: "software testing",
    strength: DependencyStrength.MODERATE,
    explanation: "Software testing concepts help learners understand browser automation and test design.",
  },

  // DEVOPS ENGINEER
  {
    role: "devops engineer",
    skill: "ci/cd",
    prerequisite: "git",
    strength: DependencyStrength.MODERATE,
    explanation: "Version control knowledge supports understanding source-control-based CI/CD workflows.",
  },
  {
    role: "devops engineer",
    skill: "docker",
    prerequisite: "linux",
    strength: DependencyStrength.MODERATE,
    explanation: "Linux fundamentals help learners understand container environments and commands.",
  },
  {
    role: "devops engineer",
    skill: "kubernetes",
    prerequisite: "docker",
    strength: DependencyStrength.MODERATE,
    explanation: "Container concepts provide useful background for understanding Kubernetes.",
  },

  // CLOUD ENGINEER
  {
    role: "cloud engineer",
    skill: "aws",
    prerequisite: "linux",
    strength: DependencyStrength.OPTIONAL,
    explanation: "Linux knowledge can be useful when managing cloud-based workloads.",
  },
  {
    role: "cloud engineer",
    skill: "microsoft azure",
    prerequisite: "linux",
    strength: DependencyStrength.OPTIONAL,
    explanation: "Linux knowledge can be useful when managing cloud-based workloads.",
  },
  {
    role: "cloud engineer",
    skill: "kubernetes",
    prerequisite: "docker",
    strength: DependencyStrength.MODERATE,
    explanation: "Container concepts provide useful background for Kubernetes orchestration.",
  },

  // AI/ML ENGINEER
  {
    role: "ai ml engineer",
    skill: "machine learning",
    prerequisite: "python",
    strength: DependencyStrength.STRONG,
    explanation: "Python is commonly used to implement machine learning workflows.",
  },
  {
    role: "ai ml engineer",
    skill: "machine learning",
    prerequisite: "data analysis",
    strength: DependencyStrength.MODERATE,
    explanation: "Data analysis skills support understanding and preparing datasets for machine learning.",
  },
  {
    role: "ai ml engineer",
    skill: "scikit-learn",
    prerequisite: "machine learning",
    strength: DependencyStrength.STRONG,
    explanation: "Machine learning concepts support effective use of Scikit-learn algorithms.",
  },
  {
    role: "ai ml engineer",
    skill: "tensorflow",
    prerequisite: "machine learning",
    strength: DependencyStrength.STRONG,
    explanation: "Machine learning concepts support understanding TensorFlow model development.",
  },

  // CYBERSECURITY ENGINEER
  {
    role: "cybersecurity engineer",
    skill: "vulnerability assessment",
    prerequisite: "computer networking",
    strength: DependencyStrength.MODERATE,
    explanation: "Networking knowledge helps learners understand network-related vulnerabilities.",
  },
  {
    role: "cybersecurity engineer",
    skill: "owasp security",
    prerequisite: "computer networking",
    strength: DependencyStrength.OPTIONAL,
    explanation: "Networking knowledge can provide useful context when assessing application security.",
  },
  {
    role: "cybersecurity engineer",
    skill: "identity and access management",
    prerequisite: "computer networking",
    strength: DependencyStrength.OPTIONAL,
    explanation: "Networking knowledge can provide useful infrastructure context for identity and access management.",
  },
];

// --------------------------------------------------
// 2. Seed function
// --------------------------------------------------

const seedSkillDependencies = async (): Promise<void> => {
  await connectDatabase();

  // Retrieve existing roles
  const roles = await Role.find({ isActive: true })
    .select("_id normalizedName")
    .lean();

  const roleMap = new Map(
    roles.map((role) => [
      role.normalizedName,
      role._id,
    ])
  );

  // Retrieve existing skills
  const skills = await Skill.find({ isActive: true })
    .select("_id normalizedName")
    .lean();

  const skillMap = new Map(
    skills.map((skill) => [
      skill.normalizedName,
      skill._id,
    ])
  );

  let insertedCount = 0;
  let existingCount = 0;

  // --------------------------------------------------
  // 3. Insert predefined dependencies
  // --------------------------------------------------

  for (const dependency of dependencies) {
    const roleId = roleMap.get(dependency.role);

    const skillId = skillMap.get(dependency.skill);

    const prerequisiteSkillId = skillMap.get(
      dependency.prerequisite
    );

    if (!roleId) {
      throw new Error(
        `Role not found: ${dependency.role}`
      );
    }

    if (!skillId) {
      throw new Error(
        `Target skill not found: ${dependency.skill}`
      );
    }

    if (!prerequisiteSkillId) {
      throw new Error(
        `Prerequisite skill not found: ${dependency.prerequisite}`
      );
    }

    if (skillId.toString() === prerequisiteSkillId.toString()) {
      throw new Error(
        `A skill cannot depend on itself: ${dependency.skill}`
      );
    }

    const result = await SkillDependency.updateOne(
      {
        roleId,
        skillId,
        prerequisiteSkillId,
        relationshipType:
          DependencyRelationshipType.PREREQUISITE,
      },
      {
        $setOnInsert: {
          roleId,
          skillId,
          prerequisiteSkillId,
          relationshipType:
            DependencyRelationshipType.PREREQUISITE,
          strength: dependency.strength,
          source: DependencySource.PREDEFINED,
          validationStatus:
            DependencyValidationStatus.ACCEPTED,
          confidence: null,
          explanation: dependency.explanation,
          isActive: true,
        },
      },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      insertedCount++;
    } else {
      existingCount++;
    }
  }

  // --------------------------------------------------
  // 4. Display seed results
  // --------------------------------------------------

  console.log("\nSkill dependency seed completed.");
  console.log(`Roles available: ${roleMap.size}`);
  console.log(`Skills available: ${skillMap.size}`);
  console.log(`Relationships defined: ${dependencies.length}`);
  console.log(`New relationships inserted: ${insertedCount}`);
  console.log(`Existing relationships preserved: ${existingCount}`);
};

// --------------------------------------------------
// 5. Execute seed
// --------------------------------------------------

seedSkillDependencies()
  .catch((error: unknown) => {
    console.error("Skill dependency seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });