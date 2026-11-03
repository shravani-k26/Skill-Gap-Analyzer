
import "dotenv/config";

import {
  generateAIDependencySuggestions,
} from "../services/aiDependency.service.js";

const testAIDependency = async () => {
  try {
    const suggestions = await generateAIDependencySuggestions(
      "Full-Stack Developer",
      [
        {
          skillId: "1",
          skillName: "JavaScript",
        },
        {
          skillId: "2",
          skillName: "React",
        },
        {
          skillId: "3",
          skillName: "Node.js",
        },
        {
          skillId: "4",
          skillName: "Express.js",
        },
      ]
    );

    console.log("\nAI Dependency Suggestions:");
    console.log(JSON.stringify(suggestions, null, 2));
  } catch (error) {
    console.error("AI dependency test failed:", error);
  }
};

testAIDependency();
