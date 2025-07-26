export interface BreakdownItem {
  [key: string]: string | number
}

export interface FlowStep {
  value: number | "[calculated]"
  type?: "investment" | "spend"
  outflow?: {
    [key: string]: FlowStep
  }
  breakdown?: BreakdownItem
}

export interface FinancialData {
  monthly_income: number
  one_time_spend: {
    value: number | "[calculated]"
    breakdown: BreakdownItem
  }
  steps: {
    [key: string]: FlowStep
  }
}

export interface CalculatedStep {
  name: string
  value: number
  type: "income" | "deduction" | "checkpoint"
  categoryType?: "investment" | "spend"
  level: number
  breakdown?: BreakdownItem
  remaining: number
}

export interface FinancialState {
  data: FinancialData
  calculatedSteps: CalculatedStep[]
  isIllegalState: boolean
  undoStack: FinancialState[]
  redoStack: FinancialState[]
  pendingScenario?: {
    changes: ScenarioChange[]
    previewState: FinancialState
  }
}

export interface ScenarioChange {
  stepName: string
  itemName?: string
  delta: number
  type: "recurring" | "one_time"
  description: string
}

export interface NetWorthDataPoint {
  month: string
  value: number
  events?: Array<{
    type: "windfall" | "expense" | "milestone"
    description: string
    icon: string
  }>
}
