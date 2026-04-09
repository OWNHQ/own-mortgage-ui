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
