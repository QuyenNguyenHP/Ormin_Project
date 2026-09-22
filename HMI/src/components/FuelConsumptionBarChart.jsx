import { useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import * as echarts from "echarts";

const FUEL_TYPES = [
  { name: "D.O", color: "#38bdf8" },
  { name: "H.O", color: "#f59e0b" },
];

const buildOption = (records, selected) => {
  const days = [...new Set(records.map((record) => record.day))].sort();
  const values = new Map(
    records.map((record) => [`${record.day}|${record.fuelType}`, Number(record.consumption)])
  );

  return {
    backgroundColor: "transparent",
    animationDuration: 300,
    color: FUEL_TYPES.map((fuel) => fuel.color),
    grid: { left: 60, right: 22, top: 48, bottom: 60 },
    legend: {
      top: 8,
      data: FUEL_TYPES.map((fuel) => fuel.name),
      selected,
      selectedMode: true,
      textStyle: { color: "#cbd5e1" },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "#0f172a",
      borderColor: "#334155",
      textStyle: { color: "#f8fafc" },
      valueFormatter: (value) => `${Number(value).toLocaleString()} L`,
    },
    xAxis: {
      type: "category",
      data: days,
      axisLabel: {
        color: "#94a3b8",
        rotate: days.length > 5 ? 35 : 0,
        interval: Math.max(0, Math.ceil(days.length / 10) - 1),
      },
      axisLine: { lineStyle: { color: "#475569" } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      name: "L",
      nameTextStyle: { color: "#94a3b8" },
      axisLabel: { color: "#94a3b8" },
      splitLine: { lineStyle: { color: "#334155" } },
    },
    series: FUEL_TYPES.map((fuel) => ({
      name: fuel.name,
      type: "bar",
      barMaxWidth: 30,
      itemStyle: { borderRadius: [4, 4, 0, 0] },
      emphasis: { focus: "series" },
      data: days.map((day) => values.get(`${day}|${fuel.name}`) ?? null),
    })),
  };
};

const FuelConsumptionBarChart = ({ records, engineNumber, height = 280 }) => {
  const chartRef = useRef(null);
  const instanceRef = useRef(null);
  const selectedRef = useRef({ "D.O": true, "H.O": true });
  const option = useMemo(() => buildOption(records, selectedRef.current), [records]);

  useEffect(() => {
    if (!chartRef.current || !records.length) return undefined;

    const chart = echarts.init(chartRef.current);
    instanceRef.current = chart;
    const handleLegendChange = (event) => {
      selectedRef.current = event.selected;
    };
    chart.on("legendselectchanged", handleLegendChange);
    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.off("legendselectchanged", handleLegendChange);
      chart.dispose();
      instanceRef.current = null;
    };
  }, [records.length]);

  useEffect(() => {
    instanceRef.current?.setOption(option, { notMerge: true });
  }, [option]);

  return (
    <section aria-label={`Engine ${engineNumber} daily fuel consumption`}>
      <h3 className="mb-2 text-[15px] font-semibold text-[#f8fafc]">
        Engine {engineNumber} Fuel Consumption by Day
      </h3>
      {records.length ? (
        <div ref={chartRef} role="img" aria-label={`D.O and H.O consumption in litres by UTC day for Engine ${engineNumber}; click the legend to show or hide a fuel type`} style={{ width: "100%", height }} />
      ) : (
        <div className="flex items-center justify-center text-[13px] text-[#94a3b8]" style={{ height }}>
          No daily fuel consumption data for this range.
        </div>
      )}
    </section>
  );
};

FuelConsumptionBarChart.propTypes = {
  records: PropTypes.arrayOf(PropTypes.shape({
    day: PropTypes.string.isRequired,
    fuelType: PropTypes.string.isRequired,
    consumption: PropTypes.number.isRequired,
  })).isRequired,
  engineNumber: PropTypes.number.isRequired,
  height: PropTypes.number,
};

export default FuelConsumptionBarChart;
