export interface ApiEnvironment {
  DEV: boolean;
  VITE_API_URL?: string;
}

export function resolveApiBaseUrl(environment: ApiEnvironment): string {
  return environment.VITE_API_URL ?? (environment.DEV ? "/api/v1" : "");
}
