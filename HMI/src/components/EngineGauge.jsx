import { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import * as echarts from "echarts";

const engineGaugePopInKeyframes = `
  @keyframes engineGaugePopIn {
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

const EngineGauge = ({
  title,
  subtitle,
  value,
  min = 0,
  max = 100,
  unit = "%",
  color = "#22c55e",
}) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const resizeObserverRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) {
      return undefined;
    }

    const chart = echarts.init(chartRef.current);
    chartInstanceRef.current = chart;

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });
    resizeObserverRef.current = resizeObserver;

    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      chartInstanceRef.current = null;
      chart.dispose();
    };
  }, []);

  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (!chart) {
      return;
    }

    chart.setOption({
      series: [
        {
          type: "gauge",
          startAngle: 210,
          endAngle: -30,
          min,
          max,
          splitNumber: 5,
          center: ["50%", "60%"],
          radius: "100%",
          itemStyle: {
            color,
          },
          progress: {
            show: true,
            width: 14,
            roundCap: true,
          },
          pointer: {
            show: true,
            length: "62%",
            width: 4,
          },
          axisLine: {
            roundCap: true,
            lineStyle: {
              width: 14,
              color: [[1, "#233044"]],
            },
          },
          axisTick: {
            distance: -20,
            splitNumber: 5,
            lineStyle: {
              color: "#64748b",
              width: 1,
            },
          },
          splitLine: {
            distance: -24,
            length: 10,
            lineStyle: {
              color: "#94a3b8",
              width: 2,
            },
          },
          axisLabel: {
            distance: -2,
            color: "#cbd5e1",
            fontSize: 11,
          },
          anchor: {
            show: true,
            showAbove: true,
            size: 10,
            itemStyle: {
              color,
            },
          },
          title: {
            show: false,
          },
          detail: {
            valueAnimation: true,
            offsetCenter: [0, "65%"],
            color: "#f8fafc",
            fontSize: 22,
            fontWeight: 700,
            formatter: `{value} ${unit}`,
          },
          data: [{ value }],
        },
      ],
    });
  }, [color, max, min, unit, value]);

  return (
    <>
      <style>{engineGaugePopInKeyframes}</style>
      <div
        className="rounded-[12px] bg-transparent border border-[#334155] p-5"
        style={{
          animation: "engineGaugePopIn 900ms ease-out",
          transformOrigin: "center",
          willChange: "transform, opacity",
        }}
      >
        <div className="mb-4">
          <h3 className="m-0 text-[20px] font-roboto text-[#f8fafc]">{title}</h3>
          <p className="mt-2 mb-0 text-[13px] text-[#94a3b8]">{subtitle}</p>
        </div>
        <div ref={chartRef} className="h-[260px] w-full" />
      </div>
    </>
  );
};

EngineGauge.propTypes = {
  color: PropTypes.string,
  max: PropTypes.number,
  min: PropTypes.number,
  subtitle: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  unit: PropTypes.string,
  value: PropTypes.number.isRequired,
};

export default EngineGauge;
