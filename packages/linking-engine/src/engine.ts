import { InternalLink, LinkablePage, LinkingResult, TopicCluster } from "./types";

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

function setSimilarity(left: string[], right: string[]): number {
  const leftSet = new Set(left.map(normalize));
  const rightSet = new Set(right.map(normalize));

  if (leftSet.size === 0 && rightSet.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const item of leftSet) {
    if (rightSet.has(item)) {
      intersection += 1;
    }
  }

  const union = new Set([...leftSet, ...rightSet]).size;
  return intersection / Math.max(1, union);
}

function similarityScore(left: LinkablePage, right: LinkablePage): number {
  const entityScore = setSimilarity(left.entities, right.entities);
  const keywordScore = setSimilarity(left.keywords, right.keywords);
  const topicBonus = normalize(left.primaryTopic) === normalize(right.primaryTopic) ? 0.25 : 0;
  return Number(Math.min(1, entityScore * 0.45 + keywordScore * 0.55 + topicBonus).toFixed(4));
}

export class InternalLinkingEngine {
  buildClusters(pages: LinkablePage[]): TopicCluster[] {
    const grouped = new Map<string, LinkablePage[]>();

    for (const page of pages) {
      const key = normalize(page.primaryTopic);
      const bucket = grouped.get(key) ?? [];
      bucket.push(page);
      grouped.set(key, bucket);
    }

    return [...grouped.entries()].map(([topic, bucket], index) => ({
      id: `cluster-${index + 1}`,
      topic,
      pages: bucket.map((page) => page.path)
    }));
  }

  generateLinks(pages: LinkablePage[], maxLinksPerPage = 4): LinkingResult {
    const links: InternalLink[] = [];

    for (const source of pages) {
      const candidates = pages
        .filter((target) => target.path !== source.path)
        .map((target) => ({
          target,
          score: similarityScore(source, target)
        }))
        .filter((item) => item.score >= 0.2)
        .sort((left, right) => right.score - left.score)
        .slice(0, maxLinksPerPage);

      for (const candidate of candidates) {
        links.push({
          from: source.path,
          to: candidate.target.path,
          anchorText: `Related: ${candidate.target.primaryTopic}`,
          score: candidate.score
        });
      }
    }

    return {
      clusters: this.buildClusters(pages),
      links
    };
  }
}
