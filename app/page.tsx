"use client"

import { FinancialProvider } from "@/contexts/financial-context"
import { RigidCashFlow } from "@/components/rigid-cash-flow"
import { TerminalScenario } from "@/components/terminal-scenario"
import { TerminalControls } from "@/components/terminal-controls"
import { Toaster } from "@/components/ui/toaster"

export default function Home() {
  return (
    <FinancialProvider>
      <div className="min-h-screen bg-black text-green-400">
        <div className="container mx-auto px-4 py-8">
          {/* Terminal header */}
          <div className="mb-8 border-2 border-green-500 rounded-lg p-6 bg-black scanlines">
            <div className="terminal-green text-lg font-mono font-bold mb-2">CASH_FLOW_ANALYZER</div>
            <div className="terminal-cyan text-sm font-mono">
              {">"} Financial flow visualization with calculated values
            </div>
            <div className="terminal-yellow text-xs font-mono mt-2 animate-pulse">
              [SYSTEM_READY] - Cash flow tracking • Real-time calculations
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Main Cash Flow Visualization */}
            <div className="xl:col-span-3">
              <RigidCashFlow />
            </div>

            {/* Side Panel */}
            <div className="space-y-6">
              <TerminalScenario />
              <TerminalControls />
            </div>
          </div>
        </div>

        <Toaster />
      </div>
    </FinancialProvider>
  )
}