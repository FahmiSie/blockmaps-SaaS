export type Node = {
  id: string;
  x: number;
  y: number;
};

export type Graph = Record<string, { target: string; weight: number }[]>;

export type RouteResult = {
  path: string[];
  totalDistance: number;
  walkingTimeSeconds: number;
  forkliftTimeSeconds: number;
};

// 1 grid cell (32px) = 2 meters -> 1px = 2/32 = 1/16 meters
const PIXELS_TO_METERS = 1 / 16;
const WALKING_SPEED = 1.4; // m/s
const FORKLIFT_SPEED = 4.0; // m/s

/**
 * Builds a graph from a list of zones.
 * Connects each zone to its nearest `k` neighbors based on Euclidean distance.
 */
export function buildGraph(nodes: Node[], k = 3): Graph {
  const graph: Graph = {};

  nodes.forEach((node) => {
    graph[node.id] = [];
    
    // Calculate distances to all other nodes
    const distances = nodes
      .filter((n) => n.id !== node.id)
      .map((n) => {
        const dist = Math.sqrt(Math.pow(n.x - node.x, 2) + Math.pow(n.y - node.y, 2));
        return { target: n.id, dist };
      })
      .sort((a, b) => a.dist - b.dist);

    // Connect to nearest k neighbors (undirected)
    const nearest = distances.slice(0, k);
    nearest.forEach(({ target, dist }) => {
      // Add edge from node -> target
      if (!graph[node.id]?.some(e => e.target === target)) {
        graph[node.id]?.push({ target, weight: dist });
      }
      
      // Add edge from target -> node (make it undirected)
      if (!graph[target]) graph[target] = [];
      if (!graph[target].some(e => e.target === node.id)) {
        graph[target].push({ target: node.id, weight: dist });
      }
    });
  });

  return graph;
}

/**
 * Dijkstra's shortest path algorithm.
 */
export function findShortestPath(graph: Graph, startId: string, endId: string): RouteResult | null {
  if (!graph[startId] || !graph[endId]) return null;

  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const unvisited = new Set(Object.keys(graph));

  // Initialize
  Object.keys(graph).forEach((node) => {
    distances[node] = Infinity;
    previous[node] = null;
  });
  distances[startId] = 0;

  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance
    let current: string | null = null;
    let minDistance = Infinity;

    for (const node of unvisited) {
      if ((distances[node] ?? 0) < minDistance) {
        minDistance = distances[node] ?? 0;
        current = node;
      }
    }

    if (current === null || current === endId) {
      break; // Found destination or remaining nodes are unreachable
    }

    unvisited.delete(current);

    // Update distances to neighbors
    const neighbors = graph[current] || [];
    for (const neighbor of neighbors) {
      if (!unvisited.has(neighbor.target)) continue;

      const alt = (distances[current]?? 0) + neighbor.weight;
      if (alt < (distances[neighbor.target] ?? 0)) {
        distances[neighbor.target] = alt;
        previous[neighbor.target] = current;
      }
    }
  }

  // Backtrack to build path
  if (distances[endId] === Infinity) return null; // No path found

  const path: string[] = [];
  let curr: string | null = endId;
  while (curr !== null) {
    path.unshift(curr);
    curr = previous[curr] ?? null;
  }

  const totalDistancePixels = distances[endId] ?? 0;
  const totalDistanceMeters = totalDistancePixels * PIXELS_TO_METERS;

  return {
    path,
    totalDistance: totalDistanceMeters,
    walkingTimeSeconds: totalDistanceMeters / WALKING_SPEED,
    forkliftTimeSeconds: totalDistanceMeters / FORKLIFT_SPEED,
  };
}
