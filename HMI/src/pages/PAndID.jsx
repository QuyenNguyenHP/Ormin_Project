import { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import Footer from "../components/Footer";
import { usePolledPagePayload } from "../hooks/usePolledPagePayload";

const FLOW_IDS = [
  "D.O Transfer Flow",
  "H.O Transfer Flow",
  "D.O Inlet Flow DG#1",
  "H.O Inlet Flow DG#1",
  "D.O Inlet Flow DG#2",
  "H.O Inlet Flow DG#2",
  "D.O Inlet Flow DG#3",
  "H.O Inlet Flow DG#3",
  "D.O Inlet Flow DG#4",
  "H.O Inlet Flow DG#4",
  "D.O Outlet Flow DG#1",
  "H.O Outlet Flow DG#1",
  "D.O Outlet Flow DG#2",
  "H.O Outlet Flow DG#2",
  "D.O Outlet Flow DG#3",
  "H.O Outlet Flow DG#3",
  "D.O Outlet Flow DG#4",
  "H.O Outlet Flow DG#4",
];

const DIGITAL_IDS = [
  "pump 1",
  "pump 2",
  "pump 3",
  "pump 4",
  "pump 5",
  "pump 6",
  "pump 7",
  "pump 8",
  "pump 9",
  "pump 10",
  "pump 11",
  "pump 12",
  "pump 13",
  "pump 14",
  "LC_D.O.service.tank",
  "LC_H.O.settling.tank",
  "LH_D.O.service.tank",
  "LH_F.O. drain tank",
  "LH_H.O.settling.tank",
  "LL_D.O.service.tank",
  "LL_F.O. drain tank",
  "LL_H.O.service.tank",
  "LL_H.O.settling.tank",
  "LS_Sludge.tank",
  "TS_D.O.service.tank",
  "TS_F.O. drain tank",
  "TS_H.O.purifier.No1",
  "TS_H.O.purifier.No2",
  "TS_H.O.purifier.No3",
  "TS_H.O.settling.tank",
  "TS1_H.O.service.tank",
  "TS2_H.O.service.tank",
  "TSH_D.O.service.tank",
  "TSH_F.O. drain tank",
  "TSH_H.O.service.tank",
  "TSH_H.O.settling.tank",
  "Viscosity-Controller",
  "DO-line",
  "HO-line",
  "General-line",
];

const DIGITAL_ON_COLOR = "#05DF72";
const DIGITAL_OFF_COLOR = "#99A1AF";
const DIGITAL_ON_FILL = "rgba(5, 223, 114, 0.32)";
const DIGITAL_OFF_FILL = "rgba(255, 77, 80, 0)";
const DIGITAL_STYLE_OVERRIDES = {
  "DO-line": {
    onColor: "#F59E0B",
    offColor: "#99A1AF",
  },
  "HO-line": {
    onColor: "#38BDF8",
    offColor: "#99A1AF",
  },
};

const formatFlowValue = (value, unit = "L/H") => `${Math.round(value)} ${unit}`;

const getFlowColor = (value) => {
  if (value >= 90) return "#05DF72";
  if (value >= 70) return "#F59E0B";
  return "#FF0909";
};

const buildPIDMonitorDataFromPagePayload = (payload = {}) => {
  const flows = payload.sections?.flows ?? [];
  const digitals = payload.sections?.digitals ?? [];

  const flowData = flows.reduce((accumulator, flowItem, index) => {
    const flowId = flowItem.name ?? flowItem.key ?? FLOW_IDS[index];
    if (!flowId) {
      return accumulator;
    }

    const numericValue = Number(flowItem.value ?? 0);
    accumulator[flowId] = {
      value: numericValue,
      label: formatFlowValue(numericValue, flowItem.unit),
      color: getFlowColor(numericValue),
    };
    return accumulator;
  }, {});

  const digitalData = digitals.reduce((accumulator, digitalItem) => {
    const digitalId = digitalItem.label;
    const isOn = Boolean(digitalItem.value);
    const styleOverride = DIGITAL_STYLE_OVERRIDES[digitalId] ?? {};
    const activeColor = isOn
      ? styleOverride.onColor ?? DIGITAL_ON_COLOR
      : styleOverride.offColor ?? DIGITAL_OFF_COLOR;

    if (!digitalId) {
      return accumulator;
    }

    accumulator[digitalId] = {
      value: isOn,
      label: isOn ? "ON" : "OFF",
      color: activeColor,
      fill: isOn ? DIGITAL_ON_FILL : DIGITAL_OFF_FILL,
    };
    return accumulator;
  }, {});

  const doLineDigital = digitalData["DO-line"];
  const hoLineDigital = digitalData["HO-line"];
  const generalLineSource = doLineDigital?.value
    ? doLineDigital
    : hoLineDigital?.value
      ? hoLineDigital
      : doLineDigital ?? hoLineDigital;

  if (generalLineSource) {
    digitalData["General-line"] = { ...generalLineSource };
  }

  return { flowData, digitalData };
};

const setElementStateAttributes = (element, digitalValue) => {
  element.setAttribute("data-state", digitalValue.label);
  element.setAttribute("data-raw-value", digitalValue.value ? "1" : "0");

  const titleElement = element.querySelector("title");

  if (titleElement) {
    titleElement.textContent = `${element.id}: ${digitalValue.label}`;
    return;
  }

  const titleNode = element.ownerDocument.createElementNS(
    "http://www.w3.org/2000/svg",
    "title"
  );
  titleNode.textContent = `${element.id}: ${digitalValue.label}`;
  element.prepend(titleNode);
};

const updateDigitalElementStyles = (element, digitalValue) => {
  const tagName = element.tagName.toLowerCase();

  setElementStateAttributes(element, digitalValue);

  if (tagName === "path") {
    element.setAttribute("fill", digitalValue.color);
    return;
  }

  if (tagName === "rect") {
    element.setAttribute("stroke", digitalValue.color);
    element.setAttribute("fill", digitalValue.fill);
    return;
  }

  if (tagName === "g") {
    element.setAttribute("color", digitalValue.color);

    const childShapes = element.querySelectorAll("path, rect, line");

    childShapes.forEach((childElement) => {
      const childTagName = childElement.tagName.toLowerCase();

      if (childTagName === "path") {
        if (childElement.hasAttribute("stroke")) {
          childElement.setAttribute("stroke", digitalValue.color);
        }
        if (childElement.hasAttribute("fill")) {
          childElement.setAttribute("fill", digitalValue.color);
        }
      }

      if (childTagName === "line") {
        childElement.setAttribute("stroke", digitalValue.color);
      }

      if (childTagName === "rect") {
        childElement.setAttribute("stroke", digitalValue.color);
        childElement.setAttribute("fill", digitalValue.fill);
      }
    });
  }
};

const updatePIDMonitorElements = (svgDocument, monitorData) => {
  if (!svgDocument || !monitorData) return;

  const { flowData = {}, digitalData = {} } = monitorData;

  FLOW_IDS.forEach((flowId) => {
    const flowElement = svgDocument.getElementById(flowId);
    const flowValue = flowData[flowId];

    if (!flowElement || !flowValue) return;

    flowElement.textContent = flowValue.label;
    flowElement.setAttribute("fill", flowValue.color);
  });

  DIGITAL_IDS.forEach((digitalId) => {
    const digitalElement = svgDocument.getElementById(digitalId);
    const digitalValue = digitalData[digitalId];

    if (!digitalElement || !digitalValue) return;

    updateDigitalElementStyles(digitalElement, digitalValue);
  });
};

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
            <Box className="relative self-stretch flex-1 w-full overflow-hidden rounded-[10px] bg-transparent">
              <Box className="relative h-full w-full overflow-hidden rounded-[4px] border border-[#364153] bg-transparent">
                <img
                  className="absolute inset-0 h-full w-full object-contain"
                  alt="P&ID background"
                  src="/P&IDbackgroundv3.png"
                />
                <object
                  key={svgResetKey}
                  ref={svgObjectRef}
                  aria-label="Monitor items overlay"
                  className="absolute inset-0 h-full w-full"
                  data="/Monitor_item_v3.svg"
                  onLoad={handleSvgLoad}
                  type="image/svg+xml"
                >
                  <img
                    className="h-full w-full object-contain"
                    alt="Monitor items overlay"
                    src="/Monitor_item_v3.svg"
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
