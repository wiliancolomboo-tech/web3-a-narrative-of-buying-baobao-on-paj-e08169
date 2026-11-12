import axios from "axios";

export interface TelemetryReport {
  txSignature: string;
  solAmount: number;
  tokensReceived: string;
  targetTokenMint: string;
  jitoTip: number;
  latencyMs: number;
}

export async function sendDiscordNotification(webhookUrl: string, data: TelemetryReport): Promise<void> {
  if (!webhookUrl) {
    console.log("[Telemetry] Discord Webhook URL not provided. Skipping Discord notification.");
    return;
  }

  const embed = {
    title: "🚀 PAJ Executed: $BAOBAO Swap Confirmed",
    color: 0x00ff88, // Neon Emerald
    fields: [
      { name: "Transaction Signature", value: `\`${data.txSignature}\``, inline: false },
      { name: "Input Lamports / SOL", value: `${data.solAmount} SOL`, inline: true },
      { name: "$BAOBAO Output", value: `${data.tokensReceived} BAOBAO`, inline: true },
      { name: "Jito Validator Tip", value: `${data.jitoTip / 1e9} SOL`, inline: true },
      { name: "Target Mint", value: `\`${data.targetTokenMint}\``, inline: false },
      { name: "Bundle Latency", value: `${data.latencyMs} ms`, inline: true },
    ],
    footer: {
      text: "PAJ Autonomous Execution Engine • Solana Mainnet-Beta",
    },
    timestamp: new Date().toISOString(),
  };

  try {
    await axios.post(webhookUrl, { embeds: [embed] });
    console.log("[Telemetry] Successfully delivered Discord notification.");
  } catch (err: any) {
    console.error("[Telemetry] Failed to post to Discord webhook:", err.message);
  }
}

export async function sendResendReceipt(
  apiKey: string,
  recipient: string,
  data: TelemetryReport
): Promise<void> {
  if (!apiKey || !recipient) {
    console.log("[Telemetry] Resend API key or recipient missing. Skipping transactional email.");
    return;
  }

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; background-color: #0b0e14; color: #ffffff; padding: 24px; border-radius: 8px;">
      <h2 style="color: #00ff88;">PAJ Execution Receipt - $BAOBAO Acquisition</h2>
      <p>Your automated swap order completed with non-sandwichable Jito MEV protection.</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        <tr style="border-bottom: 1px solid #222;">
          <td style="padding: 8px 0; color: #aaa;">Status</td>
          <td style="padding: 8px 0; font-weight: bold; color: #00ff88;">CONFIRMED ON-CHAIN</td>
        </tr>
        <tr style="border-bottom: 1px solid #222;">
          <td style="padding: 8px 0; color: #aaa;">Signature</td>
          <td style="padding: 8px 0; font-family: monospace;">${data.txSignature}</td>
        </tr>
        <tr style="border-bottom: 1px solid #222;">
          <td style="padding: 8px 0; color: #aaa;">Swap Amount</td>
          <td style="padding: 8px 0;">${data.solAmount} SOL</td>
        </tr>
        <tr style="border-bottom: 1px solid #222;">
          <td style="padding: 8px 0; color: #aaa;">Tokens Acquired</td>
          <td style="padding: 8px 0; font-weight: bold;">${data.tokensReceived} BAOBAO</td>
        </tr>
      </table>
      <p style="margin-top: 24px; font-size: 12px; color: #777;">
        Deterministic Vault Program: PajBaoBaoSett1ement111111111111111111111111
      </p>
    </div>
  `;

  try {
    await axios.post(
      "https://api.resend.com/emails",
      {
        from: "execution-engine@paj-baobao.io",
        to: recipient,
        subject: `[CONFIRMED] BAOBAO Swap Receipt - ${data.txSignature.slice(0, 8)}...`,
        html: htmlBody,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("[Telemetry] Successfully sent trade receipt email via Resend.");
  } catch (err: any) {
    console.error("[Telemetry] Failed to dispatch Resend email:", err.response?.data || err.message);
  }
}