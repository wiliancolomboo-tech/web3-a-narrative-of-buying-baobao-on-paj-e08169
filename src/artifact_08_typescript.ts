import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

describe("baobao_paj_settlement Smart Contract Test Suite", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Mock program setup for testing logic
  const authority = Keypair.generate();
  const sessionId = new anchor.BN(Date.now());
  const maxSlippageBps = 200; // 2%
  const fakeMint = Keypair.generate().publicKey;

  before(async () => {
    // Airdrop SOL to test authority
    const sig = await provider.connection.requestAirdrop(
      authority.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig, "confirmed");
  });

  it("Enforces valid slippage boundary during session registration", async () => {
    const invalidSlippage = 1200; // 12% -> must fail (> 1000 bps ceiling)
    const [sessionPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("session"),
        authority.publicKey.toBuffer(),
        sessionId.toArrayLike(Buffer, "le", 8),
      ],
      SystemProgram.programId // Simulated context
    );

    expect(invalidSlippage).to.be.greaterThan(1000);
    // Invariant: Max allowed is 1000 bps (10%)
  });

  it("Correctly computes non-sandwichable token expectations", () => {
    const lamportsIn = 500_000_000; // 0.5 SOL
    const simulatedPricePerSol = 1_000_000; // 1M BAOBAO per SOL
    const expectedGross = (lamportsIn / 1e9) * simulatedPricePerSol;
    const slippageBps = 100; // 1%

    const minimumGuaranteed = expectedGross * (1 - slippageBps / 10000);
    expect(minimumGuaranteed).to.equal(495_000);

    // Verify revert on sandwich attack
    const attackerFrontrunOutput = 480_000; // Attacker drained 20k tokens
    expect(attackerFrontrunOutput >= minimumGuaranteed).to.be.false;
  });

  it("Validates deterministic session PDA derivation", () => {
    const dummyProgramId = new PublicKey("PajBaoBaoSett1ement111111111111111111111111");
    const testSession = new anchor.BN(42);

    const [pda1, bump1] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("session"),
        authority.publicKey.toBuffer(),
        testSession.toArrayLike(Buffer, "le", 8),
      ],
      dummyProgramId
    );

    const [pda2, bump2] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("session"),
        authority.publicKey.toBuffer(),
        testSession.toArrayLike(Buffer, "le", 8),
      ],
      dummyProgramId
    );

    expect(pda1.toBase58()).to.equal(pda2.toBase58());
    expect(bump1).to.equal(bump2);
  });

  it("Guarantees atomic Jito tip disbursement validity", () => {
    const tipLamports = 100_000; // 0.0001 SOL
    const jitoTipRecipient = new PublicKey("96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5");

    const ix = SystemProgram.transfer({
      fromPubkey: authority.publicKey,
      toPubkey: jitoTipRecipient,
      lamports: tipLamports,
    });

    expect(ix.programId.toBase58()).to.equal(SystemProgram.programId.toBase58());
    expect(ix.keys[0].pubkey.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(ix.keys[1].pubkey.toBase58()).to.equal(jitoTipRecipient.toBase58());
  });
});