"use client"

import { useFinancial } from "@/contexts/financial-context"
import { useState } from "react"
import { FlexCashFlowData } from "./flex-cash-flow-data"

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

  return (
    <div className="border-2 border-green-500 rounded-lg p-6 bg-black">
      <div className="terminal-green text-xl font-mono font-bold mb-4 text-center">
        FLEXBOX CASH FLOW WATERFALL
      </div>
      
      {/* Scale Factor Slider */}
      <div className="mb-4 flex items-center justify-center space-x-4">
        <span className="terminal-cyan text-sm font-mono">Scale:</span>
        <input
          type="range"
          min="5"
          max="50"
          step="1"
          value={scaleFactor}
          onChange={(e) => setScaleFactor(Number(e.target.value))}
          className="w-32 accent-green-500"
        />
        <span className="terminal-green text-sm font-mono">1:{scaleFactor}</span>
      </div>
      
      {/* Legend */}
      <div className="mb-4 flex items-center justify-center space-x-8">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-900 border-2 border-green-400 rounded"></div>
          <span className="terminal-green text-xs font-mono">Income Checkpoints</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-800 border border-blue-300 rounded"></div>
          <span className="text-blue-300 text-xs font-mono">Investments</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-800 border border-red-300 rounded"></div>
          <span className="text-red-300 text-xs font-mono">Spending</span>
        </div>
      </div>
      
      <FlexCashFlowData 
        state={state}
        scaleFactor={scaleFactor}
        onUpdateBreakdown={handleUpdateBreakdown}
      />
    </div>
  )
}