import type { H3Event } from "h3"
import {
  deleteCookie,
  getCookie,
  getRequestHost,
  getRequestIP,
  getRequestProtocol,
  setCookie,
} from "h3"
import {
  VOUCHER_DEFAULT_CHAIN_ID,
  VOUCHER_SESSION_COOKIE_NAME,
  VOUCHER_SESSION_TTL_SECONDS,
} from "./constants"

export function getVoucherRequestHost(event: H3Event): string {
  return getRequestHost(event, { xForwardedHost: true })
}

export function getVoucherRequestProtocol(event: H3Event): "http" | "https" {
  return getRequestProtocol(event) === "https" ? "https" : "http"
}

export function getVoucherRequestOrigin(event: H3Event): string {
  return `${getVoucherRequestProtocol(event)}://${getVoucherRequestHost(event)}`
}

export function getVoucherClaimUri(event: H3Event): string {
  return `${getVoucherRequestOrigin(event)}/conference-voucher`
}

export function getVoucherChainId(event: H3Event): number {
  const cloudflareEnv = (event.context.cloudflare as { env?: Record<string, unknown> } | undefined)?.env
  const rawChainId = cloudflareEnv?.VOUCHER_SIWE_CHAIN_ID
    ?? process.env.NUXT_VOUCHER_SIWE_CHAIN_ID
    ?? process.env.VOUCHER_SIWE_CHAIN_ID

  const parsedChainId = Number(rawChainId)
  return Number.isInteger(parsedChainId) && parsedChainId > 0 ? parsedChainId : VOUCHER_DEFAULT_CHAIN_ID
}

export function getVoucherSessionCookie(event: H3Event): string | undefined {
  return getCookie(event, VOUCHER_SESSION_COOKIE_NAME) ?? undefined
}

export function setVoucherSessionCookie(event: H3Event, token: string): void {
  setCookie(event, VOUCHER_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: VOUCHER_SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: getVoucherRequestProtocol(event) === "https",
  })
}

export function clearVoucherSessionCookie(event: H3Event): void {
  deleteCookie(event, VOUCHER_SESSION_COOKIE_NAME, {
    path: "/",
  })
}

export function getClientIp(event: H3Event): string {
  return getRequestIP(event, { xForwardedFor: true }) ?? "unknown"
}
