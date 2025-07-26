import type { FinancialData, FinancialState, CalculatedStep } from "@/types/financial"

export function calculateFinancialFlow(data: FinancialData): CalculatedStep[] {
  const steps: CalculatedStep[] = []
  let currentAmount = data.monthly_income

  // Add initial income
  steps.push({
    name: "Monthly Income",
    value: currentAmount,
    type: "income",
    level: 0,
    remaining: currentAmount,
  })

  // Process Total Income step (outflows from Monthly Income)
  const totalIncomeStep = data.steps["Total Income"]
  if (totalIncomeStep.outflow) {
    // Calculate pre-tax deductions
    const preTaxDeductions = totalIncomeStep.outflow["Pre-Tax Deductions"]
    if (preTaxDeductions?.breakdown) {
      const preTaxTotal = Object.values(preTaxDeductions.breakdown).reduce((sum, val) => sum + Number(val), 0)
      currentAmount -= preTaxTotal
      steps.push({
        name: "Pre-Tax Deductions",
        value: preTaxTotal,
        type: "deduction",
        categoryType: preTaxDeductions.type,
        level: 1,
        breakdown: preTaxDeductions.breakdown,
        remaining: currentAmount,
      })
    }

    // Calculate taxes
    const taxes = totalIncomeStep.outflow["Taxes"]
    if (taxes?.breakdown) {
      const taxTotal = Object.values(taxes.breakdown).reduce((sum, val) => sum + Number(val), 0)
      currentAmount -= taxTotal
      steps.push({
        name: "Taxes",
        value: taxTotal,
        type: "deduction",
        categoryType: taxes.type,
        level: 1,
        breakdown: taxes.breakdown,
        remaining: currentAmount,
      })
    }
  }

  // Add Takehome checkpoint
  steps.push({
    name: "Takehome",
    value: currentAmount,
    type: "checkpoint",
    level: 0,
    remaining: currentAmount,
  })

  // Process Takehome outflows
  const takehomeStep = data.steps["Takehome"]
  if (takehomeStep.outflow) {
    const fixedSpend = takehomeStep.outflow["Fixed Spend"]
    if (fixedSpend?.breakdown) {
      const fixedTotal = Object.values(fixedSpend.breakdown).reduce((sum, val) => sum + Number(val), 0)
      currentAmount -= fixedTotal
      steps.push({
        name: "Fixed Spend",
        value: fixedTotal,
        type: "deduction",
        categoryType: fixedSpend.type,
        level: 1,
        breakdown: fixedSpend.breakdown,
        remaining: currentAmount,
      })
    }
  }

  // Add Free Cash checkpoint
  steps.push({
    name: "Free Cash",
    value: currentAmount,
    type: "checkpoint",
    level: 0,
    remaining: currentAmount,
  })

  // Process Free Cash outflows
  const freeCashStep = data.steps["Free Cash"]
  if (freeCashStep.outflow) {
    const variableSpend = freeCashStep.outflow["Variable Spend"]
    if (variableSpend?.breakdown) {
      const variableTotal = Object.values(variableSpend.breakdown).reduce((sum, val) => sum + Number(val), 0)
      currentAmount -= variableTotal
      steps.push({
        name: "Variable Spend",
        value: variableTotal,
        type: "deduction",
        categoryType: variableSpend.type,
        level: 1,
        breakdown: variableSpend.breakdown,
        remaining: currentAmount,
      })
    }
  }

  // Add Net Income checkpoint
  steps.push({
    name: "Net Income",
    value: currentAmount,
    type: "checkpoint",
    level: 0,
    remaining: currentAmount,
  })

  // Process Net Income outflows
  const netIncomeStep = data.steps["Net Income"]
  if (netIncomeStep.outflow) {
    // Investments
    const investments = netIncomeStep.outflow["Investments"]
    if (investments?.breakdown) {
      const investmentTotal = Object.values(investments.breakdown).reduce((sum, val) => sum + Number(val), 0)
      currentAmount -= investmentTotal
      steps.push({
        name: "Investments",
        value: investmentTotal,
        type: "deduction",
        categoryType: investments.type,
        level: 1,
        breakdown: investments.breakdown,
        remaining: currentAmount,
      })
    }

    // Emergency Fund
    const emergencyFund = netIncomeStep.outflow["Emergency Fund"]
    if (emergencyFund?.breakdown) {
      const emergencyTotal = Object.values(emergencyFund.breakdown).reduce((sum, val) => sum + Number(val), 0)
      currentAmount -= emergencyTotal
      steps.push({
        name: "Emergency Fund",
        value: emergencyTotal,
        type: "deduction",
        categoryType: emergencyFund.type,
        level: 1,
        breakdown: emergencyFund.breakdown,
        remaining: currentAmount,
      })
    }
  }

  // Add final surplus
  steps.push({
    name: "True Surplus",
    value: currentAmount,
    type: "checkpoint",
    level: 0,
    remaining: currentAmount,
  })

  return steps
}

export function createFinancialState(data: FinancialData): FinancialState {
  const calculatedSteps = calculateFinancialFlow(data)
  const isIllegal = calculatedSteps.some((step) => step.remaining < 0)

  return {
    data,
    calculatedSteps,
    isIllegalState: isIllegal,
    undoStack: [],
    redoStack: [],
  }
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents)
}

export function generateNetWorthProjection(state: FinancialState, months = 60) {
  const data = []
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - 30)

  let currentNetWorth = 50000

  // Find monthly savings from investment categories
  const investmentSteps = state.calculatedSteps.filter((step) => step.categoryType === "investment")
  const monthlySavings = investmentSteps.reduce((sum, step) => sum + step.value, 0)

  for (let i = 0; i < months; i++) {
    const date = new Date(startDate)
    date.setMonth(date.getMonth() + i)

    currentNetWorth += monthlySavings

    if (i < 30) {
      currentNetWorth += (Math.random() - 0.5) * 2000
    }

    data.push({
      month: date.toISOString().slice(0, 7),
      value: currentNetWorth * 100, // Convert to cents for consistency
      events:
        i === 35
          ? [
              {
                type: "windfall" as const,
                description: "Tax Refund",
                icon: "💸",
              },
            ]
          : undefined,
    })
  }

  return data
}
