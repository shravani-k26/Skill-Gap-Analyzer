
import { z } from "zod";
import genAI from "./gemini.service.js";

// --------------------------------------------------
// 1. Input types
// --------------------------------------------------

export interface LearningSkillInput {
  skillId: string;
  skillName: string;
  proficiencyLevel: number | null;
  priority: string;
  priorityScore: number | null;
  learningStatus: string;
  learningOrder: number | null;
  category: string;
}

export interface LearningDependencyInput {
  skillName: string;
  prerequisiteName: string;
  strength: "strong" | "moderate" | "optional";
  relationshipType: "prerequisite" | "recommended";
  isReady: boolean;
  prerequisiteProficiency: number | null;
  explanation: string;
}

export interface LearningRecommendationInput {
  roleName: string;
  educationLevel: string;
  professionalStatus: string;
  yearsOfExperience: number;
  skills: LearningSkillInput[];
  dependencies: LearningDependencyInput[];
}

// --------------------------------------------------
// 2. Resource schema
// --------------------------------------------------

const resourceSchema = z.object({
  title: z.string().min(1).max(200),
  provider: z.string().min(1).max(100),
  url: z.string().url(),
  resourceType: z.enum([
    "documentation",
    "tutorial",
    "video",
    "article",
    "course",
    "other",
  ]),
  description: z.string().max(500),
});

// --------------------------------------------------
// 3. Gemini output schema
// --------------------------------------------------

const learningRecommendationSchema = z.object({
  topics: z.array(
    z.object({
      skillId: z.string().min(1),
      topicTitle: z.string().min(1).max(200),
      reason: z.string().min(1).max(500),
      sequenceOrder: z.number().int().min(1),
      difficulty: z.enum([
        "beginner",
        "intermediate",
        "advanced",
      ]),
      learningObjectives: z.array(
        z.string().min(1)
      ).min(1),
      estimatedDuration: z.string().min(1).max(100),
      resources: z.array(resourceSchema),
    })
  ),

  skillSummaries: z.array(
    z.object({
      skillId: z.string().min(1),
      summary: z.string().min(1).max(500),
      suggestedResources: z.array(resourceSchema),
    })
  ),
});

// --------------------------------------------------
// 4. Explicit output types
// --------------------------------------------------

export type AILearningRecommendationResult = z.infer<
  typeof learningRecommendationSchema
>;

export type AILearningTopic =
  AILearningRecommendationResult["topics"][number];

export type AILearningSkillSummary =
  AILearningRecommendationResult["skillSummaries"][number];

// --------------------------------------------------
// 5. Retry configuration
// --------------------------------------------------

const MAX_RETRIES = 2;
const INITIAL_RETRY_DELAY = 1000;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const getErrorStatus = (error: unknown): number => {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error
  ) {
    return Number(error.status);
  }

  return 0;
};

const isRetryableError = (error: unknown): boolean => {
  const status = getErrorStatus(error);

  // Do not retry quota errors.
  if (status === 429) {
    return false;
  }

  return (
    status === 503 ||
    status >= 500
  );
};

// --------------------------------------------------
// 6. Create platform-specific course search resource
// --------------------------------------------------

const createCourseSearchResource = (
  topicTitle: string,
  platform: "Udemy" | "Coursera" = "Udemy"
): z.infer<typeof resourceSchema> => {
  const query = encodeURIComponent(topicTitle);

  const url =
    platform === "Coursera"
      ? `https://www.coursera.org/search?query=${query}`
      : `https://www.udemy.com/courses/search/?q=${query}`;

  return {
    title: `Search ${platform} courses for ${topicTitle}`,
    provider: platform,
    url,
    resourceType: "course",
    description:
      `This link opens ${platform} search results for ${topicTitle}. It is a course search link, not a verified individual course.`,
  };
};

// --------------------------------------------------
// 7. Select platform for course search fallback
// --------------------------------------------------

const selectCoursePlatform = (
  resources: z.infer<typeof resourceSchema>[]
): "Udemy" | "Coursera" => {
  const courseResource = resources.find(
    (resource) =>
      resource.resourceType === "course"
  );

  if (
    courseResource?.provider
      .toLowerCase()
      .includes("coursera")
  ) {
    return "Coursera";
  }

  return "Udemy";
};

// --------------------------------------------------
// 8. Replace unverified individual course suggestions
// --------------------------------------------------

const prepareCourseSearchResources = (
  result: AILearningRecommendationResult
): AILearningRecommendationResult => {

  // Detailed learning topics
  for (const topic of result.topics) {
    const platform = selectCoursePlatform(
      topic.resources
    );

    // Remove AI-generated individual course claims.
    topic.resources = topic.resources.filter(
      (resource) =>
        resource.resourceType !== "course"
    );

    // Add a platform-specific search link.
    topic.resources.push(
      createCourseSearchResource(
        topic.topicTitle,
        platform
      )
    );
  }

  // Advanced resources for relative-strength skills
  for (const summary of result.skillSummaries) {
    const courseResources =
      summary.suggestedResources.filter(
        (resource) =>
          resource.resourceType === "course"
      );

    if (courseResources.length > 0) {
      const platform = selectCoursePlatform(
        summary.suggestedResources
      );

      summary.suggestedResources =
        summary.suggestedResources.filter(
          (resource) =>
            resource.resourceType !== "course"
        );

      summary.suggestedResources.push(
        createCourseSearchResource(
          `Advanced ${summary.skillId}`,
          platform
        )
      );
    }
  }

  return result;
};

