import { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import * as echarts from "echarts";

const fallbackEngines = [
  {
    name: "Engine 1",
    cylinders: [
      { name: "Cyl 1", value: 410 },
      { name: "Cyl 2", value: 420 },
      { name: "Cyl 3", value: 428 },
      { name: "Cyl 4", value: 434 },
      { name: "Cyl 5", value: 442 },
      { name: "Cyl 6", value: 438 },
    ],
  },
  {
    name: "Engine 2",
    cylinders: [
      { name: "Cyl 1", value: 424 },
      { name: "Cyl 2", value: 432 },
      { name: "Cyl 3", value: 438 },
      { name: "Cyl 4", value: 444 },
      { name: "Cyl 5", value: 450 },
      { name: "Cyl 6", value: 447 },
    ],
  },
  {
    name: "Engine 3",
    cylinders: [
      { name: "Cyl 1", value: 436 },
      { name: "Cyl 2", value: 441 },
      { name: "Cyl 3", value: 446 },
      { name: "Cyl 4", value: 452 },
      { name: "Cyl 5", value: 457 },
      { name: "Cyl 6", value: 455 },
    ],
  },
  {
    name: "Engine 4",
    cylinders: [
      { name: "Cyl 1", value: 445 },
      { name: "Cyl 2", value: 450 },
      { name: "Cyl 3", value: 455 },
      { name: "Cyl 4", value: 462 },
      { name: "Cyl 5", value: 468 },
      { name: "Cyl 6", value: 464 },
    ],
  },
];

const cylinderColors = ["#22c55e", "#f59e0b", "#38bdf8", "#ef4444", "#a78bfa", "#f97316"];

const buildChartOption = ({ selectedEngines, unit }) => {
  const xAxisData = selectedEngines.map((engine) => engine.name);
  const cylinderNames =
    selectedEngines[0]?.cylinders?.map((cylinder) => cylinder.name) ??
    fallbackEngines[0].cylinders.map((cylinder) => cylinder.name);
  const dataList = cylinderNames.map((_, cylinderIndex) =>
    selectedEngines.map((engine) => Number(engine.cylinders?.[cylinderIndex]?.value ?? 0))
  );
  const encodeY = dataList.map((_, index) => index + 1);
  const customData = selectedEngines.map((engine, engineIndex) => [
    engineIndex,
    ...cylinderNames.map((_, cylinderIndex) => Number(engine.cylinders?.[cylinderIndex]?.value ?? 0)),
  ]);
  const flatValues = dataList.flat();
  const maxValue = Math.max(...flatValues, 500);

  return {
    animationDuration: 300,
    animationDurationUpdate: 250,
    animationEasing: "cubicOut",
    animationEasingUpdate: "cubicOut",
    color: cylinderColors,
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
        shadowStyle: {
          color: "rgba(148, 163, 184, 0.08)",
        },
      },
      backgroundColor: "#0f172a",
      borderColor: "#334155",
      textStyle: {
        color: "#f8fafc",
      },
      formatter: (params) => {
        const rows = Array.isArray(params) ? params : [params];
        const lines = rows
          .filter((row) => row.seriesName !== "trend")
          .map((row) => `${row.marker}${row.seriesName}: ${row.value} ${unit}`);
        return [`${rows[0]?.axisValueLabel ?? ""}`, ...lines].join("<br/>");
      },
    },
    grid: {
      top: 24,
      right: 20,
      bottom: 30,
      left: 48,
    },
    xAxis: {
      type: "category",
      data: xAxisData,
      axisLine: {
        lineStyle: {
          color: "#334155",
        },
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: "#cbd5e1",
        fontSize: 12,
      },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: Math.ceil(maxValue / 50) * 50,
      splitNumber: 5,
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: "#94a3b8",
        fontSize: 12,
        formatter: `{value} ${unit}`,
      },
      splitLine: {
        lineStyle: {
          color: "#1e293b",
          type: "dashed",
        },
      },
    },
    series: [
      {
        type: "custom",
        name: "trend",
        renderItem: (params, api) => {
          const xValue = api.value(0);
          const currentSeriesIndices = api.currentSeriesIndices();
          const barLayout = api.barLayout({
            barGap: "30%",
            barCategoryGap: "20%",
            count: currentSeriesIndices.length - 1,
          });
          const points = [];

          for (let index = 0; index < currentSeriesIndices.length; index += 1) {
            const seriesIndex = currentSeriesIndices[index];
            if (seriesIndex !== params.seriesIndex) {
              const point = api.coord([xValue, api.value(seriesIndex)]);
              point[0] += barLayout[index - 1].offsetCenter;
              point[1] -= 10;
              points.push(point);
            }
          }

          return {
            type: "polyline",
            shape: {
              points,
            },
            style: api.style({
              stroke: "#a5f3fc",
              lineWidth: 2,
              fill: "none",
            }),
          };
        },
        itemStyle: {
          borderWidth: 2,
        },
        encode: {
          x: 0,
          y: encodeY,
        },
        data: customData,
        z: 100,
      },
      ...dataList.map((seriesData, index) => ({
        type: "bar",
        name: cylinderNames[index],
        barMaxWidth: 22,
        itemStyle: {
          opacity: 0.72,
          color: cylinderColors[index % cylinderColors.length],
          borderRadius: [8, 8, 0, 0],
        },
        emphasis: {
          itemStyle: {
            opacity: 1,
          },
        },
        data: seriesData,
        z: 10 + index,
      })),
    ],
  };
};

