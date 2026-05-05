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
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
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
            stroke="#737373"
            fontSize={12}
            scale="time"
          />
          <YAxis
            tickFormatter={(v) => `$${v.toFixed(2)}`}
            stroke="#737373"
            fontSize={12}
            width={60}
          />
          <Tooltip
            contentStyle={{
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              fontSize: 12,
            }}
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
            stroke="#171717"
            strokeWidth={2}
            dot={{ r: 2, fill: "#171717" }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
