"use client"

import type React from "react"
import { createContext, useContext, useReducer, type ReactNode } from "react"
import type { FinancialState, FinancialData, ScenarioChange } from "@/types/financial"
import { createFinancialState } from "@/lib/financial-calculator"

const initialData: FinancialData = {
  monthly_income: 5666,
  one_time_spend: {
    value: "[calculated]",
    breakdown: {
      Vacation: 1000,
      Laptop: 2000,
    },
  },
  steps: {
    "Total Income": {
      value: "[calculated]",
      outflow: {
        "Pre-Tax Deductions": {
          value: "[calculated]",
          type: "investment",
          breakdown: {
            "Employer 401K": 500,
          },
        },
        Taxes: {
          value: "[calculated]",
          type: "spend",
          breakdown: {
            Federal: 1000,
            State: 100,
          },
        },
      },
    },
    Takehome: {
      value: "[calculated]",
      outflow: {
        "Fixed Spend": {
          value: "[calculated]",
          type: "spend",
          breakdown: {
            Rent: 2000,
            Utilities: 150,
            Insurance: 200,
            "Car Payment": 500,
          },
        },
      },
    },
    "Free Cash": {
      value: "[calculated]",
      outflow: {
        "Variable Spend": {
          value: "[calculated]",
          type: "spend",
          breakdown: {
            Groceries: 100,
            Restaurants: 100,
            Entertainment: 100,
            Other: 100,
          },
        },
      },
    },
    "Net Income": {
      value: "[calculated]",
      outflow: {
        Investments: {
          value: "[calculated]",
          type: "investment",
          breakdown: {
            "Long Term Taxable": 100,
            "Roth IRA": 100,
          },
        },
        "Emergency Fund": {
          value: "[calculated]",
          type: "investment",
          breakdown: {
            "Emergency Fund": 1000,
          },
        },
      },
    },
  },
}

type FinancialAction =
  | { type: "UPDATE_BREAKDOWN_ITEM"; stepName: string; itemName: string; value: number }
  | { type: "ADD_BREAKDOWN_ITEM"; stepName: string; itemName: string; value: number }
  | { type: "REMOVE_BREAKDOWN_ITEM"; stepName: string; itemName: string }
  | { type: "RENAME_BREAKDOWN_ITEM"; stepName: string; oldName: string; newName: string }
  | { type: "UPDATE_MONTHLY_INCOME"; value: number }
  | { type: "APPLY_SCENARIO"; changes: ScenarioChange[] }
  | { type: "PREVIEW_SCENARIO"; changes: ScenarioChange[] }
  | { type: "CLEAR_PREVIEW" }
  | { type: "UNDO" }
  | { type: "REDO" }

function updateBreakdownItem(data: FinancialData, stepName: string, itemName: string, value: number): FinancialData {
  const newData = JSON.parse(JSON.stringify(data)) // Deep clone

  if (stepName === "one_time_spend") {
    if (newData.one_time_spend.breakdown) {
      newData.one_time_spend.breakdown[itemName] = value
      // Recalculate total
      newData.one_time_spend.value = Object.values(newData.one_time_spend.breakdown).reduce(
        (sum, val) => sum + Number(val),
        0,
      )
    }
    return newData
  }

  // Find the step in the nested structure
  function findAndUpdateStep(steps: any, targetName: string): boolean {
    for (const [name, step] of Object.entries(steps)) {
      if (name === targetName && step && typeof step === "object") {
        if ("breakdown" in step && step.breakdown) {
          step.breakdown[itemName] = value
          return true
        }
      }
      if (step && typeof step === "object" && "outflow" in step && step.outflow) {
        if (findAndUpdateStep(step.outflow, targetName)) {
          return true
        }
      }
    }
    return false
  }

  findAndUpdateStep(newData.steps, stepName)
  return newData
}

function addBreakdownItem(data: FinancialData, stepName: string, itemName: string, value: number): FinancialData {
  const newData = JSON.parse(JSON.stringify(data))

  if (stepName === "one_time_spend") {
    newData.one_time_spend.breakdown[itemName] = value
    newData.one_time_spend.value = Object.values(newData.one_time_spend.breakdown).reduce(
      (sum, val) => sum + Number(val),
      0,
    )
    return newData
  }

  function findAndAddToStep(steps: any, targetName: string): boolean {
    for (const [name, step] of Object.entries(steps)) {
      if (name === targetName && step && typeof step === "object") {
        if ("breakdown" in step && step.breakdown) {
          step.breakdown[itemName] = value
          return true
        }
      }
      if (step && typeof step === "object" && "outflow" in step && step.outflow) {
        if (findAndAddToStep(step.outflow, targetName)) {
          return true
        }
      }
    }
    return false
  }

  findAndAddToStep(newData.steps, stepName)
  return newData
}

