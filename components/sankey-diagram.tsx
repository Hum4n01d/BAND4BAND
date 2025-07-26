"use client"

import { useMemo, useState } from "react"
import { useFinancial } from "@/contexts/financial-context"
import { formatCurrency } from "@/lib/financial-calculator"
import { Badge } from "@/components/ui/badge"
import { NodeEditModal } from "./node-edit-modal"

interface SankeyNodeProps {
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
  }
  isIllegal?: boolean
}

function SankeyNode({ node, isIllegal }: SankeyNodeProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <div
        className={`absolute cursor-pointer transition-all duration-200 hover:scale-105 ${
          isIllegal ? "ring-2 ring-red-500 ring-opacity-50" : ""
        }`}
        style={{
          left: node.x,
          top: node.y,
          width: node.width,
          height: node.height,
          backgroundColor: node.color,
          borderRadius: "8px",
        }}
        onClick={() => node.editable && setIsModalOpen(true)}
      >
        <div className="p-3 h-full flex flex-col justify-center text-white text-sm font-medium">
          <div className="truncate">{node.label}</div>
          <div className="text-xs opacity-90">{formatCurrency(node.value)}</div>
          {isIllegal && node.id === "net_income" && node.value < 0 && (
            <Badge variant="destructive" className="mt-1 text-xs">
              DEFICIT
            </Badge>
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

interface SankeyFlowProps {
  flow: {
    source: { x: number; y: number; width: number; height: number }
    target: { x: number; y: number; width: number; height: number }
    value: number
    color: string
    dashed?: boolean
  }
}

function SankeyFlow({ flow }: SankeyFlowProps) {
  const sourceX = flow.source.x + flow.source.width
  const sourceY = flow.source.y + flow.source.height / 2
  const targetX = flow.target.x
  const targetY = flow.target.y + flow.target.height / 2

  const controlX1 = sourceX + (targetX - sourceX) * 0.5
  const controlX2 = targetX - (targetX - sourceX) * 0.5

  const path = `M ${sourceX} ${sourceY} C ${controlX1} ${sourceY} ${controlX2} ${targetY} ${targetX} ${targetY}`

  return (
    <path
      d={path}
      stroke={flow.color}
      strokeWidth={Math.max(2, flow.value / 10000)} // Scale stroke width based on value
      fill="none"
      opacity={0.7}
      strokeDasharray={flow.dashed ? "5,5" : "none"}
      className={flow.dashed ? "animate-pulse" : ""}
    />
  )
}

export function SankeyDiagram() {
  const { state } = useFinancial()

  const layout = useMemo(() => {
    const width = 800
    const height = 600
    const nodeWidth = 120
    const nodeHeight = 60
    const columnSpacing = 200

    // Define columns
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
      const totalHeight = column.length * (nodeHeight + 20) - 20
      const startY = (height - totalHeight) / 2

      column.forEach((nodeId, nodeIndex) => {
        if (state.nodes[nodeId]) {
          const y = startY + nodeIndex * (nodeHeight + 20)
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
        flows.push({
          source: nodes[flow.source],
          target: nodes[flow.target],
          value: flow.value,
          color: flow.color,
          dashed: flow.dashed,
        })
      }
    })

    return { nodes, flows, width, height }
  }, [state.nodes, state.flows])

  const displayState = state.pendingScenario?.previewState || state

  return (
    <div className="relative bg-gray-50 rounded-lg p-4 overflow-auto">
      <div className="relative" style={{ width: layout.width, height: layout.height }}>
        {/* Render flows first (behind nodes) */}
        <svg className="absolute inset-0" width={layout.width} height={layout.height}>
          {layout.flows.map((flow, index) => (
            <SankeyFlow key={index} flow={flow} />
          ))}
        </svg>

        {/* Render nodes */}
        {Object.values(layout.nodes).map((node: any) => (
          <SankeyNode
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
          <div className="absolute inset-0 bg-blue-500 bg-opacity-10 border-2 border-blue-500 border-dashed rounded-lg flex items-center justify-center">
            <div className="bg-white p-4 rounded-lg shadow-lg">
              <div className="text-sm font-medium text-blue-700">Preview Mode - Scenario Changes Active</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
