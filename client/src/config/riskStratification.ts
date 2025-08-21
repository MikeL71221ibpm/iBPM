/**
 * Risk Stratification Configuration
 * 
 * This file defines the thresholds and rules for categorizing patients into risk levels.
 * These settings can be overridden by customer-specific configurations.
 */

export interface RiskThreshold {
  name: string;
  minValue: number;
  maxValue: number | null;
  color: string;
  description: string;
}

// Default application-level risk stratification thresholds
export const defaultRiskThresholds: RiskThreshold[] = [
  {
    name: "High risk",
    minValue: 100,
    maxValue: null,  // null for no upper limit
    color: "#e53935", // Red
    description: "Patients with 100+ symptoms or HRSN indicators"
  },
  {
    name: "Medium risk",
    minValue: 50,
    maxValue: 99,
    color: "#fb8c00", // Orange
    description: "Patients with 50-99 symptoms or HRSN indicators"
  },
  {
    name: "Low risk",
    minValue: 1,
    maxValue: 49,
    color: "#43a047", // Green
    description: "Patients with 1-49 symptoms or HRSN indicators"
  },
  {
    name: "No documented risk",
    minValue: 0,
    maxValue: 0,
    color: "#757575", // Gray
    description: "Patients with no documented symptoms or HRSN indicators"
  }
];

// Function to classify a value into a risk category
export function classifyRiskLevel(
  value: number, 
  thresholds: RiskThreshold[] = defaultRiskThresholds
): RiskThreshold {
  // Find the appropriate threshold
  const threshold = thresholds.find(t => 
    value >= t.minValue && 
    (t.maxValue === null || value <= t.maxValue)
  );
  
  // Return the matching threshold or the lowest one if no match
  return threshold || thresholds[thresholds.length - 1];
}

// Allow customer-specific overrides
interface CustomerRiskConfig {
  organizationId: string;
  name: string;
  thresholds: RiskThreshold[];
}

// Example of customer-specific configurations that could be loaded from a database
export const customerConfigurations: CustomerRiskConfig[] = [
  {
    organizationId: "org_123",
    name: "Memorial Health System",
    thresholds: [
      {
        name: "Severe risk", 
        minValue: 120, 
        maxValue: null, 
        color: "#b71c1c", 
        description: "Highest priority patients (120+ indicators)"
      },
      {
        name: "High risk", 
        minValue: 80, 
        maxValue: 119, 
        color: "#e53935", 
        description: "High priority intervention (80-119 indicators)"
      },
      {
        name: "Moderate risk", 
        minValue: 40, 
        maxValue: 79, 
        color: "#fb8c00", 
        description: "Needs monitoring (40-79 indicators)"
      },
      {
        name: "Low risk", 
        minValue: 1, 
        maxValue: 39, 
        color: "#43a047", 
        description: "Routine care (1-39 indicators)"
      },
      {
        name: "No documented risk", 
        minValue: 0, 
        maxValue: 0, 
        color: "#757575", 
        description: "No documented indicators"
      }
    ]
  }
];

// Function to get organization-specific risk thresholds
export function getOrganizationRiskThresholds(
  organizationId?: string
): RiskThreshold[] {
  if (!organizationId) return defaultRiskThresholds;
  
  const orgConfig = customerConfigurations.find(
    config => config.organizationId === organizationId
  );
  
  return orgConfig ? orgConfig.thresholds : defaultRiskThresholds;
}