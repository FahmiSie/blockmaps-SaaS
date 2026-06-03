export type Point = { x: number; y: number };
export type Rect = { id: string; x: number; y: number; w: number; h: number };

export type Node = {
  id: string;
  x: number;
  y: number;
};

export type Graph = Record<string, { target: string; weight: number }[]>;

export type RouteResult = {
  path: Node[];
  totalDistance: number;
  walkingTimeSeconds: number;
  forkliftTimeSeconds: number;
};

export type RouteSegment = {
  fromZoneId: string;
  toZoneId: string;
  path: Node[];
  distanceMeters: number;
  walkingTimeSeconds: number;
  forkliftTimeSeconds: number;
};

export type MultiRouteResult = {
  segments: RouteSegment[];
  fullPath: Node[];
  totalDistance: number;
  walkingTimeSeconds: number;
  forkliftTimeSeconds: number;
};

// 1 grid cell (32px) = 2 meters -> 1px = 2/32 = 1/16 meters
const PIXELS_TO_METERS = 1 / 16;
const WALKING_SPEED = 1.4; // m/s
const FORKLIFT_SPEED = 4.0; // m/s

function orientation(p: Point, q: Point, r: Point) {
  const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  if (val === 0) return 0;
  return val > 0 ? 1 : 2;
}

function onSegment(p: Point, q: Point, r: Point) {
  return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
         q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
}

function doIntersect(p1: Point, q1: Point, p2: Point, q2: Point) {
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;
  return false;
}

export function isPointInsideRect(p: Point, r: Rect, padding = 0): boolean {
  return (
    p.x > r.x - padding &&
    p.x < r.x + r.w + padding &&
    p.y > r.y - padding &&
    p.y < r.y + r.h + padding
  );
}

export function lineIntersectsRect(p1: Point, p2: Point, r: Rect, padding = 0): boolean {
  if (isPointInsideRect(p1, r, padding) || isPointInsideRect(p2, r, padding)) return true;

  const rx = r.x - padding;
  const ry = r.y - padding;
  const rw = r.w + padding * 2;
  const rh = r.h + padding * 2;
  const topLeft = { x: rx, y: ry };
  const topRight = { x: rx + rw, y: ry };
  const bottomLeft = { x: rx, y: ry + rh };
  const bottomRight = { x: rx + rw, y: ry + rh };

  if (doIntersect(p1, p2, topLeft, topRight)) return true;
  if (doIntersect(p1, p2, topRight, bottomRight)) return true;
  if (doIntersect(p1, p2, bottomRight, bottomLeft)) return true;
  if (doIntersect(p1, p2, bottomLeft, topLeft)) return true;

  return false;
}

export function generateWalkableNodes(rects: Rect[], mapWidth: number, mapHeight: number, padding = 12): Node[] {
  const nodes: Node[] = [];
  const BOUNDARY_PADDING = 64;

  rects.forEach(r => {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    
    // Add nodes at 16px and 32px clearances to ensure paths even in tight spots
    [16, 32].forEach(clearance => {
      nodes.push({ id: `${r.id}_top_${clearance}`, x: cx, y: r.y - clearance });
      nodes.push({ id: `${r.id}_bottom_${clearance}`, x: cx, y: r.y + r.h + clearance });
      nodes.push({ id: `${r.id}_left_${clearance}`, x: r.x - clearance, y: cy });
      nodes.push({ id: `${r.id}_right_${clearance}`, x: r.x + r.w + clearance, y: cy });
      
      nodes.push({ id: `${r.id}_tl_${clearance}`, x: r.x - clearance, y: r.y - clearance });
      nodes.push({ id: `${r.id}_tr_${clearance}`, x: r.x + r.w + clearance, y: r.y - clearance });
      nodes.push({ id: `${r.id}_bl_${clearance}`, x: r.x - clearance, y: r.y + r.h + clearance });
      nodes.push({ id: `${r.id}_br_${clearance}`, x: r.x + r.w + clearance, y: r.y + r.h + clearance });
    });
  });

  return nodes.filter(n => {
    // Must be inside safe map boundary
    if (
      n.x < BOUNDARY_PADDING ||
      n.x > mapWidth - BOUNDARY_PADDING ||
      n.y < BOUNDARY_PADDING ||
      n.y > mapHeight - BOUNDARY_PADDING
    ) {
      return false;
    }
    // Must not intersect with any padded obstacle
    return !rects.some(r => isPointInsideRect(n, r, padding));
  });
}

