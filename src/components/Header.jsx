import { useEffect, useState } from "react";
import { Typography, Box } from "@mui/material";
import PropTypes from "prop-types";

const Header = ({ className = "" }) => {
  const [currentTime, setCurrentTime] = useState("");

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
      className={`self-stretch shadow-[0px_10px_15px_-3px_rgba(0,_0,_0,_0.1),_0px_4px_6px_-4px_rgba(0,_0,_0,_0.1)] bg-[#1e2939] border-[#364153] border-solid border-b-[2px] flex items-center justify-between !pt-4 !pb-4 !pl-6 !pr-6 gap-5 top-[0] z-[99] sticky text-left text-xl text-[#f3f4f6] font-[Inter] ${className}`}
    >
      <Box className="h-[58px] w-[597px] flex items-center gap-6">
        <img
          className="h-[66px] w-[66px] [filter:drop-shadow(0px_4px_6px_rgba(0,_0,_0,_0.1))_drop-shadow(0px_2px_4px_rgba(0,_0,_0,_0.1))] rounded-[10px] object-cover shrink-0"
          loading="lazy"
          alt=""
          src="/DRUMS_logo.png"
        />
        <Box className="h-[58px] flex-1 flex flex-col items-start gap-1 shrink-0">
          <Box className="w-[419px] flex-1 flex items-start">
            <Typography
              className="!m-0 relative"
              variant="inherit"
              variantMapping={{ inherit: "h3" }}
              sx={{
                fontWeight: "700",
                lineHeight: "28px",
                letterSpacing: "0.5px",
              }}
            >
              ORMIN-ORMECO
            </Typography>
          </Box>
          <Box className="w-[419px] h-[26px] flex items-center text-xs text-[#05df72]">
            <Box className="h-[26px] w-[186px] rounded bg-[rgba(13,84,43,0.4)] border-[rgba(0,201,80,0.6)] border-solid border-[1px] box-border flex items-center !pt-1 !pb-1 !pl-3 !pr-3 gap-2">
              <Box className="h-2 w-2 relative shadow-[0px_10px_15px_-3px_rgba(0,_201,_80,_0.5),_0px_4px_6px_-4px_rgba(0,_201,_80,_0.5)] rounded-[33554400px] bg-[#00c950] opacity-[0.55]" />
              <Box className="h-4 flex-1 flex items-start">
                <div className="relative tracking-[0.6px] leading-4 uppercase font-semibold whitespace-nowrap shrink-0">
                  MODBUS CONNECTION
                </div>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
      <Box className="h-[46px] w-[300.1px] flex items-center gap-6 text-lg text-[#51a2ff] font-[Consolas] mq1350:w-16">
        <Box className="h-[46px] flex-1 rounded-[10px] bg-[rgba(16,24,40,0.5)] border-[#4a5565] border-solid border-[1px] box-border flex flex-col items-start !pt-[9px] !pb-px !pl-4 !pr-[15px] mq1350:hidden">
          <Typography
            className="relative mq925:hidden"
            variant="inherit"
            variantMapping={{ inherit: "b" }}
            sx={{
              lineHeight: "28px",
              letterSpacing: "0.45px",
              fontWeight: "700",
            }}
          >
            {currentTime}
          </Typography>
        </Box>
        <button className="cursor-pointer border-[#4a5565] border-solid border-[1px] !pt-0 !pb-0 !pl-[9px] !pr-[9px] bg-[#364153] h-10 w-10 rounded-[33554400px] box-border flex items-center justify-center">
          <img className="h-5 w-5 relative" alt="" src="/Icon.svg" />
        </button>
      </Box>
    </header>
  );
};

Header.propTypes = {
  className: PropTypes.string,
};

export default Header;
