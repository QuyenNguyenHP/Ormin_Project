import { Typography, Box } from "@mui/material";
import PropTypes from "prop-types";
import EngineGauge from "./EngineGauge";

const metricDefinitions = [
  { key: "runningHours", label: "Running hours", unit: "h" },
  { key: "engineSpeed", label: "Engine Speed", unit: "rpm" },
  { key: "foPress", label: "F.O. press", unit: "MPa" },
  { key: "loPress", label: "L.O Press", unit: "MPa" },
  { key: "loTemp", label: "L.O Temp", unit: "°C" },
  { key: "boostAir", label: "BOOST AIR", unit: "MPa" },
];

const metricStateStyles = {
  normal: {
    rowBackground: "transparent",
  },
  warning: {
    rowBackground: "#f1b245cc",
  },
  alarm: {
    rowBackground: "#f14949cc",
  },
};

const formatMetricValue = (value, unit = "") => {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  if (typeof value === "number") {
    const formattedValue = Number.isInteger(value) ? value : value.toFixed(2);
    return unit ? `${formattedValue} ${unit}` : formattedValue;
  }

  return unit ? `${value} ${unit}` : value;
};

const getMetricState = (metricPayload) => {
  if (
    metricPayload &&
    typeof metricPayload === "object" &&
    typeof metricPayload.state === "string" &&
    metricPayload.state in metricStateStyles
  ) {
    return metricPayload.state;
  }

  return "normal";
};

const getMetricValue = (metricPayload) => {
  if (metricPayload && typeof metricPayload === "object" && "value" in metricPayload) {
    return metricPayload.value;
  }

  return metricPayload;
};

const Container1 = ({ engine, className = "" }) => {
  const {
    title,
    gauge = {},
    metrics = {},
  } = engine;

  return (
    <Box
      className={`rounded-[10px] bg-[#10182866] border-[#364153] border-solid border-[1px] box-border max-w-full overflow-hidden flex flex-col items-start !pt-[17px] !pb-4 !pl-4 !pr-4 gap-3 leading-[normal] tracking-[normal] text-left text-[25px] text-[#fff] font-[Roboto] ${className}`}
    >
      <Box className="self-stretch shrink-0">
        <EngineGauge
          title={gauge.title ?? title}
          subtitle={gauge.subtitle ?? "Live engine data"}
          value={Number(gauge.value ?? 0)}
          min={Number(gauge.min ?? 0)}
          max={Number(gauge.max ?? 100)}
          unit={gauge.unit ?? "%"}
          color={gauge.color ?? "#377edb"}
        />
      </Box>

      {metricDefinitions.map((metric) => {
        const metricPayload = metrics[metric.key];
        const metricValue = getMetricValue(metricPayload);
        const metricState = getMetricState(metricPayload);
        const stateStyle = metricStateStyles[metricState];

        return (
          <Box
            key={metric.key}
            className="self-stretch min-h-[50px] rounded-[10px] border-[#364153] border-solid border-[1px] box-border overflow-hidden shrink-0 flex items-center justify-between gap-4 !py-2 !pl-2 !pr-2"
          >
            <Typography
              className="!m-0 flex-1 relative inline-block shrink-0"
              variant="inherit"
              variantMapping={{ inherit: "h3" }}
              sx={{ fontSize: "16px", fontWeight: "600", lineHeight: 1.25 }}
            >
              {metric.label}
            </Typography>
            <Box
              className="rounded-[8px] !px-2 !py-1"
              sx={{
                backgroundColor: stateStyle.rowBackground,
              }}
            >
              <Typography
                className="!m-0 relative text-right"
                variant="inherit"
                variantMapping={{ inherit: "h3" }}
                sx={{ fontSize: "16px", fontWeight: "600", lineHeight: 1.25 }}
              >
                {formatMetricValue(metricValue, metric.unit)}
              </Typography>
            </Box>
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

const metricPayloadPropType = PropTypes.oneOfType([
  PropTypes.number,
  PropTypes.string,
  PropTypes.shape({
    state: PropTypes.oneOf(["normal", "warning", "alarm"]),
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }),
]);

const metricsPropType = PropTypes.shape({
  boostAir: metricPayloadPropType,
  engineSpeed: metricPayloadPropType,
  foPress: metricPayloadPropType,
  loPress: metricPayloadPropType,
  loTemp: metricPayloadPropType,
  runningHours: metricPayloadPropType,
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
