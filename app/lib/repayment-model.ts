import Decimal from 'decimal.js'

export const REPAYMENT_YEAR_IN_SECONDS = 365 * 24 * 60 * 60
export const REPAYMENT_MONTH_IN_SECONDS = REPAYMENT_YEAR_IN_SECONDS / 12

export type AmortizedRepaymentPlan = {
  balanceAfterHoliday: number
  monthlyPayment: number
  paymentCount: number
  totalInterest: number
  totalRepayment: number
}

type AmortizedRepaymentInput = {
  annualRate: number
  holidayMonths: number
  paymentCount: number
  principal: number
}

type LenderAprInput = {
  capitalSupplied: number
  holidayMonths: number
  monthlyPayment: number
  paymentCount: number
}

type RepaymentModelTerms = {
  annualRate: number
  durationSeconds: number
  postponementSeconds: number
  principal: number
}

type ScheduledRepaymentInput = RepaymentModelTerms & {
  elapsedSeconds: number
}

function repaymentPeriodSeconds(terms: RepaymentModelTerms) {
  return Math.max(1, terms.durationSeconds - terms.postponementSeconds)
}

export function calculateZeroRepaymentWindowSeconds(terms: RepaymentModelTerms) {
  const repaymentPeriod = repaymentPeriodSeconds(terms)
  const numerator = terms.postponementSeconds / repaymentPeriod
  const denominator = terms.annualRate / REPAYMENT_YEAR_IN_SECONDS + 1 / repaymentPeriod
  return numerator / denominator
}

export function calculateScheduledRepaymentAmount(input: ScheduledRepaymentInput) {
  const zeroRepaymentWindow = calculateZeroRepaymentWindowSeconds(input)
  if (input.elapsedSeconds <= zeroRepaymentWindow) return 0

  const elapsedSeconds = Math.min(input.durationSeconds, Math.max(0, input.elapsedSeconds))
  const debtLimit = input.principal
    * (input.durationSeconds - elapsedSeconds)
    / repaymentPeriodSeconds(input)
  const debtWithoutRepayment = input.principal
    * (1 + input.annualRate * elapsedSeconds / REPAYMENT_YEAR_IN_SECONDS)

  return Math.max(0, debtWithoutRepayment - debtLimit)
}

export function calculateModeledMonthlyRepayment(terms: RepaymentModelTerms) {
  const repaymentStart = calculateZeroRepaymentWindowSeconds(terms)
  return calculateScheduledRepaymentAmount({
    ...terms,
    elapsedSeconds: repaymentStart + REPAYMENT_MONTH_IN_SECONDS,
  })
}

/**
 * Conventional fixed-payment estimate. Interest compounds monthly throughout
 * the payment holiday, then the resulting balance amortizes over equal monthly
 * payments. PWN permits irregular and early repayments, so this is a projection
 * rather than a contract-enforced installment schedule.
 */
export function calculateAmortizedRepaymentPlan(input: AmortizedRepaymentInput): AmortizedRepaymentPlan {
  const principal = new Decimal(Math.max(0, input.principal))
  const annualRate = new Decimal(Math.max(0, input.annualRate))
  const holidayMonths = Math.max(0, Math.round(input.holidayMonths))
  const paymentCount = Math.max(0, Math.round(input.paymentCount))

  if (!principal.isFinite() || !annualRate.isFinite() || principal.isZero() || paymentCount === 0) {
    return {
      balanceAfterHoliday: 0,
      monthlyPayment: 0,
      paymentCount,
      totalInterest: 0,
      totalRepayment: 0,
    }
  }

  const monthlyRate = annualRate.div(12)
  const balanceAfterHoliday = principal.mul(monthlyRate.add(1).pow(holidayMonths))
  const monthlyPayment = monthlyRate.isZero()
    ? balanceAfterHoliday.div(paymentCount)
    : balanceAfterHoliday
        .mul(monthlyRate)
        .div(new Decimal(1).minus(monthlyRate.add(1).pow(-paymentCount)))
  const totalRepayment = monthlyPayment.mul(paymentCount)

  return {
    balanceAfterHoliday: balanceAfterHoliday.toNumber(),
    monthlyPayment: monthlyPayment.toNumber(),
    paymentCount,
    totalInterest: totalRepayment.minus(principal).toNumber(),
    totalRepayment: totalRepayment.toNumber(),
  }
}

export function calculateAmortizedCumulativeRepayment(
  plan: AmortizedRepaymentPlan,
  completedPayments: number,
) {
  const paidInstallments = Math.min(plan.paymentCount, Math.max(0, completedPayments))
  return new Decimal(plan.monthlyPayment).mul(paidInstallments).toNumber()
}

/**
 * Nominal annual lender return implied by a delayed, level monthly cashflow.
 * This is an IRR calculation rather than a simple interest multiple, so it
 * accounts for principal being returned throughout the repayment period.
 */
export function calculateLenderNominalApr(input: LenderAprInput) {
  const capitalSupplied = Math.max(0, input.capitalSupplied)
  const holidayMonths = Math.max(0, Math.round(input.holidayMonths))
  const monthlyPayment = Math.max(0, input.monthlyPayment)
  const paymentCount = Math.max(0, Math.round(input.paymentCount))

  if (
    !Number.isFinite(capitalSupplied)
    || !Number.isFinite(monthlyPayment)
    || capitalSupplied === 0
    || monthlyPayment === 0
    || paymentCount === 0
  ) return 0

  const netPresentValue = (monthlyRate: number) => {
    let value = -capitalSupplied

    for (let paymentIndex = 1; paymentIndex <= paymentCount; paymentIndex += 1) {
      value += monthlyPayment / (1 + monthlyRate) ** (holidayMonths + paymentIndex)
    }

    return value
  }

  // This UI only presents a positive lender APR. A non-positive cashflow does
  // not have a positive root in the interval below.
  if (netPresentValue(0) <= 0) return 0

  let lowerRate = 0
  let upperRate = 1

  for (let iteration = 0; iteration < 100; iteration += 1) {
    const midpoint = (lowerRate + upperRate) / 2

    if (netPresentValue(midpoint) > 0) lowerRate = midpoint
    else upperRate = midpoint
  }

  return ((lowerRate + upperRate) / 2) * 12
}
