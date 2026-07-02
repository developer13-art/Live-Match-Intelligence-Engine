/**
 * Solana On-Chain Signal Anchoring
 *
 * High-confidence intelligence signals get their payload hash anchored to
 * Solana devnet via the SPL Memo program — cryptographic proof-of-existence
 * with a public timestamp.
 *
 * Signing keypair: generated from fixed seed (BrCdTBReMTD7J98BSCG4UHzWifR5mX9KU8dFMEVqEdTj)
 * Display wallet:  SOLANA_WALLET_ADDRESS env var (user's wallet — shown in UI)
 * Network:         Solana Devnet
 * Program:         SPL Memo (MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr)
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { createHash } from "crypto";
import { logger } from "./logger";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const DEVNET_RPC = "https://api.devnet.solana.com";
const EXPLORER_BASE = "https://explorer.solana.com/tx";
const EXPLORER_ADDR = "https://explorer.solana.com/address";

// User's display wallet (public key only — for UI and balance display)
const USER_WALLET_ADDRESS = process.env["SOLANA_WALLET_ADDRESS"] ?? null;

export interface AnchorResult {
  txSignature: string;
  explorerUrl: string;
  payloadHash: string;
  network: "devnet";
}

export interface OnChainAnchor {
  id: string;
  signalId: string;
  signalType: string;
  txSignature: string;
  explorerUrl: string;
  anchoredAt: string;
  matchId: string;
  network: string;
  payloadHash: string;
}

// ─── Keypair & connection ──────────────────────────────────────────────────────

let _signingKeypair: Keypair | null = null;
let _connection: Connection | null = null;
let _signerBalance = 0;
let _userBalance: number | null = null;
let _airdropRequested = false;
let _anchorsSubmitted = 0;

const anchors: OnChainAnchor[] = [];
let _idCounter = 1;

function uid(): string {
  return `anc-${Date.now()}-${_idCounter++}`;
}

/** Agent's signing keypair — used to submit Memo transactions */
export function getOrCreateKeypair(): Keypair {
  if (_signingKeypair) return _signingKeypair;

  const envKey = process.env["SOLANA_PRIVATE_KEY"];
  if (envKey) {
    try {
      const bytes = Buffer.from(envKey, "base64");
      _signingKeypair = Keypair.fromSecretKey(bytes);
      logger.info({ address: _signingKeypair.publicKey.toBase58() }, "Loaded signing keypair from env");
      return _signingKeypair;
    } catch {
      logger.warn("Failed to load keypair from env, using generated seed");
    }
  }

  const seed = Buffer.alloc(32);
  seed.write("LMIE-SHARP-DETECTOR-AGENT-v1-2026", "utf8");
  _signingKeypair = Keypair.fromSeed(seed.subarray(0, 32));
  logger.info({ address: _signingKeypair.publicKey.toBase58() }, "Generated agent signing keypair");
  return _signingKeypair;
}

export function getConnection(): Connection {
  if (!_connection) _connection = new Connection(DEVNET_RPC, "confirmed");
  return _connection;
}

/** Check balance of the user's display wallet (non-blocking, best-effort) */
async function refreshUserWalletBalance(): Promise<void> {
  if (!USER_WALLET_ADDRESS) return;
  try {
    const conn = getConnection();
    const pubkey = new PublicKey(USER_WALLET_ADDRESS);
    const bal = await conn.getBalance(pubkey);
    _userBalance = bal / LAMPORTS_PER_SOL;
    logger.debug({ address: USER_WALLET_ADDRESS, balance: _userBalance }, "User wallet balance refreshed");
  } catch {
    // non-critical
  }
}

export async function ensureDevnetFunds(): Promise<void> {
  if (_airdropRequested) return;
  _airdropRequested = true;

  const kp = getOrCreateKeypair();
  const conn = getConnection();

  try {
    const balance = await conn.getBalance(kp.publicKey);
    _signerBalance = balance / LAMPORTS_PER_SOL;

    if (_signerBalance < 0.05) {
      logger.info({ address: kp.publicKey.toBase58(), balance: _signerBalance }, "Requesting devnet airdrop");
      const sig = await conn.requestAirdrop(kp.publicKey, 0.5 * LAMPORTS_PER_SOL);
      await conn.confirmTransaction(sig, "confirmed");
      _signerBalance = 0.5;
      logger.info({ address: kp.publicKey.toBase58() }, "Devnet airdrop received");
    }
  } catch (err) {
    logger.warn({ err }, "Devnet airdrop/balance check failed — anchoring may fail until funded");
  }

  // Also check user's display wallet balance
  refreshUserWalletBalance().catch(() => {});
}

