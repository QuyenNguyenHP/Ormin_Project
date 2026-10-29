import { useEffect, useState } from "react";
import { Typography, Box } from "@mui/material";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";

const Header = ({ className = "", modbusConnected = null }) => {
  const [currentTime, setCurrentTime] = useState("");
  const navigate = useNavigate();

  const modbusStatus =
    modbusConnected === null
      ? "CHECKING"
      : modbusConnected
      ? "SUCCESSFUL"
      : "FAILED";

  const modbusStatusColor =
    modbusConnected === null
      ? "#fbbf24"
      : modbusConnected
      ? "#00c950"
      : "#f70808";

  const modbusStatusBackground =
    modbusConnected === null
      ? "#fbbf2440"
      : modbusConnected
      ? "#00c95040"
      : "#f8717133";

  const modbusStatusBorder =
    modbusConnected === null
      ? "#fbbf24b3"
      : modbusConnected
      ? "#00c95099"
      : "#f87171b3";

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const updateCurrentTime = () => {
      setCurrentTime(formatter.format(new Date()).replace(",", ""));
    };

    updateCurrentTime();

    const intervalId = window.setInterval(updateCurrentTime, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <header
      className={`self-stretch shadow-[0px_10px_15px_-3px_#0000001a,_0px_4px_6px_-4px_#0000001a] bg-[#1e2939] border-[#364153] border-solid border-b-[2px] flex items-center justify-between !pt-3 !pb-3 !pl-6 !pr-6 gap-5 top-[0] z-[99] sticky text-left text-xl text-[#f3f4f6] font-[Roboto] ${className}`}
    >
      <button
        type="button"
        onClick={() => navigate("/")}
        className="flex items-center gap-4 bg-transparent border-0 p-0 text-left text-inherit cursor-pointer"
      >
        <img
          className="h-[66px] w-[66px] [filter:drop-shadow(0px_4px_6px_#0000001a)_drop-shadow(0px_2px_4px_#0000001a)] rounded-[10px] object-cover shrink-0"
          loading="lazy"
          alt=""
          src="/DRUMS_logo.png"
        />
        <Box className="flex flex-col items-start shrink-0">
          <Typography
            className="!m-0 relative"
            variant="inherit"
            variantMapping={{ inherit: "h3" }}
            sx={{ fontWeight: "700", lineHeight: "28px", letterSpacing: "0.5px" }}
          >
            ORMIN POWER INC
          </Typography>
          <Typography
            variant="inherit"
            variantMapping={{ inherit: "h3" }}
            sx={{ fontWeight: "700", lineHeight: "28px", letterSpacing: "0.5px" }}
          >
            CDPP2
          </Typography>
        </Box>
      </button>
      <Box className="flex flex-col items-end gap-2">
        <Typography
          variant="inherit"
          variantMapping={{ inherit: "time" }}
          sx={{
            color: "#51a2ff",
            fontSize: "18px",
            lineHeight: "24px",
            letterSpacing: "0.45px",
            fontWeight: "700",
          }}
        >
          {currentTime}
        </Typography>
        <Box
          className={`h-[26px] rounded border-solid border-[1px] box-border flex items-center !pt-1 !pb-1 !pl-3 !pr-3 gap-2 ${
            modbusConnected === false ? "animate-pulse" : ""
          }`}
          sx={{
            backgroundColor: modbusStatusBackground,
            borderColor: modbusStatusBorder,
          }}
        >
          <Box
            className="h-1 w-1 relative rounded-[33554400px]"
            sx={{
              backgroundColor:
                modbusConnected === null
                  ? "#fbbf24"
                  : modbusConnected
                  ? "#00c950"
                  : "#f87171",
              opacity: 0.55,
              boxShadow:
                modbusConnected === null
                  ? "0px 10px 15px -3px #fbbf2480, 0px 4px 6px -4px #fbbf2480"
                  : modbusConnected
                  ? "0px 10px 15px -3px #00c95080, 0px 4px 6px -4px #00c95080"
                  : "0px 10px 15px -3px #f8717180, 0px 4px 6px -4px #f8717180",
            }}
          />
          <div
            className="relative text-[11px] tracking-[0.6px] leading-4 uppercase font-semibold whitespace-nowrap shrink-0"
            style={{ color: modbusStatusColor }}
          >
            Modbus Connection: {modbusStatus}
          </div>
        </Box>
      </Box>
    </header>
  );
};

Header.propTypes = {
  className: PropTypes.string,
  modbusConnected: PropTypes.bool,
};

export default Header;
