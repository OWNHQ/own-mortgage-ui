<template>
    <div>
        <div class="mb-4">
            <p class="mb-2 text-sm sm:text-base text-justify">
                This graph illustrates the loan repayment dynamics and default risk over time.
            </p>
            <ul class="list-disc list-inside space-y-1 text-xs sm:text-sm">
                <li>
                    <span class="font-semibold">Minimal Repayment Path</span>
                    Displays the minimum cumulative repayment required over time to keep the loan from defaulting. 
                    The line begins at zero and increases as the required payments are made. 
                    If the borrower fails to meet these minimum payments at any point, the loan goes into default and the collateral can be liquidated.

                </li>
            </ul>
            <p class="mt-2 text-xs italic text-gray-2">
                During the grace period (first {{ POSTPONEMENT_IN_MONTHS }} months), no repayments are required. After this period, repayments must be made to keep the debt below the liquidation threshold.
            </p>
        </div>
        <Line :data="data" :options="options" />
    </div>
</template>
  
<script setup lang="ts">
import Decimal from "decimal.js";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  type TooltipItem
} from 'chart.js'
import { Line } from 'vue-chartjs'
import { POSTPONEMENT_IN_MONTHS, LOAN_DURATION_IN_MONTHS, TOTAL_AMOUNT_TO_REPAY, CREDIT_NAME } from '~/constants/proposalConstants'

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, LinearScale, CategoryScale)

// Build f(t) (limit line)
const labels = Array.from({ length: LOAN_DURATION_IN_MONTHS + 1 }, (_, i) => `${i}m`)

// Build minimal repayment line (cumulative repayments - starts at 0)
const repaymentData = labels.map((_, month) => {
  if (month <= POSTPONEMENT_IN_MONTHS) {
    return 0 // no repayments during grace period
  } else {
    const remainingMonths = LOAN_DURATION_IN_MONTHS - POSTPONEMENT_IN_MONTHS
    const monthsIntoRepayment = month - POSTPONEMENT_IN_MONTHS
    const monthlyPayment = TOTAL_AMOUNT_TO_REPAY.div(new Decimal(remainingMonths))
    return monthlyPayment.mul(new Decimal(monthsIntoRepayment)) // cumulative amount repaid
  }
})

const data = {
  labels,
  datasets: [
    {
      label: 'Minimal Repayment Path',
      data: repaymentData,
      borderColor: '#10b981',
      borderDash: [],
      borderWidth: 2,
      fill: false,
      tension: 0,      // straight line segments
      pointRadius: 0,  // <-- disables points
      hoverRadius: 5,  // radius when hovering
    }
  ]
}

const options = {
  responsive: true,
  plugins: {
    tooltip: {
      mode: 'nearest' as const,     // tooltip triggers on nearest point
      intersect: false,     // allow tooltip even if cursor is not exactly on the line
      callbacks: {
        label: (context: TooltipItem<'line'>) => {
          const value = Math.round(context.parsed.y)
          const formattedValue = value.toLocaleString('en-US')
          return `${context.dataset.label}: ${formattedValue} ${CREDIT_NAME}`
        }
      }
    }
  },
  interaction: {
    mode: 'nearest' as const,      // same as tooltip
    intersect: false,     // important to trigger on nearby
    axis: 'x' as const             // only consider horizontal distance
  },
  scales: {
    y: {
      title: {
        display: true,
        text: `Amount (${CREDIT_NAME})`
      },
      beginAtZero: true
    },
    x: {
      title: {
        display: true,
        text: 'Months'
      }
    }
  }
}
</script>
