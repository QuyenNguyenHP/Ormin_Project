import { useEffect, useRef, useMemo } from "react";
import PropTypes from "prop-types";
import * as echarts from "echarts";

const foConsumptionChartPopInKeyframes = `
  @keyframes foConsumptionChartPopIn {
    0% {
      opacity: 0;
      transform: scale(0.94);
    }
    65% {
      opacity: 0.68;
      transform: scale(1.02);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

const pad = (value) => String(value).padStart(2, "0");

const formatUtcAxisTime = (timestampMs) => {
  const date = new Date(timestampMs);
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
};

const buildChartOption = ({
  chartData,
  flowInLabel,
  flowOutLabel,
  unit,
  rangeStartMs,
  rangeEndMs,
  emptyMessage,
}) => {
  const source = chartData.map((item) => ({
    timestampLabel: item.timestampLabel,
    timestampMs: Number(item.timestampMs ?? 0),
    flowIn: Number(item.flowIn ?? 0),
    flowOut: Number(item.flowOut ?? 0),
    bandBase: Number(item.bandBase ?? 0),
    bandGap: Number(item.bandGap ?? 0),
  }));

  const LEGEND_IN = "F.O in";
  const LEGEND_OUT = "F.O out";
  const rangeMarkers =
    rangeStartMs != null && rangeEndMs != null
      ? [{ xAxis: rangeStartMs }, { xAxis: rangeEndMs }]
      : [];

  return {
    animationDuration: 250,
    animationDurationUpdate: 200,
    color: ["#f97316", "#38bdf8"],
    backgroundColor: "transparent",
    dataset: [{ id: "raw", source }],
    legend: {
      left: "center",
      top: 8,
      data: [LEGEND_IN, LEGEND_OUT],
      textStyle: {
        color: "#cbd5e1",
      },
    },
    grid: {//
      top: 36,
      right: 28,
      bottom: 28,
      left: 58,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "#0f172a",
      borderColor: "#334155",
      textStyle: {
        color: "#f8fafc",
      },
      axisPointer: {
        type: "line",
        lineStyle: {
          color: "#64748b",
          type: "dashed",
        },
      },
      formatter: (params) => {
        const rows = Array.isArray(params) ? params : [params];
        const firstRow = rows[0];
        const timestampLabel =
          firstRow?.data?.timestampLabel ?? formatUtcAxisTime(firstRow?.axisValue ?? 0);
        const flowInRow = rows.find((row) => row.seriesName === LEGEND_IN);
        const flowOutRow = rows.find((row) => row.seriesName === LEGEND_OUT);
        const flowInValue = Number(flowInRow?.value?.flowIn ?? 0);
        const flowOutValue = Number(flowOutRow?.value?.flowOut ?? 0);
        const deltaValue = Math.abs(flowInValue - flowOutValue);

          return [
            timestampLabel,
            `${flowInRow?.marker ?? ""}${LEGEND_IN}: ${flowInValue.toFixed(2)} ${unit}`,
            `${flowOutRow?.marker ?? ""}${LEGEND_OUT}: ${flowOutValue.toFixed(2)} ${unit}`,
            `<span style="color:#facc15">Band:</span> ${deltaValue.toFixed(2)} ${unit}`,
          ].join("<br/>");
      },
    },
    xAxis: {
      type: "time",
      min: rangeStartMs ?? undefined,
      max: rangeEndMs ?? undefined,
      axisLine: {
        lineStyle: {
          color: "#334155",
        },
      },
      axisLabel: {
        color: "#94a3b8",
        margin: 8,
        formatter: (value) => formatUtcAxisTime(value),
      },
      splitLine: {
        show: false,
      },
    },
    dataZoom: [
      {
        type: "inside",
        xAxisIndex: 0,
        filterMode: "none",
        moveOnMouseMove: true,
        moveOnMouseWheel: false,
        preventDefaultMouseMove: false,
        zoomOnMouseWheel: true,
      },
    ],
    yAxis: {
      type: "value",
      name: unit,
      nameTextStyle: {
        color: "#94a3b8",
        padding: [0, 0, 0, 8],
      },
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: "#94a3b8",
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
        name: "band-base",
        type: "line",
        datasetId: "raw",
        encode: {
          x: "timestampMs",
          y: "bandBase",
        },
        stack: "consumption-band",
        symbol: "none",
        lineStyle: {
          opacity: 0,
        },
        areaStyle: {
          opacity: 0,
        },
        tooltip: {
          show: false,
        },
        emphasis: {
          disabled: true,
        },
      },
      {
        name: "band-gap",
        type: "line",
        datasetId: "raw",
        encode: {
          x: "timestampMs",
          y: "bandGap",
        },
        stack: "consumption-band",
        symbol: "none",
        lineStyle: {
          opacity: 0,
        },
        areaStyle: {
          opacity: 0.6,
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(250, 204, 21, 0.42)" },
            { offset: 1, color: "rgba(250, 204, 21, 0.10)" },
          ]),
        },
        tooltip: {
          show: false,
        },
        emphasis: {
          disabled: true,
        },
      },
      {
        name: LEGEND_IN,
        type: "line",
        datasetId: "raw",
        encode: {
          x: "timestampMs",
          y: "flowIn",
        },
        showSymbol: false,
        smooth: 0.22,
        lineStyle: {
          width: 3,
        },
        itemStyle: {
          color: "#f97316",
        },
        markLine: {
          symbol: ["none", "none"],
          label: {
            show: false,
          },
          lineStyle: {
            color: "#64748b",
            type: "dashed",
          },
          data: rangeMarkers,
        },
      },
      {
        name: LEGEND_OUT,
        type: "line",
        datasetId: "raw",
        encode: {
          x: "timestampMs",
          y: "flowOut",
        },
        showSymbol: false,
        smooth: 0.22,
        lineStyle: {
          width: 3,
        },
        itemStyle: {
          color: "#38bdf8",
        },
      },
      {
        type: "scatter",
        data: chartData.length === 0 && rangeStartMs != null && rangeEndMs != null
          ? [[rangeStartMs, null], [rangeEndMs, null]]
          : [],
        symbolSize: 0,
        tooltip: { show: false },
      },
    ],
    graphic:
      chartData.length === 0
        ? [
            {
              type: "text",
              left: "center",
              top: "middle",
              silent: true,
              style: {
                text: emptyMessage,
                fill: "#94a3b8",
                fontSize: 14,
              },
            },
          ]
        : [],
  };
};

const FOConsumptionChart = ({
  chartData,
  flowInLabel,
  flowOutLabel,
  unit,
  rangeStartMs,
  rangeEndMs,
  chartHeight = 420,
  title = "",
  subtitle = "",
  emptyMessage = "No data returned for the selected window.",
}) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const hasLoggedChartErrorRef = useRef(false);

  const calculateConsumptionLitres = (points) => {
    if (!Array.isArray(points) || points.length < 2) {
      return 0;
    }

    return points.slice(1).reduce((total, point, index) => {
      const previousPoint = points[index];
      const durationHours =
        (Number(point.timestampMs ?? 0) - Number(previousPoint.timestampMs ?? 0)) /
        3600000;

      if (!Number.isFinite(durationHours) || durationHours <= 0) {
        return total;
      }

      const previousGap = Number(previousPoint.bandGap ?? 0);
      const currentGap = Number(point.bandGap ?? 0);

      return total + ((previousGap + currentGap) / 2) * durationHours;
    }, 0);
  };

  const totalConsumptionLitres = useMemo(() => calculateConsumptionLitres(chartData), [chartData]);

  useEffect(() => {
    if (!chartRef.current) {
      return undefined;
    }

    chartInstanceRef.current = echarts.init(chartRef.current);
    const chartInstance = chartInstanceRef.current;
    const handleDoubleClick = () => {
      chartInstance.dispatchAction({
        type: "dataZoom",
        start: 0,
        end: 100,
      });
    };

    chartInstance.getZr().on("dblclick", handleDoubleClick);
    resizeObserverRef.current = new ResizeObserver(() => {
      chartInstance.resize();
    });
    resizeObserverRef.current.observe(chartRef.current);

    return () => {
      chartInstance.getZr().off("dblclick", handleDoubleClick);
      resizeObserverRef.current?.disconnect();
      chartInstance.dispose();
      resizeObserverRef.current = null;
      chartInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartInstanceRef.current) {
      return;
    }

    try {
      chartInstanceRef.current.setOption(
        buildChartOption({
          chartData,
          flowInLabel,
          flowOutLabel,
          unit,
          rangeStartMs,
          rangeEndMs,
          emptyMessage,
        }),
        { notMerge: true, lazyUpdate: true }
      );
    } catch (error) {
      if (!hasLoggedChartErrorRef.current) {
        console.error("Failed to render F.O. consumption chart:", error);
        hasLoggedChartErrorRef.current = true;
      }
    }
  }, [chartData, flowInLabel, flowOutLabel, unit, rangeStartMs, rangeEndMs, emptyMessage]);

  return (
    <>
      <style>{foConsumptionChartPopInKeyframes}</style>
      <div
        className="w-full rounded-[12px] bg-[#11182766] border border-[#334155] p-1 pb-0"
        style={{
          animation: "foConsumptionChartPopIn 900ms ease-out",
          transformOrigin: "center",
          willChange: "transform, opacity",
        }}
      >
        {(title || subtitle) && (
          <div className="mb-1 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-2">
            <div className="flex flex-col gap-2">
              {title ? <h3 className="m-0 text-[18px] font-roboto text-[#f8fafc]">{title}</h3> : null}
            </div>

            <div className="grid grid-cols-2 gap-3 min-w-[250px]">
              <div className="rounded-[10px] border border-[#334155] bg-[#111827] !px-3 !py-2">
                <div className="text-[11px] uppercase text-[#64748b]">Consumption</div>
                <div className="mt-1 text-[18px] font-semibold text-[#facc15]">
                  {Number(totalConsumptionLitres ?? 0).toFixed(2)} L
                </div>
              </div>

              <div className="rounded-[10px] border border-[#334155] bg-[#111827] !px-3 !py-2">
                <div className="text-[11px] uppercase text-[#64748b]">Samples</div>
                <div className="mt-1 text-[18px] font-semibold text-[#e2e8f0]">{chartData.length}</div>
              </div>
            </div>
          </div>
        )}
        <div ref={chartRef} className="w-full" style={{ height: `${chartHeight}px` }} />
      </div>
    </>
  );
};

FOConsumptionChart.propTypes = {
  chartData: PropTypes.arrayOf(
    PropTypes.shape({
      bandBase: PropTypes.number,
      bandGap: PropTypes.number,
      flowIn: PropTypes.number,
      flowOut: PropTypes.number,
      timestamp: PropTypes.string,
      timestampMs: PropTypes.number,
    })
  ).isRequired,
  chartHeight: PropTypes.number,
  flowInLabel: PropTypes.string.isRequired,
  flowOutLabel: PropTypes.string.isRequired,
  emptyMessage: PropTypes.string,
  rangeEndMs: PropTypes.number,
  rangeStartMs: PropTypes.number,
  subtitle: PropTypes.string,
  title: PropTypes.string,
  unit: PropTypes.string.isRequired,
};

export default FOConsumptionChart;
