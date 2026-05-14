import { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import Footer from "../components/Footer";
import {
  buildPIDMonitorDataFromPagePayload,
  updatePIDMonitorElements,
} from "../utils/PIDMonitor";
import { usePolledPagePayload } from "../hooks/usePolledPagePayload";

const PAndID = () => {
  const svgObjectRef = useRef(null);
  const { payload, error, lastUpdated, pollIntervalMs } = usePolledPagePayload("pid");
  const [monitorData, setMonitorData] = useState(null);
  const modbusConnected = error ? false : payload ? true : null;
  const svgResetKey = modbusConnected === false ? "monitor-base" : "monitor-live";

  useEffect(() => {
    if (!payload) {
      if (error) {
        console.error("Failed to load PID monitor data:", error);
        setMonitorData(null);
      }
      return;
    }

    setMonitorData(buildPIDMonitorDataFromPagePayload(payload));
  }, [error, payload]);

  useEffect(() => {
    const svgDocument = svgObjectRef.current?.contentDocument;
    updatePIDMonitorElements(svgDocument, monitorData);
  }, [monitorData]);

  const handleSvgLoad = () => {
    const svgDocument = svgObjectRef.current?.contentDocument;

    if (modbusConnected === false) return;

    updatePIDMonitorElements(svgDocument, monitorData);
  };

  return (
    <Box className="h-[1080px] relative bg-[#101828] w-full overflow-hidden shrink-0 flex flex-col items-start leading-[normal] tracking-[normal] mq925:h-auto">
      <Header modbusConnected={modbusConnected} />
      <main className="self-stretch h-[955px] overflow-hidden shrink-0 flex items-start [row-gap:20px] max-w-full mq1825:flex-wrap">
        <NavigationSidebar />
        <section className="h-[948px] w-[1696px] overflow-hidden shrink-0 flex items-start !p-4 box-border gap-4 max-w-full text-center text-xs text-[#ff0909] font-[Roboto] mq925:h-auto">
          <Box className="h-[916px] flex-1 overflow-hidden rounded-[10px] bg-[#1e2939] border-[#364153] border-solid border-[1px] box-border overflow-hidden flex flex-col items-start !pt-[15px] !pb-0 !pl-4 !pr-4 max-w-full shrink-0 mq925:h-auto">
            <Box className="relative self-stretch flex-1 w-full overflow-hidden rounded-[10px] bg-[#111827]">
              <Box className="relative h-full w-full overflow-hidden rounded-[4px] border border-[#364153] bg-[#0f172a]">
                <img
                  className="absolute inset-0 h-full w-full object-contain"
                  alt="P&ID background"
                  src="/P&IDbackground.png"
                />
                <object
                  key={svgResetKey}
                  ref={svgObjectRef}
                  aria-label="Monitor items overlay"
                  className="absolute inset-0 h-full w-full"
                  data="/Monitor%20items.svg"
                  onLoad={handleSvgLoad}
                  type="image/svg+xml"
                >
                  <img
                    className="h-full w-full object-contain"
                    alt="Monitor items overlay"
                    src="/Monitor%20items.svg"
                  />
                </object>
              </Box>
            </Box>
          </Box>
        </section>
      </main>
      <Footer
        lastUpdated={lastUpdated}
        networkStatus={
          modbusConnected === false
            ? "Disconnected"
            : modbusConnected
              ? "Connected"
              : "Connecting..."
        }
        pollIntervalMs={pollIntervalMs}
      />
    </Box>
  );
};

export default PAndID;
