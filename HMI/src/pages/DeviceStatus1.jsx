import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import Footer from "../components/Footer";
import DashboardButton from "../components/DashboardButton";
import { usePolledPagePayload } from "../hooks/usePolledPagePayload";
import {
  buildDeviceStatusMonitorDataFromPagePayload,
  updateDeviceStatusMonitorElements,
} from "../utils/deviceStatusMonitor";

const DEVICE_LISTS = [
  {
    name: "Device list 1",
    pageName: "device_status_1",
    backgroundPath: "/Device_Status_1.png",
    svgPath: "/Indicator1.svg",
  },
  {
    name: "Device list 2",
    pageName: "device_status_2",
    backgroundPath: "/Device_Status_2.png",
    svgPath: "/Indicator2.svg",
  },
  {
    name: "Device list 3",
    pageName: "device_status_1",
    backgroundPath: "/Device_Status_1.png",
    svgPath: "/Indicator1.svg",
  },
  {
    name: "Device list 4",
    pageName: "device_status_1",
    backgroundPath: "/Device_Status_1.png",
    svgPath: "/Indicator1.svg",
  },
];

const SelectDeviceListButtons = ({ selectedDeviceName, onSelectDevice }) => (
  <Box className="flex flex-wrap items-center gap-3">
    <Typography className="text-[#cbd5e1] font-medium">Select device list:</Typography>
    {DEVICE_LISTS.map((device) => (
      <DashboardButton
        key={device.name}
        active={selectedDeviceName === device.name}
        onClick={() => onSelectDevice(device.name)}
      >
        {device.name}
      </DashboardButton>
    ))}
  </Box>
);

const DeviceStatus1 = () => {
  const svgObjectRef = useRef(null);
  const [monitorData, setMonitorData] = useState(null);
  const [selectedDeviceName, setSelectedDeviceName] = useState("Device list 1");

  const selectedDevice = useMemo(
    () => DEVICE_LISTS.find((device) => device.name === selectedDeviceName) ?? DEVICE_LISTS[0],
    [selectedDeviceName],
  );

  const { payload, error, lastUpdated, pollIntervalMs } =
    usePolledPagePayload(selectedDevice.pageName);
  const modbusConnected = error ? false : payload ? true : null;

  useEffect(() => {
    setMonitorData(null);
  }, [selectedDevice.pageName]);

  useEffect(() => {
    if (!payload) {
      if (error) {
        console.error(`Failed to load ${selectedDevice.pageName} data:`, error);
        setMonitorData(null);
      }
      return;
    }

    setMonitorData(buildDeviceStatusMonitorDataFromPagePayload(payload));
  }, [error, payload, selectedDevice.pageName]);

  const svgResetKey =
    modbusConnected === false
      ? `${selectedDevice.pageName}-base`
      : `${selectedDevice.pageName}-live`;

  useEffect(() => {
    const svgDocument = svgObjectRef.current?.contentDocument;
    updateDeviceStatusMonitorElements(svgDocument, monitorData);
  }, [monitorData, selectedDevice.svgPath]);

  const handleSvgLoad = () => {
    const svgDocument = svgObjectRef.current?.contentDocument;

    if (modbusConnected === false) {
      return;
    }

    updateDeviceStatusMonitorElements(svgDocument, monitorData);
  };

  return (
    <Box className="h-[1080px] relative bg-[#101828] w-full overflow-hidden shrink-0 flex flex-col items-start leading-[normal] tracking-[normal] mq925:h-auto">
      <Header modbusConnected={modbusConnected} />
      <main className="self-stretch h-[955px] overflow-hidden shrink-0 flex items-start [row-gap:20px] max-w-full mq1825:flex-wrap">
        <NavigationSidebar />
        <section className="h-[948px] w-[1696px] overflow-hidden shrink-0 flex items-start !p-4 box-border gap-4 max-w-full text-left text-[#f8fafc] font-[Roboto] mq925:h-auto">
          <Box className="min-h-[916px] flex-1 rounded-[10px] bg-[#1e2939] border-[#364153] border-solid border-[1px] box-border overflow-auto flex flex-col items-start !p-6 max-w-full shrink-0">
            <SelectDeviceListButtons
              selectedDeviceName={selectedDeviceName}
              onSelectDevice={setSelectedDeviceName}
            />

            <Box className="mt-6 w-full rounded-[18px] border border-[#475569] overflow-hidden relative">
              <Box
                className="absolute inset-0"
                sx={{
                  "@keyframes deviceStatusImagePopIn": {
                    "0%": {
                      opacity: 0,
                      transform: "scale(0.94)",
                    },
                    "65%": {
                      opacity: 0.68,
                      transform: "scale(1.02)",
                    },
                    "100%": {
                      opacity: 0.6,
                      transform: "scale(1)",
                    },
                  },
                  backgroundImage: "url('/engine_image.png')",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "80%",
                  opacity: 0.6,
                  filter: "saturate(0.9)",
                  transformOrigin: "center",
                  animation: "deviceStatusImagePopIn 900ms ease-out",
                  willChange: "transform, opacity",
                }}
              />
              <Box
                className="absolute inset-0"
                sx={{
                  background:
                    "radial-gradient(circle at top, rgba(59, 130, 246, 0.08), transparent 34%), linear-gradient(180deg, rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0.74))",
                }}
              />

              <Box className="relative z-[1] p-5 md:p-6">
                <Box className="flex flex-wrap items-center justify-between gap-3">
                  <Typography className="text-[14px] font-medium text-[#e2e8f0]">
                    {selectedDevice.name}
                  </Typography>

                  {error ? (
                    <Typography className="text-[13px] text-[#fca5a5]">
                      Backend unavailable, showing the latest available overlay.
                    </Typography>
                  ) : null}
                </Box>

                <Box className="mt-6 relative min-h-[720px] w-full rounded-[14px] border border-[#364153] bg-[rgba(15,23,42,0.42)] overflow-hidden">
                  <img
                    className="absolute inset-0 h-full w-full object-contain"
                    alt={`${selectedDevice.name} background`}
                    src={selectedDevice.backgroundPath}
                  />
                  <object
                    key={svgResetKey}
                    ref={svgObjectRef}
                    aria-label={`${selectedDevice.name} indicators overlay`}
                    className="absolute inset-0 h-full w-full"
                    data={selectedDevice.svgPath}
                    onLoad={handleSvgLoad}
                    type="image/svg+xml"
                  >
                    <img
                      className="h-full w-full object-contain"
                      alt={`${selectedDevice.name} indicators overlay`}
                      src={selectedDevice.svgPath}
                    />
                  </object>
                </Box>
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

export default DeviceStatus1;
