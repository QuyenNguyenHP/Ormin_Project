import { Box, Typography } from "@mui/material";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

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
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  const numericValue = Number(value);
  const formattedValue = Number.isInteger(numericValue)
    ? numericValue.toLocaleString()
    : numericValue.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });

  return unit ? `${formattedValue} ${unit}` : formattedValue;
};

const getMetricState = (metric) => {
  if (metric.state && metricStateStyles[metric.state]) {
    return metric.state;
  }

  return "normal";
};

const EngineMetricGroupCard = ({ group, className = "", sx = {}, titleTo = "" }) => {
  const titleIsLink = Boolean(titleTo);
  const titleWrapperProps = titleIsLink
    ? {
        component: Link,
        to: titleTo,
      }
    : {};

  return (
    <Box
      className={`self-start w-[350px] min-w-[350px] max-w-[350px] rounded-[14px] border border-[#cbd5e11a] bg-[#0f172a59] p-4 backdrop-blur-[0px] ${className}`}
      sx={{
        boxShadow: "0 10px 22px rgba(15, 23, 42, 0.16)",
        ...sx,
      }}
    >
      <Box
        {...titleWrapperProps}
        className="flex w-full rounded-[10px] border border-[#e2e8f024] bg-[#7D8797] px-3 py-2"
        sx={{
          textDecoration: "none",
          cursor: titleIsLink ? "pointer" : "default",
          transition: "transform 180ms ease, filter 180ms ease, box-shadow 180ms ease",
          "&:hover": titleIsLink
            ? {
                transform: "translateY(-1px) scale(1.01)",
                filter: "brightness(1.08)",
                boxShadow: "0 8px 20px rgba(15, 23, 42, 0.18)",
              }
            : undefined,
        }}
      >
        <Typography className="text-[15px] font-bold tracking-[0.04em] text-[#f8fafc]">
          {group.title}
        </Typography>
      </Box>

      <Box className="mt-3 flex flex-col gap-[1px]">
        {group.metrics.map((metric) => {
          const metricState = getMetricState(metric);
          const stateStyle = metricStateStyles[metricState];

          return (
            <Box
              key={metric.key}
              className="flex items-center justify-between gap-4 border-b border-[#e2e8f014] pb-[2px] last:border-b-0 last:pb-0"
              sx={{ paddingTop: "1px" }}
            >
              <Typography className="text-[13px] text-[#dbe4ee]">{metric.label}</Typography>
              <Box
                className="rounded-[8px] px-2 py-1"
                sx={{
                  backgroundColor: stateStyle.rowBackground,
                }}
              >
                <Typography className="whitespace-nowrap text-[13px] font-semibold text-[#ffffff]">
                  {formatMetricValue(metric.value, metric.unit)}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

EngineMetricGroupCard.propTypes = {
  className: PropTypes.string,
  group: PropTypes.shape({
    key: PropTypes.string,
    metrics: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        state: PropTypes.oneOf(["normal", "warning", "alarm"]),
        unit: PropTypes.string,
        value: PropTypes.oneOfType([PropTypes.number, PropTypes.string, PropTypes.oneOf([null])]),
      })
    ).isRequired,
    title: PropTypes.string.isRequired,
  }).isRequired,
  sx: PropTypes.object,
  titleTo: PropTypes.string,
};

export default EngineMetricGroupCard;