async function refreshSignerBalance(): Promise<void> {
  try {
    const kp = getOrCreateKeypair();
    const conn = getConnection();
    const bal = await conn.getBalance(kp.publicKey);
    _signerBalance = bal / LAMPORTS_PER_SOL;
  } catch {
    // non-critical
  }
}

// ─── Hashing ──────────────────────────────────────────────────────────────────

export function hashPayload(payload: object): string {
  return createHash("sha256")
    .update(JSON.stringify(payload, Object.keys(payload).sort()))
    .digest("hex");
}

// ─── Anchoring ────────────────────────────────────────────────────────────────

export async function anchorSignal(params: {
  signalId: string;
  signalType: string;
  matchId: string;
  confidence: number;
  headline: string;
  generatedAt: string;
}): Promise<AnchorResult | null> {
  const kp = getOrCreateKeypair();
  const conn = getConnection();

  const payload = {
    lmie: "1.0",
    signalId: params.signalId,
    signalType: params.signalType,
    matchId: params.matchId,
    confidence: params.confidence,
    headline: params.headline,
    generatedAt: params.generatedAt,
    anchoredAt: new Date().toISOString(),
  };

  const payloadHash = hashPayload(payload);
  const memoText = `LMIE:${payloadHash.substring(0, 32)}`;

  try {
    const ix = new TransactionInstruction({
      keys: [{ pubkey: kp.publicKey, isSigner: true, isWritable: false }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memoText, "utf-8"),
    });

    const tx = new Transaction().add(ix);
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = kp.publicKey;

    const sig = await sendAndConfirmTransaction(conn, tx, [kp], {
      commitment: "confirmed",
      skipPreflight: false,
    });

    _anchorsSubmitted++;
    refreshSignerBalance().catch(() => {});

    const result: AnchorResult = {
      txSignature: sig,
      explorerUrl: `${EXPLORER_BASE}/${sig}?cluster=devnet`,
      payloadHash,
      network: "devnet",
    };

    logger.info({ sig, signalId: params.signalId }, "Signal anchored on Solana devnet");
    return result;
  } catch (err) {
    logger.warn({ err, signalId: params.signalId }, "Solana anchoring failed — will retry next cycle");
    return null;
  }
}

export async function recordAnchor(anchor: Omit<OnChainAnchor, "id">): Promise<OnChainAnchor> {
  const full: OnChainAnchor = { id: uid(), ...anchor };
  anchors.push(full);
  if (anchors.length > 200) anchors.splice(0, anchors.length - 200);
  return full;
}

export function getAllAnchors(): OnChainAnchor[] {
  return [...anchors].reverse();
}

export function getAnchorCount(): number {
  return _anchorsSubmitted;
}

export function getWalletInfo() {
  const kp = getOrCreateKeypair();
  const signerAddress = kp.publicKey.toBase58();

  // If user provided their own wallet address, show that prominently
  // alongside the agent's signing keypair
  if (USER_WALLET_ADDRESS) {
    return {
      address: USER_WALLET_ADDRESS,
      signerAddress,
      network: "devnet",
      explorerUrl: `${EXPLORER_ADDR}/${USER_WALLET_ADDRESS}?cluster=devnet`,
      signerExplorerUrl: `${EXPLORER_ADDR}/${signerAddress}?cluster=devnet`,
      balance: _userBalance !== null ? Math.round(_userBalance * 10000) / 10000 : null,
      signerBalance: Math.round(_signerBalance * 10000) / 10000,
      airdropAvailable: true,
    };
  }

  return {
    address: signerAddress,
    signerAddress,
    network: "devnet",
    explorerUrl: `${EXPLORER_ADDR}/${signerAddress}?cluster=devnet`,
    signerExplorerUrl: `${EXPLORER_ADDR}/${signerAddress}?cluster=devnet`,
    balance: Math.round(_signerBalance * 10000) / 10000,
    signerBalance: Math.round(_signerBalance * 10000) / 10000,
    airdropAvailable: true,
  };
}
