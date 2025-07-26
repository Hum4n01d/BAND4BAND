"use client"

import { useMemo, useState } from "react"
import { useFinancial } from "@/contexts/financial-context"
import { formatCurrency } from "@/lib/financial-calculator"
import { NodeEditModal } from "./node-edit-modal"

interface TerminalNodeProps {
  node: {
    id: string
    label: string
    value: number
    color: string
    x: number
    y: number
    width: number
    height: number
    editable: boolean
    type: "income" | "expense" | "savings" | "intermediate"
  }
  isIllegal?: boolean
}

function TerminalNode({ node, isIllegal }: TerminalNodeProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const getNodeStyle = () => {
    const baseStyle = {
      left: node.x,
      top: node.y,
      width: node.width,
      height: node.height,
    }

    if (isIllegal) {
      return {
        ...baseStyle,
        backgroundColor: "#1a1a1a",
        border: "2px dashed #ff073a",
      }
    }

    return {
      ...baseStyle,
      backgroundColor: isHovered ? "#2a2a2a" : "#1a1a1a",
      border: `2px solid ${isHovered ? "#00ff41" : "#333"}`,
    }
  }

  const getTextColor = () => {
    if (node.type === "income" || node.type === "savings") return "terminal-green"
    if (node.type === "expense") return "terminal-red"
    return "terminal-cyan"
  }

  return (
    <>
      <div
        className={`absolute cursor-pointer transition-all duration-200 ${
          isHovered ? "glow-green" : ""
        } ${isIllegal ? "glow-red" : ""}`}
        style={getNodeStyle()}
        onClick={() => node.editable && setIsModalOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="p-3 h-full flex flex-col justify-center text-white text-xs font-mono">
          <div className={`truncate font-semibold ${getTextColor()}`}>{node.label}</div>
          <div className="text-white font-bold mt-1">{formatCurrency(node.value)}</div>
          {isIllegal && node.id === "net_income" && node.value < 0 && (
            <div className="terminal-red text-xs mt-1 animate-pulse">[DEFICIT]</div>
          )}
        </div>
      </div>

      {node.editable && (
        <NodeEditModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          nodeId={node.id}
          currentValue={node.value}
          label={node.label}
        />
      )}
    </>
  )
}

interface DollarDashLineProps {
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  dashed?: boolean
  value: number
}

function DollarDashLine({ x1, y1, x2, y2, color, dashed, value }: DollarDashLineProps) {
  const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)

  // Calculate number of segments based on line length
  const segmentLength = 20
  const numSegments = Math.floor(length / segmentLength)

  const segments = []
  for (let i = 0; i < numSegments; i++) {
    const progress = i / numSegments
    const x = x1 + (x2 - x1) * progress
    const y = y1 + (y2 - y1) * progress

    // Alternate between dashes and dollar signs
    const isDollar = i % 2 === 0
    segments.push({
      x,
      y,
      content: isDollar ? "$" : "─",
      isDollar,
    })
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {segments.map((segment, index) => (
        <div
          key={index}
          className={`absolute text-xs font-mono transition-all duration-200 ${dashed ? "animate-pulse" : ""}`}
          style={{
            left: segment.x,
            top: segment.y,
            color: color,
            transform: `rotate(${angle}deg)`,
            transformOrigin: "center",
            textShadow: `0 0 5px ${color}`,
          }}
        >
          {segment.content}
        </div>
      ))}
    </div>
  )
}

export function TerminalSankey() {
  const { state } = useFinancial()

  const layout = useMemo(() => {
    const width = 1200
    const height = 700
    const nodeWidth = 140
    const nodeHeight = 80
    const columnSpacing = 250

    // Define columns with better spacing
    const columns = [
      ["income"],
      ["taxes", "net_income"],
      ["retirement", "fixed", "variable", "debt", "one_time"],
      ["emergency_fund", "taxable", "roth"],
    ]

    const nodes: Record<string, any> = {}
    const flows: any[] = []

    // Position nodes
    columns.forEach((column, colIndex) => {
      const x = colIndex * columnSpacing + 50
      const totalHeight = column.length * (nodeHeight + 30) - 30
      const startY = (height - totalHeight) / 2

      column.forEach((nodeId, nodeIndex) => {
        if (state.nodes[nodeId]) {
          const y = startY + nodeIndex * (nodeHeight + 30)
          nodes[nodeId] = {
            ...state.nodes[nodeId],
            x,
            y,
            width: nodeWidth,
            height: nodeHeight,
          }
        }
      })
    })

    // Create flow paths
    state.flows.forEach((flow) => {
      if (nodes[flow.source] && nodes[flow.target]) {
        const sourceX = nodes[flow.source].x + nodes[flow.source].width
        const sourceY = nodes[flow.source].y + nodes[flow.source].height / 2
        const targetX = nodes[flow.target].x
        const targetY = nodes[flow.target].y + nodes[flow.target].height / 2

        flows.push({
          x1: sourceX,
          y1: sourceY,
          x2: targetX,
          y2: targetY,
          color: flow.color,
          dashed: flow.dashed,
          value: flow.value,
        })
      }
    })

    return { nodes, flows, width, height }
  }, [state.nodes, state.flows])

  const displayState = state.pendingScenario?.previewState || state

  return (
    <div className="relative bg-black rounded-lg border-2 border-green-500 p-6 overflow-auto scanlines">
      {/* Terminal header */}
      <div className="flex items-center justify-between mb-6 border-b border-green-500 pb-2">
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="terminal-green text-sm font-mono">FINANCIAL_FLOW_ANALYZER_v2.1.0</div>
        </div>
        <div className="terminal-green text-xs font-mono">{new Date().toISOString().slice(0, 19)}Z</div>
      </div>

      <div className="relative" style={{ width: layout.width, height: layout.height }}>
        {/* Render dollar-dash flows */}
        {layout.flows.map((flow, index) => (
          <DollarDashLine
            key={index}
            x1={flow.x1}
            y1={flow.y1}
            x2={flow.x2}
            y2={flow.y2}
            color={flow.color}
            dashed={flow.dashed}
            value={flow.value}
          />
        ))}

        {/* Render nodes */}
        {Object.values(layout.nodes).map((node: any) => (
          <TerminalNode
            key={node.id}
            node={node}
            isIllegal={
              displayState.isIllegalState &&
              (node.id === "net_income" || displayState.flows.some((f) => f.source === node.id && f.dashed))
            }
          />
        ))}

        {/* Preview overlay for pending scenarios */}
        {state.pendingScenario && (
          <div className="absolute inset-0 bg-cyan-500 bg-opacity-10 border-2 border-cyan-500 border-dashed rounded-lg flex items-center justify-center">
            <div className="bg-black border border-cyan-500 p-4 rounded-lg">
              <div className="text-sm font-mono terminal-cyan animate-pulse">[SCENARIO_PREVIEW_MODE_ACTIVE]</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
