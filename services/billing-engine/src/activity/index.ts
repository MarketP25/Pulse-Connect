import { ActivityEngine, ActivityEngineType } from '../types';
import * as ecommerce from './ecommerce';
import * as matchmaking from './matchmaking';
import * as places from './places';
import * as communication from './communication';
import * as pap_v1 from './pap_v1';
import * as ai_programs from './ai_programs';
import * as localization from './localization';

const registry: Record<ActivityEngineType, ActivityEngine> = {
  ecommerce: ecommerce.calculate,
  matchmaking: matchmaking.calculate,
  places: places.calculate,
  communication: communication.calculate,
  pap_v1: pap_v1.calculate,
  ai_programs: ai_programs.calculate,
  localization: localization.calculate,
};

export function getEngine(type: ActivityEngineType): ActivityEngine {
  const e = registry[type];
  if (!e) throw new Error('engine_not_found');
  return e;
}

export function listEngines() {
  return Object.keys(registry) as ActivityEngineType[];
}