function removeBreakdownItem(data: FinancialData, stepName: string, itemName: string): FinancialData {
  const newData = JSON.parse(JSON.stringify(data))

  if (stepName === "one_time_spend") {
    delete newData.one_time_spend.breakdown[itemName]
    newData.one_time_spend.value = Object.values(newData.one_time_spend.breakdown).reduce(
      (sum, val) => sum + Number(val),
      0,
    )
    return newData
  }

  function findAndRemoveFromStep(steps: any, targetName: string): boolean {
    for (const [name, step] of Object.entries(steps)) {
      if (name === targetName && step && typeof step === "object") {
        if ("breakdown" in step && step.breakdown) {
          delete step.breakdown[itemName]
          return true
        }
      }
      if (step && typeof step === "object" && "outflow" in step && step.outflow) {
        if (findAndRemoveFromStep(step.outflow, targetName)) {
          return true
        }
      }
    }
    return false
  }

  findAndRemoveFromStep(newData.steps, stepName)
  return newData
}

function renameBreakdownItem(data: FinancialData, stepName: string, oldName: string, newName: string): FinancialData {
  const newData = JSON.parse(JSON.stringify(data))

  if (stepName === "one_time_spend") {
    const value = newData.one_time_spend.breakdown[oldName]
    delete newData.one_time_spend.breakdown[oldName]
    newData.one_time_spend.breakdown[newName] = value
    return newData
  }

  function findAndRenameInStep(steps: any, targetName: string): boolean {
    for (const [name, step] of Object.entries(steps)) {
      if (name === targetName && step && typeof step === "object") {
        if ("breakdown" in step && step.breakdown) {
          const value = step.breakdown[oldName]
          delete step.breakdown[oldName]
          step.breakdown[newName] = value
          return true
        }
      }
      if (step && typeof step === "object" && "outflow" in step && step.outflow) {
        if (findAndRenameInStep(step.outflow, targetName)) {
          return true
        }
      }
    }
    return false
  }

  findAndRenameInStep(newData.steps, stepName)
  return newData
}

function financialReducer(state: FinancialState, action: FinancialAction): FinancialState {
  switch (action.type) {
    case "UPDATE_MONTHLY_INCOME": {
      const newData = {
        ...state.data,
        monthly_income: action.value,
      }
      const newState = createFinancialState(newData)
      return {
        ...newState,
        undoStack: [state, ...state.undoStack.slice(0, 9)],
        redoStack: [],
      }
    }

    case "UPDATE_BREAKDOWN_ITEM": {
      const newData = updateBreakdownItem(state.data, action.stepName, action.itemName, action.value)
      const newState = createFinancialState(newData)
      return {
        ...newState,
        undoStack: [state, ...state.undoStack.slice(0, 9)],
        redoStack: [],
      }
    }

    case "ADD_BREAKDOWN_ITEM": {
      const newData = addBreakdownItem(state.data, action.stepName, action.itemName, action.value)
      const newState = createFinancialState(newData)
      return {
        ...newState,
        undoStack: [state, ...state.undoStack.slice(0, 9)],
        redoStack: [],
      }
    }

    case "REMOVE_BREAKDOWN_ITEM": {
      const newData = removeBreakdownItem(state.data, action.stepName, action.itemName)
      const newState = createFinancialState(newData)
      return {
        ...newState,
        undoStack: [state, ...state.undoStack.slice(0, 9)],
        redoStack: [],
      }
    }

    case "RENAME_BREAKDOWN_ITEM": {
      const newData = renameBreakdownItem(state.data, action.stepName, action.oldName, action.newName)
      const newState = createFinancialState(newData)
      return {
        ...newState,
        undoStack: [state, ...state.undoStack.slice(0, 9)],
        redoStack: [],
      }
    }

    case "PREVIEW_SCENARIO": {
      let previewData = JSON.parse(JSON.stringify(state.data))

      action.changes.forEach((change) => {
        if (change.stepName === "Monthly Income") {
          previewData.monthly_income += change.delta
        } else if (change.itemName) {
          previewData = updateBreakdownItem(previewData, change.stepName, change.itemName, change.delta)
        }
      })

      const previewState = createFinancialState(previewData)

      return {
        ...state,
        pendingScenario: {
          changes: action.changes,
          previewState,
        },
      }
    }

    case "APPLY_SCENARIO": {
      if (!state.pendingScenario) return state

      const newState = {
        ...state.pendingScenario.previewState,
        undoStack: [state, ...state.undoStack.slice(0, 9)],
        redoStack: [],
        pendingScenario: undefined,
      }

      return newState
    }

    case "CLEAR_PREVIEW": {
      return {
        ...state,
        pendingScenario: undefined,
      }
    }

    case "UNDO": {
      if (state.undoStack.length === 0) return state

      const [previousState, ...remainingUndo] = state.undoStack
      return {
        ...previousState,
        undoStack: remainingUndo,
        redoStack: [state, ...state.redoStack.slice(0, 9)],
      }
    }

    case "REDO": {
      if (state.redoStack.length === 0) return state

      const [nextState, ...remainingRedo] = state.redoStack
      return {
        ...nextState,
        redoStack: remainingRedo,
        undoStack: [state, ...state.undoStack.slice(0, 9)],
      }
    }

    default:
      return state
  }
}

const FinancialContext = createContext<{
  state: FinancialState
  dispatch: React.Dispatch<FinancialAction>
} | null>(null)

export function FinancialProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(financialReducer, createFinancialState(initialData))

  return <FinancialContext.Provider value={{ state, dispatch }}>{children}</FinancialContext.Provider>
}

export function useFinancial() {
  const context = useContext(FinancialContext)
  if (!context) {
    throw new Error("useFinancial must be used within a FinancialProvider")
  }
  return context
}
