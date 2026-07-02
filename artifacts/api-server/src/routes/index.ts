import { Router, type IRouter } from "express";
import healthRouter from "./health";
import matchesRouter from "./matches";
import intelligenceRouter from "./intelligence";
import oddsRouter from "./odds";
import agentRouter from "./agent";

const router: IRouter = Router();

router.use(healthRouter);
router.use(matchesRouter);
router.use(intelligenceRouter);
router.use(oddsRouter);
router.use(agentRouter);

export default router;
