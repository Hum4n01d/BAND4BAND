"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useFinancial } from "@/contexts/financial-context"
import type { ScenarioChange } from "@/types/financial"
import { formatCurrency } from "@/lib/financial-calculator"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function TerminalScenario() {
  const { state, dispatch } = useFinancial()
  const { toast } = useToast()
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const parseScenario = async (prompt: string): Promise<ScenarioChange[]> => {
    setIsLoading(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const changes: ScenarioChange[] = []

      if (prompt.toLowerCase().includes("bonus") || prompt.toLowerCase().includes("raise")) {
        const match = prompt.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)[k]?/i)
        if (match) {
          let amount = Number.parseFloat(match[1].replace(",", ""))
          if (prompt.toLowerCase().includes("k")) amount *= 1000

          changes.push({
            stepLabel: "Gross Income",
            delta: amount * 100,
            type: "recurring",
            description: `INCOME_BOOST: +${formatCurrency(amount * 100)}/month`,
          })
        }
      }

      if (prompt.toLowerCase().includes("rent") && prompt.toLowerCase().includes("increase")) {
        const match = prompt.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i)
        if (match) {
          const amount = Number.parseFloat(match[1].replace(",", ""))
          changes.push({
            stepLabel: "Fixed Expenses",
            delta: amount * 100,
            type: "recurring",
            description: `RENT_ESCALATION: +${formatCurrency(amount * 100)}/month`,
          })
        }
      }

      if (prompt.toLowerCase().includes("cut") || prompt.toLowerCase().includes("reduce")) {
        if (prompt.toLowerCase().includes("variable") || prompt.toLowerCase().includes("spending")) {
          const match = prompt.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i)
          if (match) {
            const amount = Number.parseFloat(match[1].replace(",", ""))
            changes.push({
              stepLabel: "Variable Expenses",
              delta: -amount * 100,
              type: "recurring",
              description: `EXPENSE_REDUCTION: -${formatCurrency(amount * 100)}/month`,
            })
          }
        }
      }

      if (changes.length === 0) {
        throw new Error("PARSE_ERROR: Unable to decode scenario parameters")
      }

      return changes
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    try {
      const changes = await parseScenario(input)
      dispatch({ type: "PREVIEW_SCENARIO", changes })
      setInput("")
    } catch (error) {
      toast({
        title: "PARSING_FAILED",
        description: error instanceof Error ? error.message : "Unable to process scenario",
        variant: "destructive",
      })
    }
  }

  const handleApply = () => {
    if (state.pendingScenario) {
      dispatch({ type: "APPLY_SCENARIO", changes: state.pendingScenario.changes })
      toast({
        title: "SCENARIO_APPLIED",
        description: "Changes committed to financial model",
      })
    }
  }

  const handleUndo = () => {
    dispatch({ type: "CLEAR_PREVIEW" })
  }

  return (
    <div className="bg-black border-2 border-green-500 rounded-lg p-6 scanlines">
      <div className="flex items-center justify-between mb-4 border-b border-green-500 pb-2">
        <div className="terminal-green text-sm font-mono">AI_SCENARIO_PROCESSOR.exe</div>
        <div className="terminal-green text-xs font-mono animate-pulse">[READY]</div>
      </div>

      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="terminal-green text-xs font-mono mb-2">{">"} ENTER_SCENARIO_QUERY:</div>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="what if i get a $2k raise?"
            className="bg-black border-green-500 text-green-400 font-mono text-sm placeholder:text-green-600 focus:border-cyan-500 focus:ring-cyan-500"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-green-600 hover:bg-green-700 text-black font-mono text-sm border border-green-500"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                PROCESSING...
              </>
            ) : (
              "EXECUTE_ANALYSIS"
            )}
          </Button>
        </form>

        {state.pendingScenario && (
          <div className="space-y-3 border-t border-green-500 pt-4">
            <div className="terminal-cyan text-xs font-mono animate-pulse">[SCENARIO_PREVIEW_ACTIVE]</div>

            <div className="space-y-2">
              {state.pendingScenario.changes.map((change, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-900 border border-cyan-500 rounded font-mono text-xs"
                >
                  <span className="terminal-cyan">{change.description}</span>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      change.type === "recurring" ? "bg-yellow-600 text-black" : "bg-purple-600 text-white"
                    }`}
                  >
                    {change.type.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={handleApply}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-black font-mono border border-green-500"
              >
                [APPLY_CHANGES]
              </Button>
              <Button
                onClick={handleUndo}
                variant="outline"
                size="sm"
                className="bg-transparent border-red-500 text-red-400 hover:bg-red-900 font-mono"
              >
                [CANCEL_PREVIEW]
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 text-xs font-mono terminal-yellow space-y-1 border-t border-green-500 pt-4">
        <div className="terminal-green">SAMPLE_QUERIES:</div>
        <div>• "what if i get a $2000 raise?"</div>
        <div>• "what if my rent increases by $300?"</div>
        <div>• "what if i reduce variable spending by $200?"</div>
      </div>
    </div>
  )
}
