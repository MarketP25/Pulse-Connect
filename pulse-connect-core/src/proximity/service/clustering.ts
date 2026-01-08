export interface ClusterOptions {
  algorithm: 'kmeans' | 'geohash';
  k?: number; // Number of clusters for k-means
  precision?: number; // Geohash precision
}

export interface Cluster {
  id: string;
  center: { lat: number; lng: number };
  points: Array<{ lat: number; lng: number; id?: string }>;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export class ClusteringEngine {
  /**
   * Cluster locations using specified algorithm
   */
  cluster(locations: Array<{ lat: number; lng: number; id?: string }>, options: ClusterOptions): Cluster[] {
    switch (options.algorithm) {
      case 'kmeans':
        return this.kMeansClustering(locations, options.k || 3);
      case 'geohash':
        return this.geohashClustering(locations, options.precision || 5);
      default:
        throw new Error(`Unsupported clustering algorithm: ${options.algorithm}`);
    }
  }

  /**
   * K-means clustering implementation
   */
  private kMeansClustering(locations: Array<{ lat: number; lng: number; id?: string }>, k: number): Cluster[] {
    if (locations.length === 0) return [];
    if (locations.length <= k) {
      // Each point is its own cluster
      return locations.map((point, index) => ({
        id: `cluster_${index}`,
        center: { lat: point.lat, lng: point.lng },
        points: [point],
        bounds: {
          north: point.lat,
          south: point.lat,
          east: point.lng,
          west: point.lng
        }
      }));
    }

    // Initialize centroids randomly
    let centroids = this.initializeCentroids(locations, k);
    let clusters: Cluster[] = [];
    let maxIterations = 100;
    let iteration = 0;

    while (iteration < maxIterations) {
      // Assign points to nearest centroid
      const assignments = this.assignPointsToCentroids(locations, centroids);

      // Update centroids
      const newCentroids = this.updateCentroids(locations, assignments, k);

      // Check for convergence
      if (this.centroidsConverged(centroids, newCentroids)) {
        break;
      }

      centroids = newCentroids;
      iteration++;
    }

    // Create final clusters
    clusters = this.createClustersFromAssignments(locations, centroids, this.assignPointsToCentroids(locations, centroids));

    return clusters;
  }

  /**
   * Geohash-based clustering
   */
  private geohashClustering(locations: Array<{ lat: number; lng: number; id?: string }>, precision: number): Cluster[] {
    const geohashMap = new Map<string, Array<{ lat: number; lng: number; id?: string }>>();

    // Group points by geohash
    locations.forEach(point => {
      const geohash = this.encodeGeohash(point.lat, point.lng, precision);
      if (!geohashMap.has(geohash)) {
        geohashMap.set(geohash, []);
      }
      geohashMap.get(geohash)!.push(point);
    });

    // Create clusters from geohash groups
    const clusters: Cluster[] = [];
    let clusterId = 0;

    geohashMap.forEach((points, geohash) => {
      if (points.length > 0) {
        const center = this.calculateCentroid(points);
        const bounds = this.calculateBounds(points);

        clusters.push({
          id: `geohash_${geohash}`,
          center,
          points,
          bounds
        });
      }
    });

    return clusters;
  }

  private initializeCentroids(locations: Array<{ lat: number; lng: number }>, k: number): Array<{ lat: number; lng: number }> {
    const centroids: Array<{ lat: number; lng: number }> = [];
    const shuffled = [...locations].sort(() => Math.random() - 0.5);

    for (let i = 0; i < k; i++) {
      centroids.push({ ...shuffled[i] });
    }

    return centroids;
  }

  private assignPointsToCentroids(locations: Array<{ lat: number; lng: number }>, centroids: Array<{ lat: number; lng: number }>): number[] {
    return locations.map(point => {
      let minDistance = Infinity;
      let closestCentroid = 0;

      centroids.forEach((centroid, index) => {
        const distance = this.haversineDistance(point, centroid);
        if (distance < minDistance) {
          minDistance = distance;
          closestCentroid = index;
        }
      });

      return closestCentroid;
    });
  }

  private updateCentroids(locations: Array<{ lat: number; lng: number }>, assignments: number[], k: number): Array<{ lat: number; lng: number }> {
    const centroids: Array<{ lat: number; lng: number }> = [];

    for (let i = 0; i < k; i++) {
      const clusterPoints = locations.filter((_, index) => assignments[index] === i);

      if (clusterPoints.length > 0) {
        centroids.push(this.calculateCentroid(clusterPoints));
      } else {
        // Keep existing centroid if no points assigned
        centroids.push({ lat: 0, lng: 0 }); // This shouldn't happen in practice
      }
    }

    return centroids;
  }

  private centroidsConverged(oldCentroids: Array<{ lat: number; lng: number }>, newCentroids: Array<{ lat: number; lng: number }>): boolean {
    const threshold = 0.001; // 1 meter threshold

    for (let i = 0; i < oldCentroids.length; i++) {
      const distance = this.haversineDistance(oldCentroids[i], newCentroids[i]);
      if (distance > threshold) {
        return false;
      }
    }

    return true;
  }

  private createClustersFromAssignments(locations: Array<{ lat: number; lng: number; id?: string }>, centroids: Array<{ lat: number; lng: number }>, assignments: number[]): Cluster[] {
    const clusters: Cluster[] = [];

    centroids.forEach((centroid, index) => {
      const points = locations.filter((_, pointIndex) => assignments[pointIndex] === index);

      if (points.length > 0) {
        const bounds = this.calculateBounds(points);

        clusters.push({
          id: `cluster_${index}`,
          center: centroid,
          points,
          bounds
        });
      }
    });

    return clusters;
  }

  private calculateCentroid(points: Array<{ lat: number; lng: number }>): { lat: number; lng: number } {
    const sum = points.reduce(
      (acc, point) => ({
        lat: acc.lat + point.lat,
        lng: acc.lng + point.lng
      }),
      { lat: 0, lng: 0 }
    );

    return {
      lat: sum.lat / points.length,
      lng: sum.lng / points.length
    };
  }

  private calculateBounds(points: Array<{ lat: number; lng: number }>): { north: number; south: number; east: number; west: number } {
    let north = -90;
    let south = 90;
    let east = -180;
    let west = 180;

    points.forEach(point => {
      north = Math.max(north, point.lat);
      south = Math.min(south, point.lat);
      east = Math.max(east, point.lng);
      west = Math.min(west, point.lng);
    });

    return { north, south, east, west };
  }

  private haversineDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private encodeGeohash(lat: number, lng: number, precision: number): string {
    // Simplified geohash implementation
    // In production, use a proper geohash library
    const latBin = Math.floor((lat + 90) / 180 * Math.pow(2, precision));
    const lngBin = Math.floor((lng + 180) / 360 * Math.pow(2, precision));

    let hash = '';
    for (let i = precision - 1; i >= 0; i--) {
      const latBit = (latBin >> i) & 1;
      const lngBit = (lngBin >> i) & 1;
      const combined = (lngBit << 1) | latBit;
      hash += combined.toString(4); // Base-4 encoding
    }

    return hash;
  }
}
