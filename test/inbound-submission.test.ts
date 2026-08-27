import {
  describe,
  expect,
  test,
} from "bun:test"
import {
  INBOUND_CONTACT_MAX_LENGTH,
  INBOUND_MESSAGE_MAX_LENGTH,
  buildBorrowerSubmission,
} from "../app/utils/inboundSubmission"

describe("borrower inbound submission", () => {
  test("maps the form into the shared gateway contract", () => {
    expect(buildBorrowerSubmission({
      commsChannel: "borrower@example.com",
      projectDescription: "Finance a hackerspace.",
      pageSource: "https://loan.bordel.wtf/",
      gotcha: "",
    })).toEqual({
      contact: "borrower@example.com",
      role: "Borrower",
      rawRole: "Borrower",
      message: "Finance a hackerspace.",
      pageSource: "https://loan.bordel.wtf/",
      _gotcha: "",
    })
  })

  test("exports the form limits enforced by the gateway", () => {
    expect(INBOUND_CONTACT_MAX_LENGTH).toBe(320)
    expect(INBOUND_MESSAGE_MAX_LENGTH).toBe(10_000)
  })
})
