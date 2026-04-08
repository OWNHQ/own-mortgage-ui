import type { H3Event } from "h3"
import { createError } from "h3"

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>
  run<T = Record<string, unknown>>(): Promise<{
    success: boolean
    results?: T[]
    meta?: Record<string, unknown>
  }>
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement
  exec(query: string): Promise<unknown>
}

export interface EligibleWalletRow {
  address: string
  voucher_code: string
  claimed_at: string | null
  created_at: string
  updated_at: string
}

export interface AuthNonceRow {
  nonce: string
  address: string
  expires_at: string
  consumed_at: string | null
}

export interface AuthSessionRow {
  session_token_hash: string
  address: string
  expires_at: string
  created_at: string
}

interface VoucherBindings {
  DB?: D1Database
}

let schemaInitializationPromise: Promise<void> | null = null

export function getVoucherBindings(event: H3Event): VoucherBindings {
  const cloudflareContext = event.context.cloudflare as { env?: VoucherBindings } | undefined
  return cloudflareContext?.env ?? {}
}

export function getVoucherDatabase(event: H3Event): D1Database | null {
  return getVoucherBindings(event).DB ?? null
}

export function isVoucherStorageConfigured(event: H3Event): boolean {
  return Boolean(getVoucherDatabase(event))
}

export function requireVoucherDatabase(event: H3Event): D1Database {
  const database = getVoucherDatabase(event)
  if (!database) {
    throw createError({
      statusCode: 503,
      statusMessage: "Conference voucher storage is not configured.",
    })
  }

  return database
}

export async function ensureVoucherSchema(event: H3Event): Promise<void> {
  const database = getVoucherDatabase(event)
  if (!database) {
    return
  }

  if (!schemaInitializationPromise) {
    schemaInitializationPromise = database.exec(`
      CREATE TABLE IF NOT EXISTS eligible_wallets (
        address TEXT PRIMARY KEY,
        voucher_code TEXT NOT NULL,
        claimed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS auth_nonces (
        nonce TEXT PRIMARY KEY,
        address TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        consumed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS auth_sessions (
        session_token_hash TEXT PRIMARY KEY,
        address TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS request_rate_limits (
        rate_key TEXT NOT NULL,
        window_start INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 1,
        expires_at INTEGER NOT NULL,
        PRIMARY KEY (rate_key, window_start)
      );
    `).then(() => undefined).catch((error) => {
      schemaInitializationPromise = null
      throw error
    })
  }

  await schemaInitializationPromise
}

export async function getEligibleWalletByAddress(
  event: H3Event,
  address: string,
): Promise<EligibleWalletRow | null> {
  const database = requireVoucherDatabase(event)

  return database
    .prepare(`
      SELECT address, voucher_code, claimed_at, created_at, updated_at
      FROM eligible_wallets
      WHERE address = ?
    `)
    .bind(address)
    .first<EligibleWalletRow>()
}

export async function upsertNonce(
  event: H3Event,
  nonce: string,
  address: string,
  expiresAt: string,
): Promise<void> {
  const database = requireVoucherDatabase(event)

  await database
    .prepare(`DELETE FROM auth_nonces WHERE address = ?`)
    .bind(address)
    .run()

  await database
    .prepare(`
      INSERT INTO auth_nonces (nonce, address, expires_at, consumed_at)
      VALUES (?, ?, ?, NULL)
    `)
    .bind(nonce, address, expiresAt)
    .run()
}

export async function getNonce(
  event: H3Event,
  nonce: string,
): Promise<AuthNonceRow | null> {
  const database = requireVoucherDatabase(event)

  return database
    .prepare(`
      SELECT nonce, address, expires_at, consumed_at
      FROM auth_nonces
      WHERE nonce = ?
    `)
    .bind(nonce)
    .first<AuthNonceRow>()
}

export async function consumeNonce(event: H3Event, nonce: string): Promise<void> {
  const database = requireVoucherDatabase(event)

  await database
    .prepare(`
      UPDATE auth_nonces
      SET consumed_at = ?
      WHERE nonce = ?
    `)
    .bind(new Date().toISOString(), nonce)
    .run()
}

export async function createSession(
  event: H3Event,
  sessionTokenHash: string,
  address: string,
  expiresAt: string,
): Promise<void> {
  const database = requireVoucherDatabase(event)

  await database
    .prepare(`
      INSERT OR REPLACE INTO auth_sessions (session_token_hash, address, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `)
    .bind(sessionTokenHash, address, expiresAt, new Date().toISOString())
    .run()
}

export async function getSessionByTokenHash(
  event: H3Event,
  sessionTokenHash: string,
): Promise<AuthSessionRow | null> {
  const database = requireVoucherDatabase(event)

  return database
    .prepare(`
      SELECT session_token_hash, address, expires_at, created_at
      FROM auth_sessions
      WHERE session_token_hash = ?
    `)
    .bind(sessionTokenHash)
    .first<AuthSessionRow>()
}

export async function deleteSessionByTokenHash(
  event: H3Event,
  sessionTokenHash: string,
): Promise<void> {
  const database = requireVoucherDatabase(event)

  await database
    .prepare(`DELETE FROM auth_sessions WHERE session_token_hash = ?`)
    .bind(sessionTokenHash)
    .run()
}

export async function markVoucherAsClaimed(
  event: H3Event,
  address: string,
): Promise<void> {
  const database = requireVoucherDatabase(event)
  const now = new Date().toISOString()

  await database
    .prepare(`
      UPDATE eligible_wallets
      SET claimed_at = COALESCE(claimed_at, ?), updated_at = ?
      WHERE address = ?
    `)
    .bind(now, now, address)
    .run()
}

export async function incrementRateLimit(
  event: H3Event,
  rateKey: string,
  windowStart: number,
  expiresAt: number,
): Promise<number> {
  const database = requireVoucherDatabase(event)

  await database
    .prepare(`
      INSERT INTO request_rate_limits (rate_key, window_start, attempts, expires_at)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(rate_key, window_start)
      DO UPDATE SET attempts = attempts + 1, expires_at = excluded.expires_at
    `)
    .bind(rateKey, windowStart, expiresAt)
    .run()

  const row = await database
    .prepare(`
      SELECT attempts
      FROM request_rate_limits
      WHERE rate_key = ? AND window_start = ?
    `)
    .bind(rateKey, windowStart)
    .first<{ attempts: number }>()

  return row?.attempts ?? 0
}
