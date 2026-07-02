import { Router, type IRouter } from "express";
import {
  getAllMatches,
  getMatch,
} from "../lib/matchEngine";

const router: IRouter = Router();

router.get("/matches", async (_req, res): Promise<void> => {
  const matches = getAllMatches();
  res.json(matches);
});

router.get("/matches/:matchId", async (req, res): Promise<void> => {
  const matchId = Array.isArray(req.params.matchId) ? req.params.matchId[0] : req.params.matchId;
  const match = getMatch(matchId);
  if (!match) {
    res.status(404).json({ error: "Match not found" });
    return;
  }
  res.json(match);
});

export default router;
