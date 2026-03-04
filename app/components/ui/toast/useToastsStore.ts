import { POSITION, TYPE, useToast } from 'vue-toastification'
import type { ToastContent, ToastOptions } from 'vue-toastification/dist/types/types'
import BaseToast from '~/components/ui/toast/BaseToast.vue'
import { defineStore } from 'pinia'
import { computed, markRaw, ref } from 'vue'
import type { Component } from 'vue'
import type { Address, Hex } from 'viem'
import type { PartialWithRequired } from '@/typing/customTypes'
import { typeSafeObjectKeys } from '@/typing/typescriptWrappers'
import type { PROPOSAL_CHAIN_ID } from '~/constants/proposalConstants'

export enum ToastActionEnum {
  DEPOSIT = 'DEPOSIT',
  ACCEPT_PROPOSAL = 'ACCEPT_PROPOSAL',
  REPAY = 'REPAY',
  WITHDRAW_LENDER = 'WITHDRAW_LENDER',
}

const _actionIdToUniqueToastId = {
  [ToastActionEnum.DEPOSIT]: (amount: string, userAddress: Address) => `${ToastActionEnum.DEPOSIT}_${userAddress}_${amount}`,
  [ToastActionEnum.ACCEPT_PROPOSAL]: (creditAmount: string, userAddress: Address) => `${ToastActionEnum.ACCEPT_PROPOSAL}_${userAddress}_${creditAmount}`,
  [ToastActionEnum.REPAY]: (repaymentAmount: string, userAddress: Address) => `${ToastActionEnum.REPAY}_${userAddress}_${repaymentAmount}`,
  [ToastActionEnum.WITHDRAW_LENDER]: (userAddress: Address) => `${ToastActionEnum.WITHDRAW_LENDER}_${userAddress}`,
} as const

export type ToastActionId = keyof typeof _actionIdToUniqueToastId
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TOAST_ACTION_ID_TO_UNIQUE_ID_FN = _actionIdToUniqueToastId satisfies Record<ToastActionId, (...args: any[]) => string>
export const TOAST_ACTION_IDS = typeSafeObjectKeys(TOAST_ACTION_ID_TO_UNIQUE_ID_FN)

export enum ToastStepStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  INACTIVE = 'INACTIVE',
}

export class ToastStep {
  text: string
  error?: Error
  fn: (step: ToastStep) => Promise<boolean> // can also throw exception
  status: ToastStepStatus
  txHash?: Hex
  isRunningLong?: boolean

  constructor(step: PartialWithRequired<ToastStep, 'text' | 'fn'>) {
    this.text = step.text
    this.error = step.error
    this.fn = step.fn
    this.status = step.status || ToastStepStatus.INACTIVE
    this.txHash = step.txHash
    this.isRunningLong = step.isRunningLong ?? false
  }
}

interface CreateToast {
  steps: ToastStep[]
  chainId: typeof PROPOSAL_CHAIN_ID | undefined
  title: string
  // firstAsset?: Asset
  // secondAsset?: Asset
  customImage?: Component
  customBottomComponent?: Component
  isAlwaysClosable?: boolean
  hideFooter?: boolean
}

export class Toast<ToastAction extends ToastActionId = ToastActionId> {
  id: string
  steps: ToastStep[]
  chainId: typeof PROPOSAL_CHAIN_ID | undefined
  title: string
  created: string
  stepToPerform: number // starting from 0
  // firstAsset?: Asset
  // secondAsset?: Asset
  customImage?: Component
  customBottomComponent?: Component
  isAlwaysClosable?: boolean
  hideFooter?: boolean
  _toastOptions?: ToastOptions
  _initInActionFlow?: boolean

  // additionalParameters are corresponding to the parameters needed to pass to the TOAST_ACTION_ID_TO_UNIQUE_ID_FN[action] to get unique notification id
  constructor(toast: CreateToast, action: ToastAction, ...additionalParameters: (ToastAction extends ToastActionId ? Parameters<typeof TOAST_ACTION_ID_TO_UNIQUE_ID_FN[ToastAction]> : never)) {
    // @ts-expect-error not sure why it throws type error, but should work fine
    this.id = TOAST_ACTION_ID_TO_UNIQUE_ID_FN[action](...additionalParameters)

    this.steps = toast.steps.map(step => new ToastStep(step))
    this.chainId = toast.chainId
    this.title = toast.title
    this.created = new Intl.DateTimeFormat('en-US', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date())
    this.stepToPerform = 0
    // this.firstAsset = toast.firstAsset
    // this.secondAsset = toast.secondAsset
    this.customImage = toast.customImage ? markRaw(toast.customImage) : undefined
    this._initInActionFlow = false
    this.customBottomComponent = toast.customBottomComponent
    this.isAlwaysClosable = toast.isAlwaysClosable ?? false
    this.hideFooter = toast.hideFooter ?? false
  }
}

// TODO we used a few special notifications in the past:
// 1) likely rpc issue notification
// 2) user rejected tx notification
export const useToastsStore = defineStore('toasts', () => {
  const toastification = useToast()

  const displayedToasts = ref<Toast[]>([])
  const customBottomComponent = ref<Component | undefined>(undefined)

  function getToast(toastId: string): Toast | undefined {
    return displayedToasts.value.find(displayedToast => displayedToast.id === toastId)
  }

  function displayToast(toast: Toast): void {
    const toastOptions: ToastOptions = {
      id: toast.id, // overriding default toast id
      type: TYPE.INFO,
      closeButton: false,
      timeout: false,
      draggable: false,
      position: POSITION.BOTTOM_RIGHT,
      onClose() {
        const toastToDismissIndex = displayedToasts.value.findIndex(displayedToast => displayedToast.id === toast.id)
        if (toastToDismissIndex === -1) {
          return
        }

        displayedToasts.value.splice(toastToDismissIndex, 1)
      },
    }
    toast._toastOptions = toastOptions
    const toastContent: ToastContent = {
      component: BaseToast,
      props: {
        toastId: toast.id,
      },
    }
    displayedToasts.value.push(toast)
    toastification(toastContent, toastOptions)
  }

  return {
    displayedToasts: computed(() => displayedToasts.value),
    displayToast,
    getToast,
    customBottomComponent,
  }
})
