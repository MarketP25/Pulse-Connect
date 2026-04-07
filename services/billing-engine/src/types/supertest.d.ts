declare module "supertest" {
  import { SuperAgent, SuperAgentRequest, SuperAgentTest } from "superagent";

  export = supertest;

  function supertest(app: any): SuperAgentTest;

  namespace supertest {
    export type SuperAgent<T = any> = SuperAgent<T>;
    export type SuperAgentRequest = SuperAgentRequest;
    export type SuperAgentTest = SuperAgentTest;
  }
}
