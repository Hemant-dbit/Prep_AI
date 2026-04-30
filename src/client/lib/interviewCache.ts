// Interview cache management utility

export const INTERVIEW_CACHE_KEY = "cached_interviews";
export const INTERVIEW_CACHE_TIMESTAMP_KEY = "cached_interviews_timestamp";
export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Invalidate the interview cache
 * This should be called when interview history changes (new interview completed, etc.)
 */
export const invalidateInterviewCache = (triggerRefresh = true) => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(INTERVIEW_CACHE_KEY);
    localStorage.removeItem(INTERVIEW_CACHE_TIMESTAMP_KEY);

    // Optionally trigger refresh of dashboard if it's currently loaded
    // When invalidation is initiated by the dashboard itself (e.g. user pressed
    // refresh), passing triggerRefresh=false prevents a recursive loop.
    if (triggerRefresh && (window as any).refreshInterviewHistory) {
      (window as any).refreshInterviewHistory();
    }
  }
};

/**
 * Check if cache is valid
 */
export const isCacheValid = (): boolean => {
  if (typeof window === "undefined") return false;

  const cachedTimestamp = localStorage.getItem(INTERVIEW_CACHE_TIMESTAMP_KEY);
  if (!cachedTimestamp) return false;

  const timeSinceLastFetch = Date.now() - parseInt(cachedTimestamp);
  return timeSinceLastFetch <= CACHE_DURATION;
};

/**
 * Get cached interviews if valid
 */
export const getCachedInterviews = () => {
  if (typeof window === "undefined" || !isCacheValid()) return null;

  const cachedData = localStorage.getItem(INTERVIEW_CACHE_KEY);
  return cachedData ? JSON.parse(cachedData) : null;
};

/**
 * Cache interviews with timestamp
 */
export const cacheInterviews = (interviews: any[]) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(INTERVIEW_CACHE_KEY, JSON.stringify(interviews));
    localStorage.setItem(INTERVIEW_CACHE_TIMESTAMP_KEY, Date.now().toString());
  }
};
