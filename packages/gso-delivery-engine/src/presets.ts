import { EdgeNode } from "./types";

export const PLANETARY_EDGE_NODES: EdgeNode[] = [
  {
    id: "edge-af-east-1",
    region: "africa-east",
    countries: ["KE", "UG", "TZ", "RW", "ET", "SO"],
    languages: ["en", "sw", "fr", "am"],
    medianLatencyMs: 32
  },
  {
    id: "edge-af-west-1",
    region: "africa-west",
    countries: ["NG", "GH", "CI", "SN", "CM"],
    languages: ["en", "fr"],
    medianLatencyMs: 38
  },
  {
    id: "edge-eu-west-1",
    region: "europe-west",
    countries: ["GB", "FR", "DE", "ES", "IT", "NL"],
    languages: ["en", "fr", "de", "es", "it"],
    medianLatencyMs: 44
  },
  {
    id: "edge-na-east-1",
    region: "north-america-east",
    countries: ["US", "CA", "MX"],
    languages: ["en", "es", "fr"],
    medianLatencyMs: 40
  },
  {
    id: "edge-sa-east-1",
    region: "south-america-east",
    countries: ["BR", "AR", "CL", "CO", "PE"],
    languages: ["pt", "es", "en"],
    medianLatencyMs: 53
  },
  {
    id: "edge-ap-south-1",
    region: "asia-pacific-south",
    countries: ["IN", "PK", "BD", "LK", "NP"],
    languages: ["en", "hi", "bn", "ur"],
    medianLatencyMs: 47
  },
  {
    id: "edge-ap-east-1",
    region: "asia-pacific-east",
    countries: ["SG", "JP", "KR", "AU", "NZ", "ID", "PH", "MY"],
    languages: ["en", "ja", "ko", "zh"],
    medianLatencyMs: 41
  }
];