const Cylinder_exh_temp = ({
  engines = fallbackEngines,
  chartHeight = 300,
  title = "Cylinder Exhaust Temperature",
  subtitle = "Each engine group shows six cylinder temperatures, with a trend overlay connecting Cyl 1 to Cyl 6.",
  unit = "C",
}) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const resizeObserverRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) {
      return undefined;
    }

    chartInstanceRef.current = echarts.init(chartRef.current);
    resizeObserverRef.current = new ResizeObserver(() => {
      chartInstanceRef.current?.resize();
    });
    resizeObserverRef.current.observe(chartRef.current);

    return () => {
      resizeObserverRef.current?.disconnect();
      chartInstanceRef.current?.dispose();
      resizeObserverRef.current = null;
      chartInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartInstanceRef.current) {
      return;
    }

    const selectedEngines =
      Array.isArray(engines) && engines.length > 0 ? engines : fallbackEngines;

    chartInstanceRef.current.setOption(
      buildChartOption({
        selectedEngines,
        unit,
      }),
      { notMerge: true, lazyUpdate: true }
    );
  }, [engines, unit]);

  return (
    <div className="w-full rounded-[12px] bg-[#111827] border border-[#334155] p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="m-0 text-[20px] font-roboto text-[#f8fafc]">{title}</h3>
          <p className="mt-2 mb-0 text-[13px] text-[#94a3b8]">{subtitle}</p>
        </div>
        <div className="flex items-center justify-end gap-3 pt-1 whitespace-nowrap overflow-x-auto">
          {(engines[0]?.cylinders ?? fallbackEngines[0].cylinders).map((point, index) => (
            <div key={point.name} className="flex items-center gap-2 shrink-0">
              <span
                className="h-3 w-3 rounded-[3px] shrink-0"
                style={{ backgroundColor: cylinderColors[index % cylinderColors.length] }}
              />
              <span className="text-[12px] text-[#cbd5e1] whitespace-nowrap">{point.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div ref={chartRef} className="w-full" style={{ height: `${chartHeight}px` }} />
    </div>
  );
};

Cylinder_exh_temp.propTypes = {
  chartHeight: PropTypes.number,
  engines: PropTypes.arrayOf(
    PropTypes.shape({
      cylinders: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string.isRequired,
          value: PropTypes.number.isRequired,
        })
      ).isRequired,
      name: PropTypes.string.isRequired,
    })
  ),
  subtitle: PropTypes.string,
  title: PropTypes.string,
  unit: PropTypes.string,
};

export default Cylinder_exh_temp;
