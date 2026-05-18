import { Box } from "@mui/material";
import PropTypes from "prop-types";

const DashboardButton = ({
  children,
  active = false,
  className = "",
  onClick,
  sx = {},
  type = "button",
}) => (
  <Box
    component="button"
    type={type}
    onClick={onClick}
    className={`rounded-[10px] border border-solid !px-4 !py-2 text-[14px] font-semibold transition-all duration-200 ${className}`}
    sx={{
      background: active
        ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)"
        : "linear-gradient(135deg, #0f172a 0%, #111827 100%)",
      borderColor: active ? "#60a5fa" : "#334155",
      boxShadow: active
        ? "0 10px 24px rgba(37, 99, 235, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.12)"
        : "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
      color: active ? "#ffffff" : "#cbd5e1",
      opacity: active ? 1 : 0.82,
      transform: active ? "translateY(-1px)" : "translateY(0)",
      cursor: "pointer",
      ...sx,
    }}
  >
    {children}
  </Box>
);

DashboardButton.propTypes = {
  active: PropTypes.bool,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  onClick: PropTypes.func,
  sx: PropTypes.object,
  type: PropTypes.oneOf(["button", "submit", "reset"]),
};

export default DashboardButton;
