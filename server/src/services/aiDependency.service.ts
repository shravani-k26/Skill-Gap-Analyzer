
import { z } from "zod";
import genAI from "./gemini.service.js";

// --------------------------------------------------
// 1. Define input and output types
// --------------------------------------------------

export interface DependencySkillInput {
  skillId: string;
  skillName: string;
}

const aiDependencySchema = z.object({
  dependencies: z.array(
    z.object({
      skillName: z.string().min(1),
      prerequisiteSkillName: z.string().min(1),
      relationshipType: z.enum([
        "prerequisite",
        "recommended",
      ]),
      strength: z.enum([
        "strong",
        "moderate",
        "optional",
      ]),
      confidence: z.number().min(0).max(1),
      explanation: z.string().min(1).max(1000),
    })
  ),
});

export type AIDependencySuggestion = z.infer<
  typeof aiDependencySchema
>["dependencies"][number];

// --------------------------------------------------
// 2. Retry configuration
// --------------------------------------------------

const MAX_RETRIES = 2;
const INITIAL_RETRY_DELAY = 1000;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (error: unknown): boolean => {
  if (
    typeof error !== "object" ||
    error === null ||
    !("status" in error)
  ) {
    return false;
  }

  const status = Number(error.status);

  return (
    status === 429 ||
    status === 503 ||
    status >= 500
  );
};

// --------------------------------------------------
// 3. Generate AI dependency suggestions
// --------------------------------------------------

export const generateAIDependencySuggestions = async (
  roleName: string,
  skills: DependencySkillInput[]
): Promise<AIDependencySuggestion[]> => {
  if (skills.length < 2) {
    return [];
  }

  const skillNames = skills.map(
    (skill) => skill.skillName
  );

  let response;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      response = await genAI.models.generateContent({
        model:
          process.env.GEMINI_MODEL || "gemini-3.8-flash",

        contents: `
You are an expert software engineering learning-path analyst.

Your task is to identify useful learning dependencies between software development skills.

Target role: ${roleName}

Available skills:
${JSON.stringify(skillNames)}

Instructions:

1. Only suggest relationships between the skills provided.
2. Do not invent new skills.
3. A prerequisite means foundational knowledge that should generally be learned before the target skill.
4. A recommended relationship means useful supporting knowledge, but it is not essential.
5. Use strong, moderate, or optional strength appropriately.
6. Do not create unnecessary dependencies between unrelated skills.
7. Avoid circular relationships.
8. Do not create a relationship where a skill depends on itself.
9. Keep explanations short and technically meaningful.
10. Return an empty dependencies array if no meaningful relationships exist.
11. Confidence must be a numerical estimate between 0 and 1. It is an indicative model estimate, not a statistically calibrated probability.

For every relationship:
- skillName is the target skill.
- prerequisiteSkillName is the foundational or supporting skill.
`,

        config: {
          responseMimeType: "application/json",

          responseJsonSchema: {
            type: "object",
            properties: {
              dependencies: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    skillName: { type: "string" },
                    prerequisiteSkillName: {
                      type: "string",
                    },
                    relationshipType: {
                      type: "string",
                      enum: [
                        "prerequisite",
                        "recommended",
                      ],
                    },
                    strength: {
                      type: "string",
                      enum: [
                        "strong",
                        "moderate",
                        "optional",
                      ],
                    },
                    confidence: {
                      type: "number",
                      minimum: 0,
                      maximum: 1,
                    },
                    explanation: { type: "string" },
                  },
                  required: [
                    "skillName",
                    "prerequisiteSkillName",
                    "relationshipType",
                    "strength",
                    "confidence",
                    "explanation",
                  ],
                  additionalProperties: false,
                },
              },
            },
            required: ["dependencies"],
            additionalProperties: false,
          },
        },
      });

      // Successful Gemini response.
      break;
    } catch (error) {
      const shouldRetry = isRetryableError(error);

      if (!shouldRetry || attempt === MAX_RETRIES) {
        console.error(
          `Gemini dependency generation failed after ${attempt} attempt(s).`,
          error
        );

        throw new Error(
          shouldRetry
            ? "Gemini is temporarily unavailable. Please try again later."
            : "Failed to generate AI dependency suggestions."
        );
      }

      const retryDelay =
        INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);

      console.warn(
        `Gemini request failed. Retrying in ${retryDelay}ms. Attempt ${attempt}/${MAX_RETRIES}.`
      );

      await delay(retryDelay);
    }
  }

  // --------------------------------------------------
  // 4. Validate Gemini response
  // --------------------------------------------------

  if (!response?.text) {
    throw new Error("Gemini returned an empty response.");
  }

  let parsedResponse: unknown;

  try {
    parsedResponse = JSON.parse(response.text);
  } catch {
    throw new Error("Gemini returned invalid JSON.");
  }

  const validatedResponse =
    aiDependencySchema.safeParse(parsedResponse);

  if (!validatedResponse.success) {
    throw new Error(
      "Gemini response failed dependency validation."
    );
  }

  return validatedResponse.data.dependencies;
};
