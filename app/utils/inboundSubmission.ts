export const INBOUND_CONTACT_MAX_LENGTH = 320
export const INBOUND_MESSAGE_MAX_LENGTH = 10_000

export type BorrowerSubmissionInput = {
  commsChannel: string
  projectDescription: string
  pageSource: string
  gotcha: string
}

export function buildBorrowerSubmission(input: BorrowerSubmissionInput) {
  return {
    contact: input.commsChannel,
    role: "Borrower",
    rawRole: "Borrower",
    message: input.projectDescription,
    pageSource: input.pageSource,
    _gotcha: input.gotcha,
  }
}