export function buildGraph(nodes: Node[], rects: Rect[], k = 15, padding = 12): Graph {
  const graph: Graph = {};

  nodes.forEach(node => {
    graph[node.id] = [];
    
    const validTargets = nodes
      .filter(n => n.id !== node.id)
      .map(n => {
        const dist = Math.hypot(n.x - node.x, n.y - node.y);
        return { target: n, dist };
      })
      .filter(({ target }) => !rects.some(r => lineIntersectsRect(node, target, r, padding)))
      .sort((a, b) => a.dist - b.dist);

    const nearest = validTargets.slice(0, k);
    nearest.forEach(({ target, dist }) => {
      graph[node.id].push({ target: target.id, weight: dist });
      
      if (!graph[target.id]) graph[target.id] = [];
      if (!graph[target.id].some(e => e.target === node.id)) {
        graph[target.id].push({ target: node.id, weight: dist });
      }
    });
  });

  return graph;
}

export function findZoneRoute(rects: Rect[], startZoneId: string, endZoneId: string, mapWidth: number, mapHeight: number): RouteResult | null {
  const padding = 12;
  const nodes = generateWalkableNodes(rects, mapWidth, mapHeight, padding);
  const graph = buildGraph(nodes, rects, 15, padding);
  
  // Create START and END virtual connections, only to orthogonal edge nodes (not corners)
  graph['START'] = nodes
    .filter(n => n.id.startsWith(startZoneId + '_') && !n.id.includes('_tl_') && !n.id.includes('_tr_') && !n.id.includes('_bl_') && !n.id.includes('_br_'))
    .map(n => ({ target: n.id, weight: 0 }));
    
  nodes
    .filter(n => n.id.startsWith(endZoneId + '_') && !n.id.includes('_tl_') && !n.id.includes('_tr_') && !n.id.includes('_bl_') && !n.id.includes('_br_'))
    .forEach(n => {
       if (!graph[n.id]) graph[n.id] = [];
       graph[n.id].push({ target: 'END', weight: 0 });
    });

  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const unvisited = new Set(Object.keys(graph));
  unvisited.add('START');
  unvisited.add('END');

  for (const node of unvisited) {
    distances[node] = Infinity;
    previous[node] = null;
  }
  distances['START'] = 0;

  while (unvisited.size > 0) {
    let current: string | null = null;
    let minDistance = Infinity;

    for (const node of unvisited) {
      if ((distances[node] ?? Infinity) < minDistance) {
        minDistance = distances[node] ?? Infinity;
        current = node;
      }
    }

    if (current === null || current === 'END') break;
    unvisited.delete(current);

    const neighbors = graph[current] || [];
    for (const neighbor of neighbors) {
      if (!unvisited.has(neighbor.target)) continue;

      const alt = (distances[current] ?? 0) + neighbor.weight;
      if (alt < (distances[neighbor.target] ?? Infinity)) {
        distances[neighbor.target] = alt;
        previous[neighbor.target] = current;
      }
    }
  }

  if (distances['END'] === Infinity || distances['END'] === undefined) return null;

  const pathIds: string[] = [];
  let curr: string | null = 'END';
  while (curr !== null) {
    pathIds.unshift(curr);
    curr = previous[curr] ?? null;
  }

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const pathNodes = pathIds
    .filter(id => id !== 'START' && id !== 'END')
    .map(id => nodeMap.get(id)!)
    .filter(Boolean);

  if (pathNodes.length === 0) return null;

  // Inject exact on-edge anchors
  const startRect = rects.find(r => r.id === startZoneId);
  const endRect = rects.find(r => r.id === endZoneId);
  
  if (startRect && endRect) {
     const firstNodeId = pathNodes[0].id;
     let startAnchor = { x: startRect.x + startRect.w/2, y: startRect.y + startRect.h/2 };
     if (firstNodeId.includes('_top_')) startAnchor = { x: startRect.x + startRect.w/2, y: startRect.y };
     else if (firstNodeId.includes('_bottom_')) startAnchor = { x: startRect.x + startRect.w/2, y: startRect.y + startRect.h };
     else if (firstNodeId.includes('_left_')) startAnchor = { x: startRect.x, y: startRect.y + startRect.h/2 };
     else if (firstNodeId.includes('_right_')) startAnchor = { x: startRect.x + startRect.w, y: startRect.y + startRect.h/2 };
     
     const lastNodeId = pathNodes[pathNodes.length - 1].id;
     let endAnchor = { x: endRect.x + endRect.w/2, y: endRect.y + endRect.h/2 };
     if (lastNodeId.includes('_top_')) endAnchor = { x: endRect.x + endRect.w/2, y: endRect.y };
     else if (lastNodeId.includes('_bottom_')) endAnchor = { x: endRect.x + endRect.w/2, y: endRect.y + endRect.h };
     else if (lastNodeId.includes('_left_')) endAnchor = { x: endRect.x, y: endRect.y + endRect.h/2 };
     else if (lastNodeId.includes('_right_')) endAnchor = { x: endRect.x + endRect.w, y: endRect.y + endRect.h/2 };
     
     pathNodes.unshift({ id: 'START_ANCHOR', x: startAnchor.x, y: startAnchor.y });
     pathNodes.push({ id: 'END_ANCHOR', x: endAnchor.x, y: endAnchor.y });
  }

  const totalDistancePixels = distances['END'];
  const totalDistanceMeters = totalDistancePixels * PIXELS_TO_METERS;

  return {
    path: pathNodes,
    totalDistance: totalDistanceMeters,
    walkingTimeSeconds: totalDistanceMeters / WALKING_SPEED,
    forkliftTimeSeconds: totalDistanceMeters / FORKLIFT_SPEED,
  };
}