// --------------------------------------------------
// 9. Generate personalized recommendations
// --------------------------------------------------

export const generateAILearningRecommendations = async (
  input: LearningRecommendationInput
): Promise<AILearningRecommendationResult> => {

  // --------------------------------------------------
  // A. Separate skills by proficiency
  // --------------------------------------------------

  const detailedSkills = input.skills.filter(
    (skill) =>
      skill.proficiencyLevel !== null &&
      skill.proficiencyLevel >= 0 &&
      skill.proficiencyLevel <= 3
  );

  const strongSkills = input.skills.filter(
    (skill) =>
      skill.proficiencyLevel !== null &&
      skill.proficiencyLevel >= 4
  );

  if (
    detailedSkills.length === 0 &&
    strongSkills.length === 0
  ) {
    return {
      topics: [],
      skillSummaries: [],
    } satisfies AILearningRecommendationResult;
  }

  // --------------------------------------------------
  // B. Generate Gemini response
  // --------------------------------------------------

  let response;

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt++
  ) {
    try {
      response = await genAI.models.generateContent({
        model:
          process.env.GEMINI_MODEL ||
          "gemini-3.5-flash-lite",

        contents: `
You are an expert software engineering learning-path designer
and educational resource recommendation specialist.

Generate personalized, practical and relevant learning
recommendations for a software development learner.

==================================================
LEARNER PROFILE
==================================================

${JSON.stringify({
  role: input.roleName,
  educationLevel: input.educationLevel,
  professionalStatus: input.professionalStatus,
  yearsOfExperience: input.yearsOfExperience,
})}

==================================================
SKILLS REQUIRING DETAILED LEARNING
==================================================

${JSON.stringify(detailedSkills)}

==================================================
SKILLS THAT ARE RELATIVE STRENGTHS
==================================================

${JSON.stringify(strongSkills)}

==================================================
SKILL DEPENDENCY INFORMATION
==================================================

${JSON.stringify(input.dependencies)}

==================================================
INSTRUCTIONS FOR DETAILED LEARNING
==================================================

1. Generate topics only for skill IDs provided in the
   detailed learning list.

2. Never invent skills or modify the supplied skill IDs.

3. Proficiency-based learning approach:

   - Proficiency 0–1:
     Recommend foundational concepts and beginner-level topics.

   - Proficiency 2:
     Recommend basic-to-intermediate concepts and practical exercises.

   - Proficiency 3:
     Recommend intermediate-level topics that extend existing
     knowledge without assuming expert-level competence.

4. Give higher attention to critical and high-priority gaps.

5. Follow the backend-provided learning order.

6. Respect strong prerequisite relationships.

7. Do not recommend learning a dependent skill before an unresolved
   strong prerequisite.

8. Moderate dependencies guide learning sequence but do not block
   learning.

9. Provide practical and measurable learning objectives.

10. Explain why each topic is recommended based on the learner's
    proficiency, target role and skill gap.

11. Adapt difficulty to the learner's experience and proficiency.

12. Avoid duplicate topics.

13. Estimated duration must be realistic for the topic.

==================================================
LEARNING RESOURCE RECOMMENDATION RULES
==================================================

For EVERY detailed learning topic, recommend complementary
external learning resources.

A. ONLINE COURSE SEARCH OPTIONS

1. Every detailed learning topic MUST include at least
   one resource with resourceType "course".

2. Consider both Udemy and Coursera.

3. Select the more suitable platform based on:

   - Topic relevance.
   - Learner proficiency.
   - Course difficulty.
   - Practical projects and exercises.
   - Learning objectives.
   - Affordability when comparable.

4. Prefer one platform per topic.

5. Do not invent individual course titles, course IDs,
   prices, ratings or URLs.

6. Do not claim an individual course is verified.

7. The backend will replace course suggestions with
   clearly labelled platform search links.

8. Use the provider field to indicate your preferred
   platform: Udemy or Coursera.

B. OFFICIAL DOCUMENTATION

1. Recommend official documentation whenever available.

2. Prefer resources maintained by the technology's official
   organization or development team.

3. Select documentation relevant to the recommended topic.

Examples:

- React: https://react.dev/
- Next.js: https://nextjs.org/docs
- TypeScript: https://www.typescriptlang.org/docs/
- JavaScript: https://developer.mozilla.org/en-US/docs/Web/JavaScript
- Git: https://git-scm.com/doc

C. PRACTICAL LEARNING RESOURCES

1. Recommend at least one practical learning resource
   whenever a suitable resource can be identified.

2. Prefer specific tutorials, projects and interactive exercises.

3. Consider platforms such as:

   - freeCodeCamp
   - Official interactive tutorials
   - Reputable technical learning websites
   - Relevant hands-on project tutorials

4. Do not use a generic website homepage as a specific tutorial.

5. Set the correct resourceType.

D. RESOURCE QUALITY

Aim for three complementary resources per detailed topic:

- One Udemy OR Coursera course search option.
- One official documentation resource.
- One practical tutorial or project.

Avoid duplicate URLs and irrelevant recommendations.

For every resource provide:

- Title
- Provider
- Complete URL
- Resource type
- Short description

==================================================
INSTRUCTIONS FOR SKILL SUMMARIES
==================================================

1. Generate summaries only for skills in the relative-strength list.

2. Do not generate detailed learning paths for these skills.

3. Explain why each skill represents a relative strength.

4. Recommend optional advanced resources for further exploration.

5. Consider official documentation, practical tutorials
   and suitable Udemy or Coursera learning options.

6. Do not imply that advanced proficiency means the learner
   has nothing left to learn.

==================================================
GENERAL RULES
==================================================

1. Use only the provided skill IDs.

2. Do not generate summaries for skills requiring detailed learning.

3. Do not generate learning topics for unassessed skills.

4. Return empty arrays when a category has no applicable skills.

5. Resource URLs must be complete valid URLs.

6. Never fabricate course URLs or resource details.

7. Prioritize relevance and educational value over the number
   of resources.

8. Return valid structured JSON matching the supplied schema.
`,

        config: {
          // No Google Search grounding.
          // This keeps the request on the normal Gemini API path.

          responseMimeType: "application/json",

          responseJsonSchema: {
            type: "object",
            properties: {
              topics: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    skillId: { type: "string" },
                    topicTitle: { type: "string" },
                    reason: { type: "string" },
                    sequenceOrder: {
                      type: "integer",
                    },
                    difficulty: {
                      type: "string",
                      enum: [
                        "beginner",
                        "intermediate",
                        "advanced",
                      ],
                    },
                    learningObjectives: {
                      type: "array",
                      items: { type: "string" },
                    },
                    estimatedDuration: {
                      type: "string",
                    },
                    resources: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          provider: { type: "string" },
                          url: { type: "string" },
                          resourceType: {
                            type: "string",
                            enum: [
                              "documentation",
                              "tutorial",
                              "video",
                              "article",
                              "course",
                              "other",
                            ],
                          },
                          description: {
                            type: "string",
                          },
                        },
                        required: [
                          "title",
                          "provider",
                          "url",
                          "resourceType",
                          "description",
                        ],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: [
                    "skillId",
                    "topicTitle",
                    "reason",
                    "sequenceOrder",
                    "difficulty",
                    "learningObjectives",
                    "estimatedDuration",
                    "resources",
                  ],
                  additionalProperties: false,
                },
              },

              skillSummaries: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    skillId: { type: "string" },
                    summary: { type: "string" },
                    suggestedResources: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          provider: { type: "string" },
                          url: { type: "string" },
                          resourceType: {
                            type: "string",
                            enum: [
                              "documentation",
                              "tutorial",
                              "video",
                              "article",
                              "course",
                              "other",
                            ],
                          },
                          description: {
                            type: "string",
                          },
                        },
                        required: [
                          "title",
                          "provider",
                          "url",
                          "resourceType",
                          "description",
                        ],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: [
                    "skillId",
                    "summary",
                    "suggestedResources",
                  ],
                  additionalProperties: false,
                },
              },
            },

            required: [
              "topics",
              "skillSummaries",
            ],

            additionalProperties: false,
          },
        },
      });

      break;

    } catch (error) {
      const status = getErrorStatus(error);
      const shouldRetry = isRetryableError(error);

      if (!shouldRetry || attempt === MAX_RETRIES) {
        console.error(
          `Gemini learning recommendation generation failed after ${attempt} attempt(s).`,
          error
        );

        if (status === 429) {
          throw new Error(
            "Gemini API quota or billing limit exceeded. Please check Google AI Studio."
          );
        }

        throw new Error(
          shouldRetry
            ? "Gemini is temporarily unavailable. Please try again later."
            : "Failed to generate learning recommendations."
        );
      }

      const retryDelay =
        INITIAL_RETRY_DELAY *
        Math.pow(2, attempt - 1);

      console.warn(
        `Gemini request failed. Retrying in ${retryDelay}ms.`
      );

      await delay(retryDelay);
    }
  }

  // --------------------------------------------------
  // 10. Validate Gemini response
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
    learningRecommendationSchema.safeParse(
      parsedResponse
    );

  if (!validatedResponse.success) {
    console.error(
      "Learning recommendation validation failed:",
      validatedResponse.error.flatten()
    );

    throw new Error(
      "Gemini response failed learning recommendation validation."
    );
  }

  // --------------------------------------------------
  // 11. Prepare course search resources
  // --------------------------------------------------

  const result = validatedResponse.data;

  const preparedResult =
    prepareCourseSearchResources(result);

  // --------------------------------------------------
  // 12. Return recommendations
  // --------------------------------------------------

  return preparedResult;
};
