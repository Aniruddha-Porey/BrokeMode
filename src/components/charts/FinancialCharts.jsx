import React from 'react';
import {
  Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatCurrency, formatDate } from '../../finance/formatters.js';

function MoneyTooltip({ active, payload, label, forecast = false }) {
  if (!active || !payload?.length) return null;
  const date = payload[0]?.payload?.date;
  const actual = payload.find((item) => item.dataKey === 'actual' || item.dataKey === 'current');
  const estimate = payload.find((item) => item.dataKey === 'forecast' || item.dataKey === 'proposed');
  return <div className="chart-tooltip">
    <div className="chart-tooltip-date">Day {label}{date ? ` · ${formatDate(date, { year: true })}` : ''}</div>
    {actual && actual.value !== null && actual.value !== undefined && <div className="chart-tooltip-row"><span>{forecast ? 'Current plan' : 'Actual balance'}</span><strong>{formatCurrency(actual.value)}</strong></div>}
    {estimate && estimate.value !== null && estimate.value !== undefined && <div className="chart-tooltip-row"><span className="forecast-tag">{forecast ? 'With decision' : 'Estimated balance'}</span><strong>{formatCurrency(estimate.value)}</strong></div>}
  </div>;
}

const yFormatter = (value) => {
  const abs = Math.abs(value);
  if (abs >= 1000) return `${value < 0 ? '−' : ''}₹${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`;
  return `${value < 0 ? '−' : ''}₹${Math.round(abs)}`;
};

export function CashflowChart({ data, currentDay, height = 220 }) {
  return <div className="chart-wrapper" style={{ height }}>
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="2 5" vertical={false} />
        <XAxis dataKey="day" type="number" domain={[1, 'dataMax']} tickLine={false} axisLine={false} tick={{ fill: '#7D8497', fontSize: 9 }} tickFormatter={(value) => `D${value}`} interval={4} />
        <YAxis width={44} tickLine={false} axisLine={false} tick={{ fill: '#7D8497', fontSize: 9 }} tickFormatter={yFormatter} domain={['auto', 'auto']} />
        <Tooltip content={<MoneyTooltip />} cursor={{ stroke: '#596176', strokeDasharray: '3 4' }} />
        <ReferenceLine x={currentDay} stroke="#F5BE62" strokeDasharray="2 5" strokeOpacity={.72} label={{ value: 'TODAY', fill: '#F5BE62', fontSize: 8, position: 'insideTopRight' }} />
        <Area type="monotone" dataKey="actual" fill="#9B87F5" fillOpacity={.08} stroke="none" connectNulls={false} isAnimationActive={false} />
        <Area type="monotone" dataKey="forecast" fill="#C4F36B" fillOpacity={.035} stroke="none" connectNulls={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="actual" stroke="#9B87F5" strokeWidth={2.2} dot={false} activeDot={{ r: 4, fill: '#9B87F5', stroke: '#151925', strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="forecast" stroke="#C4F36B" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 4, fill: '#C4F36B', stroke: '#151925', strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  </div>;
}

export function DecisionForecastChart({ data, currentDay, height = 166 }) {
  return <div className="scenario-chart" style={{ height }}>
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="2 5" vertical={false} />
        <XAxis dataKey="day" type="number" domain={[currentDay, 'dataMax']} tickLine={false} axisLine={false} tick={{ fill: '#7D8497', fontSize: 8 }} tickFormatter={(value) => `D${value}`} interval={3} />
        <YAxis width={42} tickLine={false} axisLine={false} tick={{ fill: '#7D8497', fontSize: 8 }} tickFormatter={yFormatter} domain={['auto', 'auto']} />
        <Tooltip content={<MoneyTooltip forecast />} cursor={{ stroke: '#596176', strokeDasharray: '3 4' }} />
        <ReferenceLine x={currentDay} stroke="#F5BE62" strokeDasharray="2 5" strokeOpacity={.72} />
        <Area type="monotone" dataKey="current" fill="#C4F36B" fillOpacity={.025} stroke="none" isAnimationActive={false} />
        <Line type="monotone" dataKey="current" stroke="#C4F36B" strokeWidth={1.8} strokeDasharray="4 4" dot={false} activeDot={{ r: 3, fill: '#C4F36B' }} isAnimationActive={false} />
        <Line type="monotone" dataKey="proposed" stroke="#9B87F5" strokeWidth={2.2} dot={false} activeDot={{ r: 3, fill: '#9B87F5' }} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  </div>;
}
