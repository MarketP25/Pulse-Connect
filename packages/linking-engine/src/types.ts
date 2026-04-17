export interface LinkablePage {
  path: string;
  title: string;
  primaryTopic: string;
  entities: string[];
  keywords: string[];
}

export interface TopicCluster {
  id: string;
  topic: string;
  pages: string[];
}

export interface InternalLink {
  from: string;
  to: string;
  anchorText: string;
  score: number;
}

export interface LinkingResult {
  clusters: TopicCluster[];
  links: InternalLink[];
}
