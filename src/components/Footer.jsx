import { Box } from "@mui/material";
import PropTypes from "prop-types";

const Footer = ({ className = "" }) => {
  return (
    <footer
      className={`self-stretch bg-[#1e2939] border-[#364153] border-solid border-t-[1px] flex items-center justify-between !pt-2 !pb-2 !pl-6 !pr-6 gap-5 text-left text-xs text-[#6a7282] font-[Inter] mq925:h-auto mq925:flex-wrap mq925:gap-5 ${className}`}
    >
      <Box className="h-4 w-[239.7px] flex items-center gap-4">
        <Box className="h-4 flex-1 flex items-start">
          <div className="relative leading-4 whitespace-nowrap shrink-0">
            © 2026 DRUMS HMI
          </div>
        </Box>
        <Box className="h-4 w-[2.9px] flex items-start">
          <div className="relative leading-4 shrink-0">|</div>
        </Box>
        <Box className="h-4 w-[45px] flex items-start">
          <div className="relative leading-4 whitespace-nowrap shrink-0">
            Ver 4.2.1
          </div>
        </Box>
      </Box>
      <Box className="h-4 w-[291.6px] flex items-center gap-4">
        <Box className="h-4 flex-1 flex items-center gap-2">
          <img className="h-3 w-3 relative" alt="" src="/Icon.svg" />
          <Box className="h-4 flex-1 flex items-start">
            <div className="relative leading-4 whitespace-nowrap shrink-0">
              Last Update: 7:59:12 PM
            </div>
          </Box>
        </Box>
        <Box className="h-4 w-[128.3px] flex items-center gap-2">
          <img className="h-3 w-3 relative" alt="" src="/Icon.svg" />
          <Box className="h-4 flex-1 flex items-start">
            <div className="relative leading-4 whitespace-nowrap shrink-0">
              Network: Connected
            </div>
          </Box>
        </Box>
      </Box>
    </footer>
  );
};

Footer.propTypes = {
  className: PropTypes.string,
};

export default Footer;
