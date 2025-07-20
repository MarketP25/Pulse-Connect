export interface User {
  id: string;
  name: string;
  role: "guest" | "viewer" | "editor" | "admin";
  plan: string | null;
  locale: "en" | "sw" | "yo" | "ar" | "pt" | "hi";
}

export interface Org {
  id: string;
  name: string;
  plan: string | null;
  region: "KE" | "NG" | "BR" | "IN" | "EG" | "MX";
}

export interface Session {
  user: User;
  org: Org;
}