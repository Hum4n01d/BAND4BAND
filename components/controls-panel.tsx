"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useFinancial } from "@/contexts/financial-context"
import { formatCurrency } from "@/lib/financial-calculator"
import { Undo2, Redo2, AlertTriangle } from "lucide-react"

export function ControlsPanel() {
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

  const totalSavings =
    (state.nodes.emergency_fund?.value || 0) + (state.nodes.taxable?.value || 0) + (state.nodes.roth?.value || 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Controls & Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Undo/Redo Controls */}
        <div className="flex space-x-2">
          <Button
            onClick={handleUndo}
            disabled={state.undoStack.length === 0}
            variant="outline"
            size="sm"
            className="flex items-center space-x-1 bg-transparent"
          >
            <Undo2 className="h-4 w-4" />
            <span>Undo</span>
          </Button>
          <Button
            onClick={handleRedo}
            disabled={state.redoStack.length === 0}
            variant="outline"
            size="sm"
            className="flex items-center space-x-1 bg-transparent"
          >
            <Redo2 className="h-4 w-4" />
            <span>Redo</span>
          </Button>
        </div>

        {/* Status Indicators */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Budget Status:</span>
            {state.isIllegalState ? (
              <Badge variant="destructive" className="flex items-center space-x-1">
                <AlertTriangle className="h-3 w-3" />
                <span>Over Budget</span>
              </Badge>
            ) : (
              <Badge variant="default">Balanced</Badge>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Monthly Income:</span>
            <span className="font-mono text-sm">{formatCurrency(state.nodes.income?.value || 0)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Monthly Savings:</span>
            <span className="font-mono text-sm text-green-600">{formatCurrency(totalSavings)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Savings Rate:</span>
            <span className="font-mono text-sm">
              {state.nodes.income?.value ? `${((totalSavings / state.nodes.income.value) * 100).toFixed(1)}%` : "0%"}
            </span>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="pt-2 border-t">
          <div className="text-xs text-gray-500 space-y-1">
            <p>
              <strong>Keyboard Shortcuts:</strong>
            </p>
            <p>Ctrl+Z: Undo</p>
            <p>Ctrl+Y: Redo</p>
            <p>Click nodes to edit values</p>
          </div>
        </div>

        {/* Undo Stack Info */}
        <div className="text-xs text-gray-400">History: {state.undoStack.length}/10 changes stored</div>
      </CardContent>
    </Card>
  )
}
