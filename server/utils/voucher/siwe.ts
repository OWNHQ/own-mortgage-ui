import type { H3Event } from "h3"
import { hashMessage, createPublicClient, http, parseAbi } from "viem"
import { mainnet, sepolia } from "viem/chains"
import { SiweMessage } from "siwe"
import {
  ERC1271_MAGIC_VALUE,
  VOUCHER_NONCE_TTL_SECONDS,
  VOUCHER_SIWE_STATEMENT,
  VOUCHER_SIWE_VERSION,
} from "./constants"
import { getVoucherChainId, getVoucherClaimUri, getVoucherRequestHost } from "./http"
import { createFutureIsoTimestamp, normalizeWalletAddress } from "./security"

const erc1271Abi = parseAbi([
  "function isValidSignature(bytes32 _hash, bytes _signature) view returns (bytes4 magicValue)",
])

function getChainById(chainId: number) {
  if (chainId === mainnet.id) {
    return mainnet
  }

  if (chainId === sepolia.id) {
    return sepolia
  }

  return undefined
}

async function verifyContractWalletSignature(
  address: string,
  message: SiweMessage,
  signature: string,
): Promise<boolean> {
  const chain = getChainById(message.chainId)
  if (!chain) {
    return false
  }

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  })

  const contractCode = await publicClient.getCode({ address: address as `0x${string}` })
  if (!contractCode || contractCode === "0x") {
    return false
  }

  try {
    const result = await publicClient.readContract({
      address: address as `0x${string}`,
      abi: erc1271Abi,
      functionName: "isValidSignature",
      args: [hashMessage(message.prepareMessage()), signature as `0x${string}`],
    })

    return result === ERC1271_MAGIC_VALUE
  } catch {
    return false
  }
}

export function createVoucherSiweMessage(event: H3Event, address: string, nonce: string): {
  expiresAt: string
  message: string
} {
  const expiresAt = createFutureIsoTimestamp(VOUCHER_NONCE_TTL_SECONDS)
  const siweMessage = new SiweMessage({
    address,
    chainId: getVoucherChainId(event),
    domain: getVoucherRequestHost(event),
    expirationTime: expiresAt,
    issuedAt: new Date().toISOString(),
    nonce,
    statement: VOUCHER_SIWE_STATEMENT,
    uri: getVoucherClaimUri(event),
    version: VOUCHER_SIWE_VERSION,
  })

  return {
    expiresAt,
    message: siweMessage.prepareMessage(),
  }
}

export async function verifyVoucherSiweMessage(
  event: H3Event,
  rawMessage: string,
  signature: string,
  expectedNonce: string,
  expectedAddress: string,
): Promise<boolean> {
  const siweMessage = new SiweMessage(rawMessage)
  const normalizedMessageAddress = normalizeWalletAddress(siweMessage.address)

  if (normalizedMessageAddress !== expectedAddress) {
    return false
  }

  if (siweMessage.chainId !== getVoucherChainId(event)) {
    return false
  }

  if (siweMessage.uri !== getVoucherClaimUri(event)) {
    return false
  }

  if (siweMessage.statement !== VOUCHER_SIWE_STATEMENT) {
    return false
  }

  const verification = await siweMessage.verify(
    {
      domain: getVoucherRequestHost(event),
      nonce: expectedNonce,
      signature,
      time: new Date().toISOString(),
    },
    {
      suppressExceptions: true,
      verificationFallback: async () => {
        const isValidContractSignature = await verifyContractWalletSignature(
          expectedAddress,
          siweMessage,
          signature,
        )

        return {
          data: siweMessage,
          success: isValidContractSignature,
        }
      },
    },
  )

  return verification.success
}
