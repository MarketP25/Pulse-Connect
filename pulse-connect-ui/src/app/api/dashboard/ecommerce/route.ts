import { NextRequest } from "next/server";
import { getEcommerceModule, purchaseEcommerceProduct } from "@/server/dashboard/service";
import { getDashboardUserId, mapDashboardError, noStoreJson, parseJsonBody } from "../_utils";

export async function GET(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const result = await getEcommerceModule(userId);
    return noStoreJson(result);
  } catch (error) {
    return mapDashboardError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const body = await parseJsonBody<{ productId?: string }>(req);

    if (!body.productId) {
      return noStoreJson({ code: "product_required", message: "productId is required" }, 400);
    }

    const result = await purchaseEcommerceProduct(userId, body.productId);
    return noStoreJson(result, 201);
  } catch (error) {
    return mapDashboardError(error);
  }
}
