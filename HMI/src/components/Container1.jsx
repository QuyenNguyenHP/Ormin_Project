import { Typography, Box } from "@mui/material";
import PropTypes from "prop-types";
import EngineGauge from "./EngineGauge";

const metricDefinitions = [
  { key: "runningHours", label: "Running hours" },
  { key: "engineSpeed", label: "Engine Speed (rpm)", warning: 900, alarm: 1020 },
  { key: "foPress", label: "F.O. press (Mpa)", warning: 0.35, alarm: 0.3, direction: "low"},
  { key: "loPress", label: "L.O Press (Mpa)", warning: 0.35, alarm: 0.3, direction: "low" },
  { key: "loTemp", label: "L.O Temp (C)", warning: 300, alarm: 360 },
  { key: "boostAir", label: "BOOST AIR (Mpa)", warning: 2.0, alarm: 1.5, direction: "low" },
];

const metricStateStyles = {
  normal: {
    rowBackground: "#1e2939",
  },
  warning: {
    rowBackground: "#f1b245",
  },
  alarm: {
    rowBackground: "#f14949",
  },
};

const formatMetricValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? value : value.toFixed(2);
  }

  return value;
};

const getNumericMetricValue = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const getMetricState = (value, metricDefinition) => {
  const numericValue = getNumericMetricValue(value);

  if (numericValue === null) {
    return "normal";
  }

  if (metricDefinition.direction === "low") {
    if (metricDefinition.alarm !== undefined && numericValue <= metricDefinition.alarm) {
      return "alarm";
    }

    if (metricDefinition.warning !== undefined && numericValue <= metricDefinition.warning) {
      return "warning";
    }

    return "normal";
  }

  if (metricDefinition.alarm !== undefined && numericValue >= metricDefinition.alarm) {
    return "alarm";
  }

  if (metricDefinition.warning !== undefined && numericValue >= metricDefinition.warning) {
    return "warning";
  }

  return "normal";
};

const Container1 = ({ engine, className = "" }) => {
  const {
    title,
    serialNo,
    gauge = {},
    metrics = {},
  } = engine;

  return (
    <Box
      className={`rounded-[10px] bg-[#101828] border-[#364153] border-solid border-[1px] box-border max-w-full overflow-hidden flex flex-col items-start !pt-[17px] !pb-4 !pl-4 !pr-4 gap-3 leading-[normal] tracking-[normal] text-left text-[25px] text-[#fff] font-[Roboto] ${className}`}
    >
      <Box className="self-stretch shrink-0">
        <EngineGauge
          title={gauge.title ?? title}
          subtitle={gauge.subtitle ?? "Live engine data"}
          value={Number(gauge.value ?? 0)}
          min={Number(gauge.min ?? 0)}
          max={Number(gauge.max ?? 100)}
          unit={gauge.unit ?? "%"}
          color={gauge.color ?? "#22c55e"}
        />
      </Box>

      {metricDefinitions.map((metric) => {
        const metricValue = metrics[metric.key];
        const metricState = getMetricState(metricValue, metric);
        const stateStyle = metricStateStyles[metricState];

        return (
          <Box
            key={metric.key}
            className="self-stretch min-h-[50px] rounded-[10px] border-[#364153] border-solid border-[1px] box-border overflow-hidden shrink-0 flex items-center justify-between gap-4 !py-2 !pl-2 !pr-2"
            sx={{
              backgroundColor: stateStyle.rowBackground,
            }}
          >
            <Typography
              className="!m-0 flex-1 relative inline-block shrink-0"
              variant="inherit"
              variantMapping={{ inherit: "h3" }}
              sx={{ fontSize: "16px", fontWeight: "600", lineHeight: 1.25 }}
            >
              {metric.label}
            </Typography>
            <Typography
              className="!m-0 relative text-right"
              variant="inherit"
              variantMapping={{ inherit: "h3" }}
              sx={{ fontSize: "16px", fontWeight: "600", lineHeight: 1.25 }}
            >
              {formatMetricValue(metricValue)}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

const gaugePropType = PropTypes.shape({
  color: PropTypes.string,
  max: PropTypes.number,
  min: PropTypes.number,
  subtitle: PropTypes.string,
  title: PropTypes.string,
  unit: PropTypes.string,
  value: PropTypes.number,
});

const metricsPropType = PropTypes.shape({
  boostAir: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  engineSpeed: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  foPress: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  loPress: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  loTemp: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  runningHours: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
});

Container1.propTypes = {
  className: PropTypes.string,
  engine: PropTypes.shape({
    gauge: gaugePropType,
    metrics: metricsPropType,
    serialNo: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    title: PropTypes.string.isRequired,
  }).isRequired,
};

export default Container1;
