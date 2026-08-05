/** Map raw API / job errors to short user-facing copy. */
export function humanizeError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Something went wrong";
  const lower = raw.toLowerCase();

  if (lower.includes("timed out") || lower.includes("timeout")) {
    return "Analysis is taking longer than expected. Check your connection, then retry — the job may still finish on the server.";
  }
  if (
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("429") ||
    lower.includes("resource_exhausted")
  ) {
    return "Gemini rate limit or quota hit. Wait a minute, then retry analysis.";
  }
  if (lower.includes("503") || lower.includes("google_api_key") || lower.includes("not configured")) {
    return "AI service is unavailable right now. Confirm GOOGLE_API_KEY is set, then retry.";
  }
  if (lower.includes("401") || lower.includes("unauthorized") || lower.includes("sign in")) {
    return "Sign in with Google to continue, then try again.";
  }
  if (lower.includes("403") || lower.includes("forbidden") || lower.includes("not yours")) {
    return "You don’t have access to this candidate profile.";
  }
  return raw;
}