export function findMultiStopRoute(rects: Rect[], stops: string[], mapWidth: number, mapHeight: number): MultiRouteResult {
  const segments: RouteSegment[] = [];
  let totalDistance = 0;
  let walkingTimeSeconds = 0;
  let forkliftTimeSeconds = 0;

  for (let i = 0; i < stops.length - 1; i++) {
    const fromZoneId = stops[i];
    const toZoneId = stops[i + 1];
    
    // Safety check in case empty stops are passed
    if (!fromZoneId || !toZoneId) continue;
    
    const segmentResult = findZoneRoute(rects, fromZoneId, toZoneId, mapWidth, mapHeight);
    
    if (!segmentResult) {
      throw new Error(`No safe route found between areas.`);
    }

    segments.push({
      fromZoneId,
      toZoneId,
      path: segmentResult.path,
      distanceMeters: segmentResult.totalDistance,
      walkingTimeSeconds: segmentResult.walkingTimeSeconds,
      forkliftTimeSeconds: segmentResult.forkliftTimeSeconds,
    });
    
    totalDistance += segmentResult.totalDistance;
    walkingTimeSeconds += segmentResult.walkingTimeSeconds;
    forkliftTimeSeconds += segmentResult.forkliftTimeSeconds;
  }

  // Merge full path, removing duplicate boundary nodes
  const fullPath: Node[] = [];
  for (let i = 0; i < segments.length; i++) {
    const segPath = segments[i].path;
    // For all segments after the first, remove the starting anchor because it overlaps 
    // exactly with the ending anchor of the previous segment.
    const pathToAdd = i === 0 ? segPath : segPath.slice(1);
    fullPath.push(...pathToAdd);
  }

  return {
    segments,
    fullPath,
    totalDistance,
    walkingTimeSeconds,
    forkliftTimeSeconds,
  };
}
