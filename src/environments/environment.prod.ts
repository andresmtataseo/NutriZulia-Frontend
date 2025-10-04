export const environment = {
  production: true,
  apiUrl: (window as any).__env?.API_URL ?? 'https://nutrizulia-backend.onrender.com',
  appName: (window as any).__env?.APP_NAME ?? 'NutriZulia',
  version: (window as any).__env?.VERSION ?? '1.0.0',
};
