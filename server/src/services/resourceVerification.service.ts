
import { isIP } from "node:net";

import {
  ResourceVerificationStatus,
} from "../models/LearningRecommendation.model.js";

// --------------------------------------------------
// Configuration
// --------------------------------------------------

const REQUEST_TIMEOUT_MS = 8000;

// --------------------------------------------------
// Check whether an IP address is private or local
// --------------------------------------------------

const isPrivateIPv4 = (ip: string): boolean => {
  const parts = ip.split(".").map(Number);

  if (parts.length !== 4 || parts.some(
    (part) => part < 0 || part > 255
  )) {
    return true;
  }

  const [a, b] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
};

const isPrivateIPv6 = (ip: string): boolean => {
  const normalized = ip.toLowerCase();

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
};

// --------------------------------------------------
// Validate external URL
// --------------------------------------------------

const isAllowedPublicUrl = (value: string): boolean => {
  try {
    const url = new URL(value);

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ) {
      return false;
    }

    if (
      !url.hostname ||
      url.username ||
      url.password
    ) {
      return false;
    }

    const hostname = url.hostname.toLowerCase();

    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname === "metadata.google.internal"
    ) {
      return false;
    }

    const ipVersion = isIP(hostname);

    if (ipVersion === 4 && isPrivateIPv4(hostname)) {
      return false;
    }

    if (ipVersion === 6 && isPrivateIPv6(hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

// --------------------------------------------------
// Perform HTTP request
// --------------------------------------------------

const checkUrl = async (
  url: string,
  method: "HEAD" | "GET"
): Promise<Response> => {
  return fetch(url, {
    method,
    redirect: "follow",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      "User-Agent": "SkillGapAnalyzer/1.0",
      ...(method === "GET" ? { Range: "bytes=0-0" } : {}),
    },
  });
};

// --------------------------------------------------
// Verify one learning resource URL
// --------------------------------------------------

export const verifyLearningResourceUrl = async (
  value: string
): Promise<ResourceVerificationStatus> => {
  if (!isAllowedPublicUrl(value)) {
    return ResourceVerificationStatus.INVALID;
  }

  try {
    let response = await checkUrl(value, "HEAD");

    // Some websites do not support HEAD requests.
    if (
      response.status === 405 ||
      response.status === 501
    ) {
      await response.body?.cancel().catch(() => undefined);

      response = await checkUrl(value, "GET");
    }

    // Check the final redirected URL too.
    if (!isAllowedPublicUrl(response.url)) {
      await response.body?.cancel().catch(() => undefined);

      return ResourceVerificationStatus.INVALID;
    }

    const status = response.status;

    await response.body?.cancel().catch(() => undefined);

    if (status >= 200 && status < 400) {
      return ResourceVerificationStatus.VERIFIED;
    }

    if (status === 404 || status === 410) {
      return ResourceVerificationStatus.INVALID;
    }

    // Access restrictions, rate limits and server errors
    // are inconclusive rather than proof of a broken link.
    return ResourceVerificationStatus.UNVERIFIED;

  } catch (error) {
    // Timeouts, network failures and blocked requests
    // should not automatically make a resource invalid.
    console.warn(
      `Resource URL verification could not be completed: ${value}`,
      error instanceof Error ? error.message : error
    );

    return ResourceVerificationStatus.UNVERIFIED;
  }
};
