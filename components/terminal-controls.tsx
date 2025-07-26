"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { useFinancial } from "@/contexts/financial-context"
import { formatCurrency } from "@/lib/financial-calculator"

export function TerminalControls() {
  const { state, dispatch } = useFinancial()

  const handleUndo = () => {
    dispatch({ type: "UNDO" })
  }

  const handleRedo = () => {
    dispatch({ type: "REDO" })
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault()
      handleUndo()
    } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
      e.preventDefault()
      handleRedo()
    }
  }

  React.useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Calculate total savings from investment categories
  const investmentSteps = state.calculatedSteps.filter((step) => step.categoryType === "investment")
  const totalSavings = investmentSteps.reduce((sum, step) => sum + step.value, 0)

  const savingsRate = state.data.monthly_income ? ((totalSavings / state.data.monthly_income) * 100).toFixed(1) : "0.0"

  return (
    <div className="bg-black border-2 border-green-500 rounded-lg p-6 scanlines">
      {/* Terminal header */}
      <div className="flex items-center justify-between mb-4 border-b border-green-500 pb-2">
        <div className="terminal-green text-sm font-mono">SYSTEM_CONTROLS.exe</div>
        <div className="terminal-green text-xs font-mono">v4.0.0</div>
      </div>

      <div className="space-y-4">
        {/* Control buttons */}
        <div className="flex space-x-2">
          <Button
            onClick={handleUndo}
            disabled={state.undoStack.length === 0}
            size="sm"
            className="bg-yellow-600 hover:bg-yellow-700 text-black font-mono text-xs border border-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:border-gray-600"
          >
            [UNDO]
          </Button>
          <Button
            onClick={handleRedo}
            disabled={state.redoStack.length === 0}
            size="sm"
            className="bg-yellow-600 hover:bg-yellow-700 text-black font-mono text-xs border border-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:border-gray-600"
          >
            [REDO]
          </Button>
        </div>

        {/* System status */}
        <div className="space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="terminal-green">BUDGET_STATUS:</span>
            {state.isIllegalState ? (
              <span className="terminal-red animate-pulse">[OVER_BUDGET]</span>
            ) : (
              <span className="terminal-green">[BALANCED]</span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="terminal-green">MONTHLY_INCOME:</span>
            <span className="terminal-cyan">{formatCurrency(state.data.monthly_income)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="terminal-green">MONTHLY_INVESTMENTS:</span>
            <span className="terminal-green">{formatCurrency(totalSavings)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="terminal-green">INVESTMENT_RATE:</span>
            <span className="terminal-yellow">{savingsRate}%</span>
          </div>
        </div>

        {/* Investment breakdown */}
        {investmentSteps.length > 0 && (
          <div className="pt-2 border-t border-green-500">
            <div className="terminal-green text-xs font-mono mb-2">INVESTMENT_BREAKDOWN:</div>
            <div className="space-y-1">
              {investmentSteps.map((step) => (
                <div key={step.name} className="flex items-center justify-between text-xs font-mono">
                  <span className="terminal-cyan">{step.name}:</span>
                  <span className="terminal-green">{formatCurrency(step.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Keyboard shortcuts */}
        <div className="pt-2 border-t border-green-500">
          <div className="terminal-yellow text-xs font-mono space-y-1">
            <div className="terminal-green">KEYBINDS:</div>
            <div>CTRL+Z: UNDO_LAST</div>
            <div>CTRL+Y: REDO_LAST</div>
            <div>CLICK_NODE: EDIT_BREAKDOWN</div>
          </div>
        </div>

        {/* System info */}
        <div className="pt-2 border-t border-green-500">
          <div className="terminal-green text-xs font-mono">HISTORY_BUFFER: {state.undoStack.length}/10</div>
          <div className="terminal-green text-xs font-mono">TIMESTAMP: {new Date().toISOString().slice(0, 19)}Z</div>
        </div>
      </div>
    </div>
  )
}
