import express from "express";
import { FeeService } from "./fee.service";
import { PublishService } from "./publish.service";
import { BookingService } from "./booking.service";
import { LedgerService } from "./ledger.service";

const router = express.Router();

// Middleware for authentication (placeholder)
const requireAuth = (req: any, res: any, next: any) => {
  // TODO: Implement proper authentication
  req.user = { id: req.headers["x-user-id"] || "anonymous" };
  next();
};

// Middleware for admin access
const requireAdmin = (req: any, res: any, next: any) => {
  // TODO: Implement admin role check
  next();
};

// Fee Service Routes
router.get("/fee-policy/current", async (req, res) => {
  try {
    const feeService = req.app.locals.feeService as FeeService;
    const policy = await feeService.getCurrentPolicy();

    res.json({
      success: true,
      data: policy,
      trace_id: req.headers["x-trace-id"] || "unknown"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      trace_id: req.headers["x-trace-id"] || "unknown"
    });
  }
});

router.get("/fee-policy/:version", async (req, res) => {
  try {
    const feeService = req.app.locals.feeService as FeeService;
    const policy = await feeService.getPolicyByVersion(req.params.version);

    if (!policy) {
      return res.status(404).json({
        success: false,
        error: "Policy version not found",
        trace_id: req.headers["x-trace-id"] || "unknown"
      });
    }

    res.json({
      success: true,
      data: policy,
      trace_id: req.headers["x-trace-id"] || "unknown"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      trace_id: req.headers["x-trace-id"] || "unknown"
    });
  }
});

router.post("/fee-policy", requireAdmin, async (req, res) => {
  try {
    const feeService = req.app.locals.feeService as FeeService;
    const policy = await feeService.createPolicy(req.body);

    res.status(201).json({
      success: true,
      data: policy,
      trace_id: req.headers["x-trace-id"] || "unknown"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      trace_id: req.headers["x-trace-id"] || "unknown"
    });
  }
});

// Publish Service Routes
router.post("/places", requireAuth, async (req, res) => {
  try {
    const publishService = req.app.locals.publishService as PublishService;
    const traceId = (req.headers["x-trace-id"] as string) || "unknown";

    const place = await publishService.publishPlace(req.user.id, req.body, traceId);

    res.status(201).json({
      success: true,
      data: place,
      trace_id: traceId
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      trace_id: req.headers["x-trace-id"] || "unknown"
    });
  }
});

router.put("/places/:placeId", requireAuth, async (req, res) => {
  try {
    const publishService = req.app.locals.publishService as PublishService;

    const place = await publishService.updatePlace(req.params.placeId, req.user.id, req.body);

    res.json({
      success: true,
      data: place,
      trace_id: req.headers["x-trace-id"] || "unknown"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      trace_id: req.headers["x-trace-id"] || "unknown"
    });
  }
});

router.delete("/places/:placeId", requireAuth, async (req, res) => {
  try {
    const publishService = req.app.locals.publishService as PublishService;

    await publishService.unpublishPlace(req.params.placeId, req.user.id);

    res.json({
      success: true,
      message: "Place unpublished successfully",
      trace_id: req.headers["x-trace-id"] || "unknown"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      trace_id: req.headers["x-trace-id"] || "unknown"
    });
  }
});

router.get("/places", requireAuth, async (req, res) => {
  try {
    const publishService = req.app.locals.publishService as PublishService;
    const places = await publishService.getPlacesByHost(req.user.id);

    res.json({
      success: true,
      data: places,
      trace_id: req.headers["x-trace-id"] || "unknown"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      trace_id: req.headers["x-trace-id"] || "unknown"
    });
  }
});

// Booking Service Routes
router.post("/bookings/calculate", async (req, res) => {
  try {
    const bookingService = req.app.locals.bookingService as BookingService;
    const traceId = (req.headers["x-trace-id"] as string) || "unknown";

    const calculation = await bookingService.calculateBooking(req.body, traceId);

    res.json({
      success: true,
      data: calculation,
      trace_id: traceId
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      trace_id: req.headers["x-trace-id"] || "unknown"
    });
  }
});

router.post("/bookings", requireAuth, async (req, res) => {
  try {
    const bookingService = req.app.locals.bookingService as BookingService;
    const traceId = (req.headers["x-trace-id"] as string) || "unknown";

    const booking = await bookingService.createBooking(req.body, traceId);

    res.status(201).json({
      success: true,
      data: booking,
      trace_id: traceId
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      trace_id: req.headers["x-trace-id"] || "unknown"
    });
  }
});

router.delete("/bookings/:bookingId", requireAuth, async (req, res) => {
  try {
    const bookingService = req.app.locals.bookingService as BookingService;

    const booking = await bookingService.cancelBooking(
      req.params.bookingId,
      req.user.id,
      req.body.reason
    );

    res.json({
      success: true,
      data: booking,
      trace_id: req.headers["x-trace-id"] || "unknown"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      trace_id: req.headers["x-trace-id"] || "unknown"
    });
  }
});

router.get("/bookings", requireAuth, async (req, res) => {
  try {
    const bookingService = req.app.locals.bookingService as BookingService;
    const bookings = await bookingService.getBookingsByBooker(req.user.id);

    res.json({
      success: true,
      data: bookings,
      trace_id: req.headers["x-trace-id"] || "unknown"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      trace_id: req.headers["x-trace-id"] || "unknown"
    });
  }
});

// Ledger Service Routes
router.get("/transactions/:transactionId", requireAuth, async (req, res) => {
  try {
    const ledgerService = req.app.locals.ledgerService as LedgerService;
    const transaction = await ledgerService.getTransaction(req.params.transactionId);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: "Transaction not found",
        trace_id: req.headers["x-trace-id"] || "unknown"
      });
    }

    res.json({
      success: true,
      data: transaction,
      trace_id: req.headers["x-trace-id"] || "unknown"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      trace_id: req.headers["x-trace-id"] || "unknown"
    });
  }
});

router.get("/ledger/entries/:transactionId", requireAuth, async (req, res) => {
  try {
    const ledgerService = req.app.locals.ledgerService as LedgerService;
    const entries = await ledgerService.getLedgerEntriesForTransaction(req.params.transactionId);

    res.json({
      success: true,
      data: entries,
      trace_id: req.headers["x-trace-id"] || "unknown"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      trace_id: req.headers["x-trace-id"] || "unknown"
    });
  }
});

router.get("/ledger/balance/:account", requireAdmin, async (req, res) => {
  try {
    const ledgerService = req.app.locals.ledgerService as LedgerService;
    const balance = await ledgerService.getAccountBalance(req.params.account);

    res.json({
      success: true,
      data: { account: req.params.account, balance_usd: balance },
      trace_id: req.headers["x-trace-id"] || "unknown"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      trace_id: req.headers["x-trace-id"] || "unknown"
    });
  }
});

export default router;
