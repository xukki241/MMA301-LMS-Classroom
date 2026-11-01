import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller.js";
import { asyncHandler } from "../lib/httpError.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const paymentRouter = Router();

paymentRouter.post(
  "/classes/:classId/materials/:materialId/checkout",
  requireAuth,
  asyncHandler(PaymentController.createMaterialCheckout)
);
paymentRouter.post("/payments/sepay/confirm-demo", requireAuth, asyncHandler(PaymentController.confirmDemo));
paymentRouter.get("/payments/sepay/demo-checkout", asyncHandler(PaymentController.demoCheckoutPage));
paymentRouter.get("/payments/sepay/hosted-launch", asyncHandler(PaymentController.hostedLaunchPage));
paymentRouter.get("/payments/sepay/return", asyncHandler(PaymentController.sepayReturn));
paymentRouter.post("/payments/sepay/return", asyncHandler(PaymentController.sepayReturn));
/** Canonical SePay PG IPN — set this URL in SePay dashboard (not AMS/cloudflare tunnels). */
paymentRouter.post("/payments/sepay/ipn", asyncHandler(PaymentController.sepayIpn));
