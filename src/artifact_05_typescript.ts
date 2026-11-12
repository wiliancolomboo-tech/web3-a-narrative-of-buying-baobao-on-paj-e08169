import dotenv from "dotenv";
import { PublicKey } from "@solana/web3.js";

dotenv.config();

export interface AgentConfig {
  solanaRpcUrl: string;
  privateKeyBase58: string;
  baobaoMintAddress: PublicKey;
  programId: PublicKey;
  jitoBlockEngineUrl: string;
  jitoTipAccount: PublicKey;
  jitoTipLamports: number;
  discordWebhookUrl: string;
  resendApiKey: string;
  resendRecipientEmail: string;
  swapAmountSol: number;
  slippageBps: number;
}

export function loadConfig(): AgentConfig {
  const privateKey = process.env.SOLANA_PRIVATE_KEY;
  if (!privateKey) throw new Error("Missing SOLANA_PRIVATE_KEY environment variable.");

  return {
    solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
    privateKeyBase58: privateKey,
    baobaoMintAddress: new PublicKey(
      process.env.BAOBAO_MINT || "BAOBaoXbV2jM8g1VwZqP9gYQzK3G4WqM5K9D1Y7pump"
    ),
    programId: new PublicKey(
      process.env.PROGRAM_ID || "PajBaoBaoSett1ement111111111111111111111111"
    ),
    jitoBlockEngineUrl:
      process.env.JITO_BLOCK_ENGINE_URL || "https://mainnet.block-engine.jito.wtf/api/v1/bundles",
    jitoTipAccount: new PublicKey(
      process.env.JITO_TIP_ACCOUNT || "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5"
    ),
    jitoTipLamports: Number(process.env.JITO_TIP_LAMPORTS || "100000"), // 0.0001 SOL
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || "",
    resendApiKey: process.env.RESEND_API_KEY || "",
    resendRecipientEmail: process.env.RESEND_RECIPIENT_EMAIL || "trader@enterprise.com",
    swapAmountSol: parseFloat(process.env.SWAP_AMOUNT_SOL || "0.5"),
    slippageBps: parseInt(process.env.SLIPPAGE_BPS || "100", 10), // 1%
  };
}