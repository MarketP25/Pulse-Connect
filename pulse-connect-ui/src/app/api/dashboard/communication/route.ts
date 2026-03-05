import { NextRequest } from "next/server";
import { askDashboardChatbot, getCommunicationModule } from "@/server/dashboard/service";
import { getDashboardUserId, mapDashboardError, noStoreJson, parseJsonBody } from "../_utils";

export async function GET(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const result = await getCommunicationModule(userId);
    return noStoreJson(result);
  } catch (error) {
    return mapDashboardError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const body = await parseJsonBody<{ prompt?: string }>(req);

    if (!body.prompt) {
      return noStoreJson({ code: "prompt_required", message: "prompt is required" }, 400);
    }

    const result = await askDashboardChatbot(userId, body.prompt);
    return noStoreJson(result);
  } catch (error) {
    return mapDashboardError(error);
  }
}
