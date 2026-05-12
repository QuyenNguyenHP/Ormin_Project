import { Box, Typography } from "@mui/material";
import { NavLink } from "react-router-dom";
import PropTypes from "prop-types";

const NavigationSidebar = ({ className = "" }) => {
  const navItemClass = ({ isActive }) =>
    `self-stretch h-11 flex items-center !pt-3 !pb-3 !pl-4 !pr-4 box-border gap-3 text-[#99A1AF] no-underline hover:no-underline ${
      isActive ? "bg-[#155dfc] text-[#fff]" : ""
    }`;

  return (
    <section
      className={`h-[916px] w-[222px] overflow-hidden rounded-[10px] shadow-[0px_10px_15px_-3px_rgba(0,_0,_0,_0.1),_0px_4px_6px_-4px_rgba(0,_0,_0,_0.1)] bg-[#1e2939] border-[#364153] border-solid border-[1px] box-border flex flex-col items-start text-left text-xs text-[#99a1af] font-[Inter] shrink-0 !mt-4 !ml-4 mq925:h-auto ${className}`}
    >
      <Box className="w-[222px] h-[49px] border-[#364153] border-solid border-b-[1px] box-border flex flex-col items-start !pt-4 !pb-px !pl-4 !pr-4">
        <Box className="self-stretch h-4 flex items-start">
          <div className="flex-1 relative tracking-[0.6px] leading-4 uppercase font-semibold">
            Navigation
          </div>
        </Box>
      </Box>

      <Box className="w-[222px] flex-1 overflow-hidden flex flex-col items-start !pt-2 !pb-0 !pl-0 !pr-0 box-border text-sm">
        <NavLink
          to="/"
          end
          className={navItemClass}
          style={({ isActive }) => ({
            borderLeft: isActive ? "4px solid #51A2FF" : undefined,
            background: isActive ? "#155dfc" : undefined,
          })}
        >
          {({ isActive }) => (
            <>
              <img
                className="h-5 w-5 relative"
                alt=""
                src="/overview.png"
                style={{
                  filter: isActive
                    ? "brightness(0) invert(1)"
                    : "grayscale(1) brightness(0.7)",
                }}
              />
              <Box className="h-5 flex-1 flex items-start">
                <div className="flex-1 relative leading-5 font-medium">Overview</div>
              </Box>
            </>
          )}
        </NavLink>

        <NavLink
          to="/engine"
          className={navItemClass}
          style={({ isActive }) => ({
            borderLeft: isActive ? "4px solid #51A2FF" : undefined,
            background: isActive ? "#155DFC" : undefined,
          })}
        >
          {({ isActive }) => (
            <>
              <img
                className="h-5 w-5 relative"
                alt=""
                src="/Icon.svg"
                style={{
                  filter: isActive
                    ? "brightness(0) invert(1)"
                    : "grayscale(1) brightness(0.7)",
                }}
              />
              <Box className="h-5 flex-1 flex items-start">
                <div className="flex-1 relative leading-5 font-medium">Engine</div>
              </Box>
            </>
          )}
        </NavLink>

        <NavLink
          to="/power"
          className={navItemClass}
          style={({ isActive }) => ({
            borderLeft: isActive ? "4px solid #51A2FF" : undefined,
            background: isActive ? "#155DFC" : undefined,
          })}
        >
          {({ isActive }) => (
            <>
              <img
                className="h-5 w-5 relative"
                alt=""
                src="/Icon.svg"
                style={{
                  filter: isActive
                    ? "brightness(0) invert(1)"
                    : "grayscale(1) brightness(0.7)",
                }}
              />
              <Box className="h-5 flex-1 flex items-start">
                <div className="flex-1 relative leading-5 font-medium">Power</div>
              </Box>
            </>
          )}
        </NavLink>

        <NavLink
          to="/exhaust"
          className={navItemClass}
          style={({ isActive }) => ({
            borderLeft: isActive ? "4px solid #51A2FF" : undefined,
            background: isActive ? "#155DFC" : undefined,
          })}
        >
          {({ isActive }) => (
            <>
              <img
                className="h-5 w-5 relative"
                alt=""
                src="/Icon.svg"
                style={{
                  filter: isActive
                    ? "brightness(0) invert(1)"
                    : "grayscale(1) brightness(0.7)",
                }}
              />
              <Box className="h-5 flex-1 flex items-start">
                <div className="flex-1 relative leading-5 font-medium">Exhaust</div>
              </Box>
            </>
          )}
        </NavLink>

        <NavLink
          to="/pid"
          className={navItemClass}
          style={({ isActive }) => ({
            borderLeft: isActive ? "4px solid #51A2FF" : undefined,
            background: isActive ? "#155DFC" : undefined,
          })}
        >
          {({ isActive }) => (
            <>
              <img
                className="h-5 w-5 relative"
                alt=""
                src="/P&ID.svg"
                style={{
                  filter: isActive
                    ? "brightness(0) invert(1)"
                    : "grayscale(1) brightness(0.7)",
                }}
              />
              <Box className="h-5 flex-1 flex items-start">
                <div className="flex-1 relative leading-5 font-medium">{`P&ID`}</div>
              </Box>
            </>
          )}
        </NavLink>

        <NavLink
          to="/alarms"
          className={navItemClass}
          style={({ isActive }) => ({
            borderLeft: isActive ? "4px solid #51A2FF" : undefined,
            background: isActive ? "#155DFC" : undefined,
          })}
        >
          {({ isActive }) => (
            <>
              <img
                className="h-5 w-5 relative"
                alt=""
                src="/Icon.svg"
                style={{
                  filter: isActive
                    ? "brightness(0) invert(1)"
                    : "grayscale(1) brightness(0.7)",
                }}
              />
              <Box className="h-5 flex-1 flex items-start">
                <div className="flex-1 relative leading-5 font-medium">Alarms</div>
              </Box>
              <Box className="h-5 w-[22.9px] rounded-[33554400px] bg-[#364153] shrink-0 flex items-start !pt-0.5 !pb-0.5 !pl-2 !pr-1.5 box-border text-center text-xs">
                <Typography
                  className="relative"
                  variant="inherit"
                  variantMapping={{ inherit: "b" }}
                  sx={{ lineHeight: "16px", fontWeight: "700" }}
                >
                  0
                </Typography>
              </Box>
            </>
          )}
        </NavLink>
      </Box>

      <Box className="w-[222px] h-[69px] border-[#364153] border-solid border-t-[1px] box-border flex flex-col items-start !pt-[17px] !pb-0 !pl-4 !pr-4 text-[#6a7282]">
        <Box className="self-stretch h-9 flex flex-col items-start gap-1">
          <Box className="self-stretch h-4 flex items-start justify-between gap-5">
            <Box className="h-4 w-[82.7px] flex items-start">
              <div className="relative leading-4 whitespace-nowrap shrink-0">
                Stations Online:
              </div>
            </Box>
            <Box className="h-4 w-[18.3px] flex items-start text-[#05df72]">
              <div className="relative leading-4 font-semibold shrink-0">
                8/8
              </div>
            </Box>
          </Box>
          <Box className="self-stretch h-4 flex items-start justify-between gap-5">
            <Box className="h-4 w-[83.2px] flex items-start">
              <div className="relative leading-4 whitespace-nowrap shrink-0">
                Network Status:
              </div>
            </Box>
            <Box className="h-4 w-[29.9px] flex items-start text-[#05df72]">
              <div className="relative leading-4 font-semibold shrink-0">
                Good
              </div>
            </Box>
          </Box>
        </Box>
      </Box>
    </section>
  );
};

NavigationSidebar.propTypes = {
  className: PropTypes.string,
};

export default NavigationSidebar;
