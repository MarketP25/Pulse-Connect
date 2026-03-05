import { AsyncQueue } from "./types";

export class InMemoryAsyncQueue<TJob> implements AsyncQueue<TJob> {
  private readonly jobs: TJob[] = [];

  async enqueue(job: TJob): Promise<void> {
    this.jobs.push(job);
  }

  drain(): TJob[] {
    const drained = [...this.jobs];
    this.jobs.length = 0;
    return drained;
  }
}
