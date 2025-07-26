"use client"

import { useMemo } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { useFinancial } from "@/contexts/financial-context"
import { generateNetWorthProjection, formatCurrency } from "@/lib/financial-calculator"

export function TerminalChart() {
  const { state } = useFinancial()

  const data = useMemo(() => {
    return generateNetWorthProjection(state, 60)
  }, [state])

  const currentMonthIndex = 30

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = data.find((d) => d.month === label)
      return (
        <div className="bg-black border border-green-500 p-3 rounded font-mono text-xs">
          <p className="terminal-green font-semibold">
            {new Date(label + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </p>
          <p className="terminal-cyan">NET_WORTH: {formatCurrency(payload[0].value)}</p>
          {dataPoint?.events && (
            <div className="mt-2 space-y-1">
              {dataPoint.events.map((event, index) => (
                <p key={index} className="terminal-yellow">
                  {event.icon} {event.description}
                </p>
              ))}
            </div>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-black border-2 border-green-500 rounded-lg p-6 scanlines">
      {/* Terminal header */}
      <div className="flex items-center justify-between mb-4 border-b border-green-500 pb-2">
        <div className="terminal-green text-sm font-mono">NET_WORTH_PROJECTION.exe</div>
        <div className="terminal-green text-xs font-mono">60M_TIMELINE [30_HIST|30_PROJ]</div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#00ff41" strokeOpacity={0.2} />
            <XAxis
              dataKey="month"
              tickFormatter={(value) =>
                new Date(value + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" })
              }
              interval="preserveStartEnd"
              tick={{ fill: "#00ff41", fontSize: 10, fontFamily: "JetBrains Mono" }}
              axisLine={{ stroke: "#00ff41" }}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value).replace("$", "$").replace(",000", "K")}
              tick={{ fill: "#00ff41", fontSize: 10, fontFamily: "JetBrains Mono" }}
              axisLine={{ stroke: "#00ff41" }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Current month reference line */}
            <ReferenceLine
              x={data[currentMonthIndex]?.month}
              stroke="#ffff00"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: "NOW",
                position: "top",
                style: { fill: "#ffff00", fontFamily: "JetBrains Mono", fontSize: 10 },
              }}
            />

            {/* Historical data (solid line) */}
            <Line
              dataKey="value"
              stroke="#00ff41"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              strokeDasharray="0"
              filter="url(#glow)"
            />

            {/* Future projection (dashed line) */}
            <Line
              dataKey="value"
              stroke="#00ffff"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              strokeDasharray="8 4"
              data={data.slice(currentMonthIndex)}
            />

            {/* Event markers */}
            {data.map((point, index) =>
              point.events?.map((event, eventIndex) => (
                <ReferenceLine
                  key={`${index}-${eventIndex}`}
                  x={point.month}
                  stroke={event.type === "windfall" ? "#00ff41" : "#ff8c00"}
                  strokeWidth={2}
                  label={{
                    value: event.icon,
                    position: "top",
                    style: { fontSize: 12 },
                  }}
                />
              )),
            )}

            {/* Add glow effect */}
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex justify-between text-xs font-mono">
        <div className="flex items-center space-x-6">
          <div className="flex items-center">
            <div className="w-4 h-0.5 bg-green-500 mr-2"></div>
            <span className="terminal-green">HISTORICAL</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-0.5 bg-cyan-500 border-dashed border-t-2 border-cyan-500 mr-2"></div>
            <span className="terminal-cyan">PROJECTED</span>
          </div>
        </div>
        <div className="flex items-center space-x-4 terminal-yellow">
          <span>💸 WINDFALL</span>
          <span>🛒 EXPENSE</span>
        </div>
      </div>
    </div>
  )
}
