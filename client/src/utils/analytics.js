import ApiConfig from '../components/apiConfig';

let sessionStart = Date.now();
let pageViews = 0;
let lastActiveTime = Date.now();
let activeTime = 0;
let apiTimes = [];

// Track user activity
document.addEventListener('mousemove', updateActivity);
document.addEventListener('keypress', updateActivity);
document.addEventListener('scroll', updateActivity);
document.addEventListener('click', updateActivity);

function updateActivity() {
  const now = Date.now();
  if (now - lastActiveTime < 30000) { // If less than 30s since last activity
    activeTime += now - lastActiveTime;
  }
  lastActiveTime = now;
}

// Collect performance metrics
const collectPerformanceMetrics = () => {
  const performance = window.performance;
  if (!performance) return null;

  const navigationTiming = performance.getEntriesByType('navigation')[0];
  const load_time = navigationTiming ? navigationTiming.loadEventEnd - navigationTiming.navigationStart : null;

  const memoryInfo = performance.memory ? {
    usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / (1024 * 1024)),
    totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / (1024 * 1024))
  } : null;

  return {
    load_time,
    time_to_interactive: performance.timing?.domInteractive - performance.timing?.navigationStart,
    api_response_time: apiTimes.length ? Math.round(apiTimes.reduce((a, b) => a + b) / apiTimes.length) : null,
    memory_usage: memoryInfo?.usedJSHeapSize
  };
};

// Track API call times
const apiInterceptor = (config) => {
  config.metadata = { startTime: Date.now() };
  return config;
};

const apiResponseInterceptor = (response) => {
  const endTime = Date.now();
  const startTime = response.config.metadata.startTime;
  apiTimes.push(endTime - startTime);
  // Keep only last 50 API calls
  if (apiTimes.length > 50) apiTimes.shift();
  return response;
};

// Add interceptors to track API times
ApiConfig.api.interceptors.request.use(apiInterceptor);
ApiConfig.api.interceptors.response.use(apiResponseInterceptor);

// Track feature usage
const trackFeatureUsage = async (featureName) => {
  try {
    const metrics = {
      feature_used: featureName,
      interaction_count: 1,
      session_duration: Math.round((Date.now() - sessionStart) / 1000),
      pages_per_session: pageViews,
      active_time: Math.round(activeTime / 1000),
      ...collectPerformanceMetrics()
    };

    await ApiConfig.api.post('/api/analytics', metrics);
  } catch (error) {
    console.error('Failed to track feature usage:', error);
  }
};

// Track page views
const trackPageView = () => {
  pageViews++;
};

// Send analytics on page unload
window.addEventListener('beforeunload', async () => {
  const sessionDuration = Math.round((Date.now() - sessionStart) / 1000);
  const metrics = {
    session_duration: sessionDuration,
    pages_per_session: pageViews,
    active_time: Math.round(activeTime / 1000),
    bounce_rate: pageViews === 1 ? 100 : 0,
    ...collectPerformanceMetrics()
  };

  // Use sendBeacon for more reliable data sending on page unload
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(metrics)], { type: 'application/json' });
    navigator.sendBeacon('/api/analytics', blob);
  } else {
    try {
      await ApiConfig.api.post('/api/analytics', metrics);
    } catch (error) {
      console.error('Failed to send final analytics:', error);
    }
  }
});

export const sendAnalytics = async (eventName, data = {}) => {
  try {
    // Format device info to match database schema
    const [width, height] = [window.innerWidth, window.innerHeight];
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Add timestamp and basic device info to all analytics
    const analyticsData = {
      feature_used: eventName,
      ...data,
      // Device info fields matching database schema
      user_agent: navigator.userAgent,
      screen_width: width,
      screen_height: height,
      platform: navigator.platform,
      language: navigator.language,
      is_pwa: window.matchMedia('(display-mode: standalone)').matches,
      is_mobile: isMobile,
      // Browser detection (simplified)
      browser: navigator.userAgent.includes('Firefox') ? 'Firefox' : 
               navigator.userAgent.includes('Chrome') ? 'Chrome' : 
               navigator.userAgent.includes('Safari') ? 'Safari' : 'Other',
      device_type: isMobile ? 'mobile' : 'desktop',
      // Performance metrics
      ...collectPerformanceMetrics(),
      // Session metrics
      session_duration: Math.round((Date.now() - sessionStart) / 1000),
      pages_per_session: pageViews,
      active_time: Math.round(activeTime / 1000),
      interaction_count: 1,
      bounce_rate: pageViews === 1 ? 100 : 0
    };

    await ApiConfig.api.post('/api/analytics', analyticsData);
  } catch (error) {
    console.error('Error sending analytics:', error);
  }
};

export {
  trackFeatureUsage,
  trackPageView,
  collectPerformanceMetrics
};