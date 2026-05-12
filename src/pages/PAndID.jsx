import { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import Footer from "../components/Footer";
import {
  buildPIDMonitorDataFromModbus,
  updatePIDMonitorElements,
} from "../utils/PIDMonitor";
import { fetchPIDMonitorPayload } from "../services/pidMonitorApi";

const PAndID = () => {
  const svgObjectRef = useRef(null);
  const [monitorData, setMonitorData] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadPIDMonitor = async () => {
      try {
        const payload = await fetchPIDMonitorPayload();
        if (!isMounted) return;
        setMonitorData(buildPIDMonitorDataFromModbus(payload));
      } catch (error) {
        console.error("Failed to load PID monitor data:", error);
      }
    };

    loadPIDMonitor();

    const intervalId = window.setInterval(loadPIDMonitor, 2000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const svgDocument = svgObjectRef.current?.contentDocument;
    updatePIDMonitorElements(svgDocument, monitorData);
  }, [monitorData]);

  const handleSvgLoad = () => {
    const svgDocument = svgObjectRef.current?.contentDocument;
    updatePIDMonitorElements(svgDocument, monitorData);
  };

  return (
    <Box className="h-[1080px] relative bg-[#101828] w-full overflow-hidden shrink-0 flex flex-col items-start leading-[normal] tracking-[normal] mq925:h-auto">
      <Header />
      <main className="self-stretch h-[955px] overflow-hidden shrink-0 flex items-start [row-gap:20px] max-w-full mq1825:flex-wrap">
        <NavigationSidebar />
        <section className="h-[948px] w-[1696px] overflow-hidden shrink-0 flex items-start !p-4 box-border gap-4 max-w-full text-center text-xs text-[#ff0909] font-[Roboto] mq925:h-auto">
          <Box className="h-[916px] flex-1 rounded-[10px] bg-[#1e2939] border-[#364153] border-solid border-[1px] box-border overflow-hidden flex flex-col items-start !pt-[15px] !pb-0 !pl-4 !pr-4 max-w-full shrink-0 mq925:h-auto">
            <Box className="relative self-stretch flex-1 w-full overflow-hidden rounded-[10px] bg-[#111827]">
              <Box className="absolute inset-[10px] overflow-hidden rounded-[10px] border border-[#364153] bg-[#0f172a]">
                <img
                  className="absolute inset-0 h-full w-full object-contain"
                  alt="P&ID background"
                  src="/P&IDbackground.png"
                />
                <object
                  ref={svgObjectRef}
                  aria-label="Monitor items overlay"
                  className="absolute inset-0 h-full w-full"
                  data="/Monitor items.svg"
                  onLoad={handleSvgLoad}
                  type="image/svg+xml"
                >
                  <img
                    className="h-full w-full object-contain"
                    alt="Monitor items overlay"
                    src="/Monitor items.svg"
                  />
                </object>
              </Box>
            </Box>
          </Box>
        </section>
      </main>
      <Footer />
    </Box>
  );
};

export default PAndID;
