export const environment = {
  production: false,
  apiUrl: (window as any).__env?.API_URL ?? 'http://localhost:8080',
  appName: (window as any).__env?.APP_NAME ?? 'NutriZulia',
  version: (window as any).__env?.VERSION ?? '1.0.0',
};
