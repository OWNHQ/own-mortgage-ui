const SECONDS_IN_YEAR = 365n * 24n * 60n * 60n

type PaymentDeadlineInput = {
    principal: bigint
    pastAccruedInterest: bigint
    lastUpdateTimestamp: bigint
    apr: bigint
    aprDecimals: bigint
    defaultTimestamp: bigint
    debtLimitTangent: bigint
    debtLimitTangentDecimals: bigint
    currentTimestamp: bigint
}

const pow10 = (decimals: bigint) => 10n ** decimals

const accruedInterestAt = (input: PaymentDeadlineInput, timestamp: bigint): bigint => {
    if (timestamp < input.lastUpdateTimestamp) return 0n

    const elapsed = timestamp - input.lastUpdateTimestamp
    const yearlyApr = (input.apr * elapsed) / SECONDS_IN_YEAR

    return (input.principal * yearlyApr) / pow10(input.aprDecimals)
}

const debtAt = (input: PaymentDeadlineInput, timestamp: bigint): bigint => {
    return input.principal + input.pastAccruedInterest + accruedInterestAt(input, timestamp)
}

const defaultDebtLimitAt = (input: PaymentDeadlineInput, timestamp: bigint): bigint => {
    if (timestamp >= input.defaultTimestamp) return 0n

    return (input.debtLimitTangent * (input.defaultTimestamp - timestamp)) / pow10(input.debtLimitTangentDecimals)
}

const isUnsafeAt = (input: PaymentDeadlineInput, timestamp: bigint): boolean => {
    return debtAt(input, timestamp) > defaultDebtLimitAt(input, timestamp)
}

const findFirstUnsafeTimestamp = (input: PaymentDeadlineInput, low: bigint, high: bigint): bigint => {
    let left = low
    let right = high

    while (left < right) {
        const mid = (left + right) / 2n

        if (isUnsafeAt(input, mid)) {
            right = mid
        } else {
            left = mid + 1n
        }
    }

    return left
}

export const calculateNextPaymentDeadline = (input: PaymentDeadlineInput): bigint | null => {
    if (input.principal + input.pastAccruedInterest === 0n) return null
    if (input.defaultTimestamp === 0n || input.debtLimitTangent === 0n) return null

    const currentTimestamp = input.currentTimestamp < input.lastUpdateTimestamp
        ? input.lastUpdateTimestamp
        : input.currentTimestamp

    if (currentTimestamp >= input.defaultTimestamp) return null

    if (isUnsafeAt(input, currentTimestamp)) {
        return findFirstUnsafeTimestamp(input, input.lastUpdateTimestamp, currentTimestamp)
    }

    return findFirstUnsafeTimestamp(input, currentTimestamp, input.defaultTimestamp)
}
