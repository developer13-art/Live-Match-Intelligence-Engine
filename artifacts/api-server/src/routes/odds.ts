import { Router, type IRouter } from "express";
import { getCurrentOdds, getOddsHistory } from "../lib/txlineAdapter";
import { getMatch } from "../lib/matchEngine";

const router: IRouter = Router();

router.get("/matches/:matchId/odds", async (req, res): Promise<void> => {
  const matchId = Array.isArray(req.params.matchId) ? req.params.matchId[0] : req.params.matchId;
  const match = getMatch(matchId);
  if (!match) {
    res.status(404).json({ error: "Match not found" });
    return;
  }
  const odds = getCurrentOdds(matchId, match.minute);
  if (!odds) {
    res.status(404).json({ error: "Odds not yet available" });
    return;
  }
  res.json(odds);
});

router.get("/matches/:matchId/odds/history", async (req, res): Promise<void> => {
  const matchId = Array.isArray(req.params.matchId) ? req.params.matchId[0] : req.params.matchId;
  const history = getOddsHistory(matchId);
  res.json(history);
});

export default router;
