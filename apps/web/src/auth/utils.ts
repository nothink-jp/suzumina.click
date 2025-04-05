export class ConfigurationError extends Error {
  constructor(envVar: string) {
    super(
      `Configuration Error: ${envVar} is not defined in the production runtime environment. Please ensure it is set correctly.`,
    );
    this.name = "ConfigurationError";
  }
}

export const isBuildTime = () => {
  return process.env.NEXT_PHASE === "phase-production-build";
};

export const isProductionRuntime = () => {
  return process.env.NODE_ENV === "production" && !isBuildTime();
};

export const getRequiredEnvVar = (key: string): string => {
  const value = process.env[key];

  if (isBuildTime()) {
    return `dummy-${key}`;
  }

  if ((value === undefined || value === null) && isProductionRuntime()) {
    throw new ConfigurationError(key);
  }

  return value || "";
};
