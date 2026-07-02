import { Router, type IRouter } from "express";
import {
  getMatchSnapshot,
  getSignals,
  getNarrative,
  getEvents,
  getIntelligenceSummary,
} from "../lib/matchEngine";
import { getAgentStatus } from "../lib/sharpDetector";
import { getAnchorCount } from "../lib/solanaAnchor";

const router: IRouter = Router();

router.get("/matches/:matchId/snapshot", async (req, res): Promise<void> => {
  const matchId = Array.isArray(req.params.matchId) ? req.params.matchId[0] : req.params.matchId;
  const snapshot = getMatchSnapshot(matchId);
  if (!snapshot) {
    res.status(404).json({ error: "Match not found" });
    return;
  }
  res.json(snapshot);
});

router.get("/matches/:matchId/signals", async (req, res): Promise<void> => {
  const matchId = Array.isArray(req.params.matchId) ? req.params.matchId[0] : req.params.matchId;
  res.json(getSignals(matchId));
});

router.get("/matches/:matchId/narrative", async (req, res): Promise<void> => {
  const matchId = Array.isArray(req.params.matchId) ? req.params.matchId[0] : req.params.matchId;
  res.json(getNarrative(matchId));
});

router.get("/matches/:matchId/events", async (req, res): Promise<void> => {
  const matchId = Array.isArray(req.params.matchId) ? req.params.matchId[0] : req.params.matchId;
  res.json(getEvents(matchId));
});

router.get("/intelligence/summary", async (_req, res): Promise<void> => {
  const summary = getIntelligenceSummary();
  const agentStatus = getAgentStatus();
  res.json({
    ...summary,
    sharpMovements: agentStatus.totalDetections,
    anchorsOnChain: getAnchorCount(),
    agentCycles: agentStatus.cycleCount,
  });
});

export default router;
