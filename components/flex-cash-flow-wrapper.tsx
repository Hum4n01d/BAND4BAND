"use client"

import { useFinancial } from "@/contexts/financial-context"
import { useState } from "react"
import { FlexCashFlowData } from "./flex-cash-flow-data"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface StepData {
  name: string
  value: number
  outflows: Array<{
    name: string
    value: number
    type: "investment" | "spend"
    breakdown: { [key: string]: string | number }
  }>
}

export function FlexCashFlowWrapper() {
  const { state, dispatch } = useFinancial()
  const [scaleFactor, setScaleFactor] = useState(15)

  const handleUpdateBreakdown = (stepName: string, itemName: string, value: number) => {
    dispatch({
      type: "UPDATE_BREAKDOWN_ITEM",
      stepName,
      itemName,
      value
    })
  }

  // Build steps data for editing panel
  const buildStepsData = (): StepData[] => {
    if (!state || !state.calculatedSteps) return []
    
    const steps: StepData[] = []
    
    // Add Monthly Income as first step with its outflows (from Total Income step)
    const monthlyIncomeOutflows: StepData['outflows'] = []
    const totalIncomeStep = state.data.steps["Total Income"]
    if (totalIncomeStep?.outflow) {
      Object.entries(totalIncomeStep.outflow).forEach(([outflowName, outflowData]) => {
        if (outflowData.breakdown) {
          const total = Object.values(outflowData.breakdown).reduce((sum, val) => sum + Number(val), 0)
          monthlyIncomeOutflows.push({
            name: outflowName,
            value: total,
            type: outflowData.type || "spend",
            breakdown: outflowData.breakdown
          })
        }
      })
    }
    
    steps.push({
      name: "Monthly Income",
      value: state.data.monthly_income,
      outflows: monthlyIncomeOutflows
    })
    
    // Define the waterfall progression 
    const stepOrder = ["Takehome", "Free Cash", "Net Income"]
    
    // Process each step in order
    stepOrder.forEach(stepName => {
      const calculatedStep = state.calculatedSteps.find(s => s.name === stepName && s.type === "checkpoint")
      if (!calculatedStep) return
      
      const dataStep = state.data.steps[stepName]
      const outflows: StepData['outflows'] = []
      
      if (dataStep?.outflow) {
        Object.entries(dataStep.outflow).forEach(([outflowName, outflowData]) => {
          if (outflowData.breakdown) {
            const total = Object.values(outflowData.breakdown).reduce((sum, val) => sum + Number(val), 0)
            outflows.push({
              name: outflowName,
              value: total,
              type: outflowData.type || "spend",
              breakdown: outflowData.breakdown
            })
          }
        })
      }
      
      steps.push({
        name: stepName,
        value: calculatedStep.value,
        outflows
      })
    })
    
    return steps
  }

  const steps = buildStepsData()

  return (
    <div className="h-full w-full bg-black flex flex-col">
      {/* Legend and Edit Button - compact at top */}
      <div className="flex items-center justify-between py-2 px-4 border-b border-green-500">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-900 border-2 border-green-400 rounded"></div>
            <span className="terminal-green text-xs font-mono">Income Checkpoints</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-800 border border-blue-300 rounded"></div>
            <span className="text-blue-300 text-xs font-mono">Investments</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-800 border border-red-300 rounded"></div>
            <span className="text-red-300 text-xs font-mono">Spending</span>
          </div>
        </div>
        
        {/* Edit Button */}
        <Dialog>
          <DialogTrigger asChild>
            <button className="terminal-cyan text-xs font-mono border border-cyan-500 px-3 py-1 rounded hover:bg-cyan-500 hover:text-black transition-colors">
              EDIT VALUES
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] bg-black border-2 border-green-500">
            <DialogHeader>
              <DialogTitle className="terminal-green text-lg font-mono font-bold">
                MANUAL VALUE EDITOR
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[60vh] grid grid-cols-2 gap-4">
              {steps.map((step, stepIndex) => 
                step.outflows.map(outflow => (
                  <div key={`${step.name}-${outflow.name}`} className="border border-gray-600 rounded p-3 bg-gray-800">
                    <div className={`text-sm font-mono font-bold mb-2 ${
                      outflow.type === "investment" ? "text-blue-400" : "text-red-400"
                    }`}>
                      {outflow.name} - <span>$</span>{outflow.value.toLocaleString()}
                    </div>
                    <div className="space-y-1">
                      {Object.entries(outflow.breakdown).map(([item, amount]) => (
                        <div key={item} className="flex items-center justify-between text-xs font-mono text-gray-400">
                          <span>{item}</span>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={typeof amount === 'number' ? amount : amount}
                              onChange={(e) => handleUpdateBreakdown(outflow.name, item, Number(e.target.value))}
                              className="w-16 bg-gray-700 border border-gray-600 rounded px-1 py-0 text-right text-white"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Full height cash flow */}
      <div className="flex-1 overflow-auto">
        <FlexCashFlowData 
          state={state}
          scaleFactor={scaleFactor}
          onUpdateBreakdown={handleUpdateBreakdown}
        />
      </div>
    </div>
  )
}