import { Box, Typography } from "@mui/material";
import PropTypes from "prop-types";

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

const EngineMetricGroupCard = ({ group, className = "", sx = {} }) => (
  <Box
    className={`self-start w-[350px] min-w-[350px] max-w-[350px] rounded-[14px] border border-[#cbd5e11a] bg-[#0f172a59] p-4 backdrop-blur-[0px] ${className}`}
    sx={{
      boxShadow: "0 10px 22px rgba(15, 23, 42, 0.16)",
      ...sx,
    }}
  >
    <Box className="flex w-full rounded-[10px] border border-[#e2e8f024] bg-[#7D8797] px-3 py-2">
      <Typography className="text-[15px] font-bold tracking-[0.04em] text-[#f8fafc]">
        {group.title}
      </Typography>
    </Box>

    <Box className="mt-3 flex flex-col gap-2">
      {group.metrics.map((metric) => (
        <Box
          key={metric.key}
          className="flex items-center justify-between gap-4 border-b border-[#e2e8f014] pb-2 last:border-b-0 last:pb-0"
        >
          <Typography className="text-[13px] text-[#dbe4ee]">{metric.label}</Typography>
          <Typography className="whitespace-nowrap text-[13px] font-semibold text-[#ffffff]">
            {formatMetricValue(metric.value, metric.unit)}
          </Typography>
        </Box>
      ))}
    </Box>
  </Box>
);

EngineMetricGroupCard.propTypes = {
  className: PropTypes.string,
  group: PropTypes.shape({
    key: PropTypes.string,
    metrics: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        unit: PropTypes.string,
        value: PropTypes.oneOfType([PropTypes.number, PropTypes.string, PropTypes.oneOf([null])]),
      })
    ).isRequired,
    title: PropTypes.string.isRequired,
  }).isRequired,
  sx: PropTypes.object,
};

export default EngineMetricGroupCard;
