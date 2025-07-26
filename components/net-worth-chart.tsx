"use client"

import { useMemo } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { useFinancial } from "@/contexts/financial-context"
import { generateNetWorthProjection, formatCurrency } from "@/lib/financial-calculator"

export function NetWorthChart() {
  const { state } = useFinancial()

  const data = useMemo(() => {
    return generateNetWorthProjection(state, 60)
  }, [state])

  const currentMonthIndex = 30 // Current month is at index 30

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = data.find((d) => d.month === label)
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">
            {new Date(label + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </p>
          <p className="text-blue-600">Net Worth: {formatCurrency(payload[0].value)}</p>
          {dataPoint?.events && (
            <div className="mt-2 space-y-1">
              {dataPoint.events.map((event, index) => (
                <p key={index} className="text-sm text-gray-600">
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
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Net Worth Projection</h3>
        <p className="text-sm text-gray-600">60-month timeline (30 months back, 30 months forward)</p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="month"
              tickFormatter={(value) =>
                new Date(value + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" })
              }
              interval="preserveStartEnd"
            />
            <YAxis tickFormatter={(value) => formatCurrency(value).replace("$", "$").replace(",000", "K")} />
            <Tooltip content={<CustomTooltip />} />

            {/* Current month reference line */}
            <ReferenceLine
              x={data[currentMonthIndex]?.month}
              stroke="#ef4444"
              strokeDasharray="5 5"
              label={{ value: "Today", position: "top" }}
            />

            {/* Historical data (solid line) */}
            <Line
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              strokeDasharray="0"
            />

            {/* Future projection (dashed line) */}
            <Line
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              strokeDasharray="5 5"
              data={data.slice(currentMonthIndex)}
            />

            {/* Event markers */}
            {data.map((point, index) =>
              point.events?.map((event, eventIndex) => (
                <ReferenceLine
                  key={`${index}-${eventIndex}`}
                  x={point.month}
                  stroke={event.type === "windfall" ? "#10b981" : "#f59e0b"}
                  strokeWidth={2}
                  label={{ value: event.icon, position: "top" }}
                />
              )),
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex justify-between text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-4 h-0.5 bg-blue-500 mr-2"></div>
            <span>Historical</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-0.5 bg-blue-500 border-dashed border-t-2 border-blue-500 mr-2"></div>
            <span>Projected</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span>💸 Windfall</span>
          <span>🛒 Major Expense</span>
        </div>
      </div>
    </div>
  )
}
