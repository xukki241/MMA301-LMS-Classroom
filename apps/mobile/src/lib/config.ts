function getBaseUrl(envUrl: string | undefined, defaultPort: number): string {
  // Khi chạy trên nền Web (trình duyệt máy tính), tự động trỏ về hostname hiện tại (localhost)
  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    return `http://${window.location.hostname}:${defaultPort}`;
  }
  return envUrl ?? `http://10.0.2.2:${defaultPort}`;
}

export const AUTH_URL = getBaseUrl(process.env.EXPO_PUBLIC_AUTH_URL, 4001);
export const CORE_URL = getBaseUrl(process.env.EXPO_PUBLIC_CORE_URL, 4002);
