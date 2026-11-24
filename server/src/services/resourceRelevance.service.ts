
import {
  ResourceRelevanceStatus,
  LearningResourceType,
} from "../models/LearningRecommendation.model.js";

// --------------------------------------------------
// 1. Normalize words for comparison
// --------------------------------------------------

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "into",
  "your", "complete", "guide", "introduction",
  "introductionto", "fundamentals", "documentation",
  "tutorial", "course", "learn", "learning",
  "official", "advanced", "beginner", "basics",
  "basic", "essential", "using", "about", "a",
  "an", "to", "of", "in", "on",
]);

const normalizeWords = (value: string): string[] => {
  return value
    .toLowerCase()
    .replace(/https?:\/\//g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 1 && !STOP_WORDS.has(word)
    );
};

// --------------------------------------------------
// 2. Identify trusted official documentation domains
// --------------------------------------------------

const OFFICIAL_DOCUMENTATION_DOMAINS: Record<
  string,
  string[]
> = {
  "nextjs.org": ["nextjs", "next"],
  "react.dev": ["react"],
  "typescriptlang.org": ["typescript"],
  "developer.mozilla.org": [
    "javascript",
    "html",
    "css",
    "mdn",
    "web",
  ],
  "nodejs.org": ["node", "nodejs"],
  "expressjs.com": ["express", "expressjs"],
  "git-scm.com": ["git"],
  "mongodb.com": ["mongodb"],
  "docs.python.org": ["python"],
  "docs.docker.com": ["docker"],
  "kubernetes.io": ["kubernetes"],
  "docs.github.com": ["github", "git"],
  "docs.npmjs.com": ["npm", "node", "nodejs"],
  "vite.dev": ["vite"],
  "tailwindcss.com": ["tailwind", "css"],
  "angular.dev": ["angular"],
  "vuejs.org": ["vue"],
  "testing-library.com": [
    "testing",
    "react",
    "jest",
  ],
  "jestjs.io": ["jest", "testing"],
};

const getOfficialDocumentationMatch = (
  url: URL,
  expectedWords: string[]
): boolean => {
  const hostname = url.hostname.toLowerCase();

  for (const [domain, relatedSkills] of Object.entries(
    OFFICIAL_DOCUMENTATION_DOMAINS
  )) {
    const matchesDomain =
      hostname === domain ||
      hostname.endsWith(`.${domain}`);

    if (!matchesDomain) {
      continue;
    }

    const matchesSkill = relatedSkills.some(
      (skill) => expectedWords.includes(skill)
    );

    if (matchesSkill) {
      return true;
    }
  }

  return false;
};

// --------------------------------------------------
// 3. Identify generic homepage URLs
// --------------------------------------------------

const isHomepageUrl = (url: URL): boolean => {
  return [
    "/",
    "",
    "/home",
    "/homepage",
  ].includes(url.pathname.toLowerCase());
};

// --------------------------------------------------
// 4. Check known course platform URL patterns
// --------------------------------------------------

const hasSpecificCoursePath = (
  url: URL
): boolean | null => {
  const hostname = url.hostname.toLowerCase();
  const pathname = url.pathname.toLowerCase();

  if (
    hostname === "udemy.com" ||
    hostname.endsWith(".udemy.com")
  ) {
    return /^\/course\/[^/]+\/?$/.test(pathname);
  }

  if (
    hostname === "coursera.org" ||
    hostname.endsWith(".coursera.org")
  ) {
    return (
      /^\/learn\/[^/]+\/?$/.test(pathname) ||
      /^\/specializations\/[^/]+\/?$/.test(pathname) ||
      /^\/professional-certificates\/[^/]+\/?$/.test(pathname)
    );
  }

  if (
    hostname === "edx.org" ||
    hostname.endsWith(".edx.org")
  ) {
    return /^\/learn\/[^/]+\/?$/.test(pathname);
  }

  return null;
};

// --------------------------------------------------
// 5. Validate learning resource relevance
// --------------------------------------------------

export const validateLearningResourceRelevance = (
  resource: {
    title: string;
    provider: string;
    url: string;
    resourceType: LearningResourceType;
  },
  learningContext: string
): ResourceRelevanceStatus => {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(resource.url);
  } catch {
    return ResourceRelevanceStatus.NOT_RELEVANT;
  }

  // Only HTTP and HTTPS URLs are allowed.
  if (
    parsedUrl.protocol !== "https:" &&
    parsedUrl.protocol !== "http:"
  ) {
    return ResourceRelevanceStatus.NOT_RELEVANT;
  }

  const expectedWords = normalizeWords(
    `${resource.title} ${learningContext}`
  );

  const meaningfulWords = expectedWords.filter(
    (word) => word.length >= 3
  );

  if (meaningfulWords.length === 0) {
    return ResourceRelevanceStatus.NEEDS_REVIEW;
  }

  // ------------------------------------------------
  // A. Course resources
  // ------------------------------------------------

  if (
    resource.resourceType === LearningResourceType.COURSE
  ) {
    const coursePathResult =
      hasSpecificCoursePath(parsedUrl);

    // Search pages and unknown course paths need review.
    if (coursePathResult !== true) {
      return ResourceRelevanceStatus.NEEDS_REVIEW;
    }

    // A specific course URL still needs a matching topic.
    const pathWords = normalizeWords(
      parsedUrl.pathname
    );

    const matchesContext = meaningfulWords.some(
      (word) => pathWords.includes(word)
    );

    return matchesContext
      ? ResourceRelevanceStatus.RELEVANT
      : ResourceRelevanceStatus.NEEDS_REVIEW;
  }

  // ------------------------------------------------
  // B. Official documentation domain check
  // Run BEFORE the homepage check.
  // ------------------------------------------------

  if (
    resource.resourceType ===
      LearningResourceType.DOCUMENTATION &&
    getOfficialDocumentationMatch(
      parsedUrl,
      meaningfulWords
    )
  ) {
    return ResourceRelevanceStatus.RELEVANT;
  }

  // ------------------------------------------------
  // C. Generic homepage check
  // ------------------------------------------------

  if (isHomepageUrl(parsedUrl)) {
    return ResourceRelevanceStatus.NEEDS_REVIEW;
  }

  // ------------------------------------------------
  // D. General URL keyword matching
  // ------------------------------------------------

  const pathWords = new Set(
    normalizeWords(parsedUrl.pathname)
  );

  const matchingWords = meaningfulWords.filter(
    (word) => pathWords.has(word)
  );

  if (matchingWords.length > 0) {
    return ResourceRelevanceStatus.RELEVANT;
  }

  // ------------------------------------------------
  // E. Conservative fallback
  // ------------------------------------------------

  return ResourceRelevanceStatus.NEEDS_REVIEW;
};
