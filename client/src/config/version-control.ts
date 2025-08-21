/**
 * Version Control Configuration
 * 
 * This file controls which version of components are active in the application.
 * To roll back to a previous version, change the configuration values below.
 */

type VersionKey = 'v3' | 'v3.1';
type ComponentType = 'populationHealth' | 'bar' | 'pie' | 'heatmap';

interface VersionConfig {
  releaseDate: string;
  description: string;
  componentFiles: {
    populationHealth: string;
    charts: {
      bar: string;
      pie: string;
      heatmap: string;
    }
  }
}

interface AppVersionConfig {
  currentVersion: VersionKey;
  components: {
    populationHealth: VersionKey;
    charts: {
      bar: VersionKey;
      pie: VersionKey;
      heatmap: VersionKey;
    }
  };
  versions: Record<VersionKey, VersionConfig>;
}

export const appVersionConfig: AppVersionConfig = {
  // Major application version
  currentVersion: 'v3.1',
  
  // Active component versions for different sections
  components: {
    // Population Health Dashboard version
    populationHealth: 'v3.1', // Using version with Print Chart label
    
    // Chart component versions
    charts: {
      bar: 'v3.1',    // Options: 'v3', 'v3.1'
      pie: 'v3.1',    // Options: 'v3', 'v3.1'
      heatmap: 'v3.1' // Options: 'v3', 'v3.1'
    }
  },
  
  // Version metadata for audit and tracking
  versions: {
    'v3': {
      releaseDate: '2025-05-13',
      description: 'Stable release with basic export functionality',
      componentFiles: {
        populationHealth: 'population-health-controlling-05_13_25.tsx',
        charts: {
          bar: 'hrsn-bar-chart-controlling-file-05_17_25.tsx',
          pie: 'hrsn-pie-chart-controlling-file-05_17_25.tsx',
          heatmap: 'boolean-hrsn-heatmap-controlling-file-05_17_25.tsx'
        }
      }
    },
    'v3.1': {
      releaseDate: '2025-05-20',
      description: 'Enhanced version with uniform export/print functionality',
      componentFiles: {
        populationHealth: 'population-health-charts-controlling-file-05_19_25.tsx', // Updated with Print Chart text
        charts: {
          bar: 'hrsn-bar-chart-v3-1-05_19_25.tsx',
          pie: 'hrsn-pie-chart-v3-1-05_20_25.tsx',
          heatmap: 'boolean-hrsn-heatmap-controlling-file-05_17_25.tsx'
        }
      }
    }
  }
};

/**
 * Helper function to get the active component for a specific feature
 * @param feature The feature to get the active component for
 * @returns The component name to use
 */
export function getActiveComponent(feature: ComponentType): string {
  if (feature === 'populationHealth') {
    const version = appVersionConfig.components.populationHealth;
    return appVersionConfig.versions[version].componentFiles.populationHealth;
  } else {
    const version = appVersionConfig.components.charts[feature];
    return appVersionConfig.versions[version].componentFiles.charts[feature];
  }
}

/**
 * Get the active Population Health component based on current version configuration
 */
export function getActivePopulationHealthComponent() {
  const activeVersion = appVersionConfig.components.populationHealth;
  return appVersionConfig.versions[activeVersion].componentFiles.populationHealth;
}

/**
 * To rollback to a previous version:
 * 1. Change the appVersionConfig.currentVersion value to the desired version (e.g., 'v3')
 * 2. Change the specific component versions in appVersionConfig.components as needed
 * 3. Restart the application
 */