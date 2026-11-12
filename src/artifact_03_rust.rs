use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("PajBaoBaoSett1ement111111111111111111111111");

#[program]
pub mod baobao_paj_settlement {
    use super::*;

    /// Initialize a deterministic user trading session vault
    pub fn initialize_session(
        ctx: Context<InitializeSession>,
        session_id: u64,
        max_slippage_bps: u16,
    ) -> Result<()> {
        require!(max_slippage_bps <= 1000, ErrorCode::SlippageExceedsLimit); // Max 10%

        let session = &mut ctx.accounts.session_state;
        session.authority = ctx.accounts.authority.key();
        session.session_id = session_id;
        session.max_slippage_bps = max_slippage_bps;
        session.is_active = true;
        session.total_swapped_lamports = 0;
        session.total_tokens_received = 0;
        session.bump = ctx.bumps.session_state;

        emit!(SessionInitializedEvent {
            authority: session.authority,
            session_id,
            max_slippage_bps,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Records and verifies a programmatic swap of SOL -> BAOBAO
    pub fn record_swap_receipt(
        ctx: Context<RecordSwapReceipt>,
        lamports_in: u64,
        tokens_out: u64,
        min_tokens_expected: u64,
    ) -> Result<()> {
        let session = &mut ctx.accounts.session_state;
        require!(session.is_active, ErrorCode::SessionInactive);
        require!(tokens_out >= min_tokens_expected, ErrorCode::SlippageExceeded);

        session.total_swapped_lamports = session
            .total_swapped_lamports
            .checked_add(lamports_in)
            .ok_or(ErrorCode::MathOverflow)?;

        session.total_tokens_received = session
            .total_tokens_received
            .checked_add(tokens_out)
            .ok_or(ErrorCode::MathOverflow)?;

        let receipt = &mut ctx.accounts.receipt;
        receipt.session = session.key();
        receipt.user = ctx.accounts.authority.key();
        receipt.target_mint = ctx.accounts.target_mint.key();
        receipt.lamports_in = lamports_in;
        receipt.tokens_out = tokens_out;
        receipt.timestamp = Clock::get()?.unix_timestamp;
        receipt.bump = ctx.bumps.receipt;

        emit!(SwapExecutedEvent {
            session: session.key(),
            user: receipt.user,
            target_mint: receipt.target_mint,
            lamports_in,
            tokens_out,
            timestamp: receipt.timestamp,
        });

        Ok(())
    }

    /// Emergency close and reclaim rent
    pub fn close_session(ctx: Context<CloseSession>) -> Result<()> {
        let session = &mut ctx.accounts.session_state;
        session.is_active = false;
        Ok(())
    }
}

// -----------------------------------------------------------------------------
// ACCOUNT VALIDATION STRUCTS
// -----------------------------------------------------------------------------

#[derive(Accounts)]
#[instruction(session_id: u64)]
pub struct InitializeSession<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + SessionState::INIT_SPACE,
        seeds = [b"session", authority.key().as_ref(), session_id.to_le_bytes().as_ref()],
        bump
    )]
    pub session_state: Account<'info, SessionState>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordSwapReceipt<'info> {
    #[account(
        mut,
        has_one = authority @ ErrorCode::Unauthorized,
        seeds = [b"session", authority.key().as_ref(), session_state.session_id.to_le_bytes().as_ref()],
        bump = session_state.bump
    )]
    pub session_state: Account<'info, SessionState>,

    #[account(
        init,
        payer = authority,
        space = 8 + ExecutionReceipt::INIT_SPACE,
        seeds = [b"receipt", session_state.key().as_ref(), Clock::get().unwrap().unix_timestamp.to_le_bytes().as_ref()],
        bump
    )]
    pub receipt: Account<'info, ExecutionReceipt>,

    pub target_mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseSession<'info> {
    #[account(
        mut,
        has_one = authority @ ErrorCode::Unauthorized,
        close = authority,
        seeds = [b"session", authority.key().as_ref(), session_state.session_id.to_le_bytes().as_ref()],
        bump = session_state.bump
    )]
    pub session_state: Account<'info, SessionState>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

// -----------------------------------------------------------------------------
// STATE STORAGE
// -----------------------------------------------------------------------------

#[account]
#[derive(InitSpace)]
pub struct SessionState {
    pub authority: Pubkey,         // 32
    pub session_id: u64,           // 8
    pub max_slippage_bps: u16,     // 2
    pub is_active: bool,           // 1
    pub total_swapped_lamports: u64, // 8
    pub total_tokens_received: u64,  // 8
    pub bump: u8,                  // 1
}

#[account]
#[derive(InitSpace)]
pub struct ExecutionReceipt {
    pub session: Pubkey,       // 32
    pub user: Pubkey,          // 32
    pub target_mint: Pubkey,   // 32
    pub lamports_in: u64,      // 8
    pub tokens_out: u64,       // 8
    pub timestamp: i64,        // 8
    pub bump: u8,              // 1
}

// -----------------------------------------------------------------------------
// EVENTS & ERRORS
// -----------------------------------------------------------------------------

#[event]
pub struct SessionInitializedEvent {
    pub authority: Pubkey,
    pub session_id: u64,
    pub max_slippage_bps: u16,
    pub timestamp: i64,
}

#[event]
pub struct SwapExecutedEvent {
    pub session: Pubkey,
    pub user: Pubkey,
    pub target_mint: Pubkey,
    pub lamports_in: u64,
    pub tokens_out: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Slippage basis points exceed protocol ceiling of 1000 bps (10%)")]
    SlippageExceedsLimit,
    #[msg("Trading session is currently inactive or terminated")]
    SessionInactive,
    #[msg("Execution output below guaranteed minimum: Slippage threshold breached")]
    SlippageExceeded,
    #[msg("Arithmetic overflow during state calculation")]
    MathOverflow,
    #[msg("Unauthorized access to restricted session instruction")]
    Unauthorized,
}