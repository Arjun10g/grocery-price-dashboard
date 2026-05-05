"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Point = { t: number; price: number; retailer: string };

export function PriceHistoryChart({ data }: { data: Point[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="#262626" strokeDasharray="3 3" />
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t) =>
              new Date(t).toLocaleDateString("en-CA", {
                month: "short",
                day: "numeric",
              })
            }
            stroke="#525252"
            fontSize={11}
            scale="time"
          />
          <YAxis
            tickFormatter={(v) => `$${v.toFixed(2)}`}
            stroke="#525252"
            fontSize={11}
            width={60}
          />
          <Tooltip
            contentStyle={{
              background: "#171717",
              border: "1px solid #404040",
              borderRadius: 6,
              fontSize: 12,
              color: "#f5f5f5",
            }}
            cursor={{ stroke: "#404040", strokeWidth: 1 }}
            labelFormatter={(t) =>
              new Date(Number(t)).toLocaleDateString("en-CA", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            }
            formatter={(value, _name, item) => [
              `$${Number(value).toFixed(2)}`,
              (item?.payload as Point | undefined)?.retailer ?? "",
            ]}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#34d399"
            strokeWidth={2}
            dot={{ r: 2, fill: "#34d399" }}
            activeDot={{ r: 4, fill: "#34d399", stroke: "#10b981" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
