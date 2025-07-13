// src/commands/temp.ts
import { writeFileSync, mkdirSync } from "fs";
import path from "path";

// Either import your real context type, e.g.
// import { CommandContext } from "./index";
// or just declare a minimal one:
interface TempCommandContext {
  payload: any;
}

export async function temp(ctx: TempCommandContext) {
  // 1. ensure ./tmp folder exists
  const tmpDir = path.join(process.cwd(), "tmp");
  mkdirSync(tmpDir, { recursive: true });

  // 2. build filename & full path
  const fileName = `${Date.now()}.json`;
  const filePath = path.join(tmpDir, fileName);

  // 3. write the payload
  writeFileSync(filePath, JSON.stringify(ctx.payload, null, 2));

  // 4. return a download URL
  return { url: `/downloads/${fileName}` };
}