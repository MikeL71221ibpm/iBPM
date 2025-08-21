// Performance optimization: Cache Manager for expensive queries
// Reduces database load and improves response times

import { LRUCache } from 'lru-cache';

// Configure cache with memory-efficient settings
const CACHE_OPTIONS = {
  max: 100, // Maximum number of items
  ttl: 1000 * 60 * 5, // 5 minute TTL
  allowStale: false,
  updateAgeOnGet: true,
  updateAgeOnHas: true,
};

class CacheManager {
  private visualizationCache: LRUCache<string, any>;
  private userDataCache: LRUCache<string, any>;
  private chartDataCache: LRUCache<string, any>;

  constructor() {
    this.visualizationCache = new LRUCache(CACHE_OPTIONS);
    this.userDataCache = new LRUCache({ ...CACHE_OPTIONS, max: 50 });
    this.chartDataCache = new LRUCache({ ...CACHE_OPTIONS, max: 200 });
  }

  // Visualization data caching
  getVisualizationData(userId: number): any | null {
    return this.visualizationCache.get(`viz-${userId}`);
  }

  setVisualizationData(userId: number, data: any): void {
    this.visualizationCache.set(`viz-${userId}`, data);
  }

  // User data caching
  getUserData(userId: number): any | null {
    return this.userDataCache.get(`user-${userId}`);
  }

  setUserData(userId: number, data: any): void {
    this.userDataCache.set(`user-${userId}`, data);
  }

  // Chart data caching
  getChartData(key: string): any | null {
    return this.chartDataCache.get(key);
  }

  setChartData(key: string, data: any): void {
    this.chartDataCache.set(key, data);
  }

  // Cache invalidation
  invalidateUser(userId: number): void {
    this.visualizationCache.delete(`viz-${userId}`);
    this.userDataCache.delete(`user-${userId}`);
    
    // Clear related chart data
    for (const key of this.chartDataCache.keys()) {
      if (key.includes(`-${userId}-`)) {
        this.chartDataCache.delete(key);
      }
    }
  }

  // Memory monitoring
  getStats() {
    return {
      visualization: {
        size: this.visualizationCache.size,
        max: this.visualizationCache.max
      },
      userData: {
        size: this.userDataCache.size,
        max: this.userDataCache.max
      },
      chartData: {
        size: this.chartDataCache.size,
        max: this.chartDataCache.max
      }
    };
  }
}

export const cacheManager = new CacheManager();