import { Router } from 'express';
import { ProximityController } from './httpController';
import { ProximityService } from '../service';

// This is a placeholder for the full service initialization
const proximityService = new ProximityService();
const proximityController = new ProximityController(proximityService);

const router = Router();

// Geocoding Routes
router.post('/geocode', (req, res) => proximityController.geocode(req, res));
router.post('/reverse', (req, res) => proximityController.reverseGeocode(req, res));

// Proximity Intelligence Routes
router.post('/distance', (req, res) => proximityController.distance(req, res));
router.post('/cluster', (req, res) => proximityController.cluster(req, res));

// Observability Routes
router.get('/health', (req, res) => proximityController.health(req, res));
router.get('/metrics', (req, res) => proximityController.metrics(req, res));

export { router as proximityRoutes };