import { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import * as echarts from "echarts";

const timeSeriesLineChartPopInKeyframes = `
  @keyframes timeSeriesLineChartPopIn {
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
  series,
  rangeStartMs,
  rangeEndMs,
  emptyMessage,
  yAxisName,
}) => {
  const normalizedSeries = series.map((item, index) => ({
    lineWidth: 3,
    smooth: 0.22,
    ...item,
    color: item.color ?? ["#22c55e", "#38bdf8", "#f97316", "#e879f9", "#facc15", "#fb7185"][index % 6],
  }));

  const source = chartData.map((item) => {
    const point = {
      timestampLabel: item.timestampLabel,
      timestampMs: Number(item.timestampMs ?? 0),
    };

    normalizedSeries.forEach((seriesItem) => {
      point[seriesItem.dataKey] = Number(item[seriesItem.dataKey] ?? 0);
    });

    return point;
  });

  const seriesLookup = Object.fromEntries(
    normalizedSeries.map((item) => [item.name, item])
  );

  return {
    animationDuration: 250,
    animationDurationUpdate: 200,
    backgroundColor: "transparent",
    color: normalizedSeries.map((item) => item.color),
    dataset: [{ id: "raw", source }],
    legend: {
      left: "center",
      top: 8,
      data: normalizedSeries.map((item) => item.name),
      textStyle: {
        color: "#cbd5e1",
      },
    },
    grid: {
      top: 42,
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
        const formattedRows = rows.map((row) => {
          const seriesConfig = seriesLookup[row.seriesName] ?? {};
          const value = Number(row?.value?.[seriesConfig.dataKey] ?? 0);
          const precision = Number.isInteger(seriesConfig.precision)
            ? seriesConfig.precision
            : 2;
          const unit = seriesConfig.unit ?? yAxisName ?? "";

          return `${row.marker ?? ""}${row.seriesName}: ${value.toFixed(precision)}${unit ? ` ${unit}` : ""}`;
        });

        return [timestampLabel, ...formattedRows].join("<br/>");
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
      name: yAxisName,
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
      ...normalizedSeries.map((seriesItem) => ({
        name: seriesItem.name,
        type: "line",
        datasetId: "raw",
        encode: {
          x: "timestampMs",
          y: seriesItem.dataKey,
        },
        showSymbol: false,
        smooth: seriesItem.smooth,
        lineStyle: {
          width: seriesItem.lineWidth,
        },
        itemStyle: {
          color: seriesItem.color,
        },
      })),
      {
        type: "scatter",
        data:
          chartData.length === 0 && rangeStartMs != null && rangeEndMs != null
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

const TimeSeriesLineChart = ({
  chartData,
  series,
  rangeStartMs,
  rangeEndMs,
  chartHeight = 420,
  title = "",
  subtitle = "",
  emptyMessage = "No data returned for the selected window.",
  yAxisName = "",
}) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const hasLoggedChartErrorRef = useRef(false);

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
          series,
          rangeStartMs,
          rangeEndMs,
          emptyMessage,
          yAxisName,
        }),
        { notMerge: true, lazyUpdate: true }
      );
    } catch (error) {
      if (!hasLoggedChartErrorRef.current) {
        console.error("Failed to render time series line chart:", error);
        hasLoggedChartErrorRef.current = true;
      }
    }
  }, [chartData, series, rangeStartMs, rangeEndMs, emptyMessage, yAxisName]);

  return (
    <>
      <style>{timeSeriesLineChartPopInKeyframes}</style>
      <div
        className="w-full rounded-[12px] bg-[#11182766] border border-[#334155] p-1 pb-0"
        style={{
          animation: "timeSeriesLineChartPopIn 900ms ease-out",
          transformOrigin: "center",
          willChange: "transform, opacity",
        }}
      >
        {(title || subtitle) && (
          <div className="mb-3 flex flex-col gap-1 px-2 pt-2">
            {title ? (
              <h3 className="m-0 text-[18px] font-roboto text-[#f8fafc]">{title}</h3>
            ) : null}
            {subtitle ? (
              <p className="m-0 text-[13px] text-[#94a3b8]">{subtitle}</p>
            ) : null}
          </div>
        )}
        <div ref={chartRef} className="w-full" style={{ height: `${chartHeight}px` }} />
      </div>
    </>
  );
};

TimeSeriesLineChart.propTypes = {
  chartData: PropTypes.arrayOf(
    PropTypes.shape({
      timestampLabel: PropTypes.string,
      timestampMs: PropTypes.number,
    })
  ).isRequired,
  chartHeight: PropTypes.number,
  emptyMessage: PropTypes.string,
  rangeEndMs: PropTypes.number,
  rangeStartMs: PropTypes.number,
  series: PropTypes.arrayOf(
    PropTypes.shape({
      color: PropTypes.string,
      dataKey: PropTypes.string.isRequired,
      lineWidth: PropTypes.number,
      name: PropTypes.string.isRequired,
      precision: PropTypes.number,
      smooth: PropTypes.number,
      unit: PropTypes.string,
    })
  ).isRequired,
  subtitle: PropTypes.string,
  title: PropTypes.string,
  yAxisName: PropTypes.string,
};

export default TimeSeriesLineChart;
