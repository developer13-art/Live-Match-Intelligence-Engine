import { Router, type IRouter } from "express";
import { getAgentStatus, getAllDetections } from "../lib/sharpDetector";
import { getAllAnchors, getWalletInfo } from "../lib/solanaAnchor";
import { isUsingRealApi } from "../lib/txlineAdapter";

const router: IRouter = Router();

router.get("/agent/status", async (_req, res): Promise<void> => {
  const status = getAgentStatus();
  const wallet = getWalletInfo();
  res.json({
    ...status,
    walletAddress: wallet.address,
    signerAddress: wallet.signerAddress,
    txlineRealApi: isUsingRealApi(),
  });
});

router.get("/agent/detections", async (_req, res): Promise<void> => {
  res.json(getAllDetections());
});

router.get("/agent/anchors", async (_req, res): Promise<void> => {
  res.json(getAllAnchors());
});

router.get("/agent/wallet", async (_req, res): Promise<void> => {
  res.json(getWalletInfo());
});

export default router;
