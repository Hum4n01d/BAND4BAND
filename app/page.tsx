"use client";

import { FinancialProvider } from "@/contexts/financial-context";
import { FlexCashFlow } from "@/components/flex-cash-flow";
import { TerminalScenario } from "@/components/terminal-scenario";
import { TerminalControls } from "@/components/terminal-controls";
import { Toaster } from "@/components/ui/toaster";

export default function Home() {
  return (
    <FinancialProvider>
      <div className="h-screen bg-black text-green-400 flex flex-col">
        {/* Top Controls Bar */}
        <div className="flex border-b-2 border-green-500 bg-black">
          {/* Terminal header */}
          <div className="border-r-2 border-green-500 p-4 bg-black scanlines min-w-fit">
            <div className="terminal-green text-lg font-mono font-bold mb-2">
              BAND4BAND $$$
            </div>
            <div className="terminal-cyan text-sm font-mono">
              {">"} Financial flow visualization with calculated values
            </div>
            <div className="terminal-yellow text-xs font-mono mt-2 animate-pulse">
              [SYSTEM_READY] - Cash flow tracking • Real-time calculations
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-1">
            <div className="border-r-2 border-green-500 flex-1">
              <TerminalScenario />
            </div>
            <div className="flex-1">
              <TerminalControls />
            </div>
          </div>
        </div>

        {/* Main Cash Flow Visualization - Full remaining height */}
        <div className="flex-1 overflow-hidden">
          <FlexCashFlow />
        </div>

        <Toaster />
      </div>
    </FinancialProvider>
  );
}
