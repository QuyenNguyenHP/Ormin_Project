export const FLOW_IDS = Array.from(
  { length: 18 },
  (_, index) => `Flow${index + 1}`
);

export const DIGITAL_IDS = [
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
];

const DIGITAL_ON_COLOR = "#05DF72";
const DIGITAL_OFF_COLOR = "#FF4D4F";
const DIGITAL_ON_FILL = "rgba(5, 223, 114, 0.32)";
const DIGITAL_OFF_FILL = "rgba(255, 77, 79, 0.18)";

export const formatFlowValue = (value) => `${Math.round(value)} L/H`;

export const getFlowColor = (value) => {
  if (value >= 90) return "#05DF72";
  if (value >= 70) return "#F59E0B";
  return "#FF0909";
};

export const buildFlowDataFromRegisters = (registers) =>
  FLOW_IDS.reduce((accumulator, flowId, index) => {
    const registerValue = registers[index] ?? 0;

    accumulator[flowId] = {
      value: registerValue,
      label: formatFlowValue(registerValue),
      color: getFlowColor(registerValue),
    };

    return accumulator;
  }, {});

export const buildDigitalDataFromBits = (bits) =>
  DIGITAL_IDS.reduce((accumulator, digitalId, index) => {
    const isOn = Boolean(bits[index]);

    accumulator[digitalId] = {
      value: isOn,
      label: isOn ? "ON" : "OFF",
      color: isOn ? DIGITAL_ON_COLOR : DIGITAL_OFF_COLOR,
      fill: isOn ? DIGITAL_ON_FILL : DIGITAL_OFF_FILL,
    };

    return accumulator;
  }, {});

export const createMockRegisters = () =>
  FLOW_IDS.map(() => 55 + Math.random() * 55);

export const createMockDigitalBits = () =>
  DIGITAL_IDS.map(() => Math.random() >= 0.45);

export const createMockPIDMonitorData = () => ({
  flowData: buildFlowDataFromRegisters(createMockRegisters()),
  digitalData: buildDigitalDataFromBits(createMockDigitalBits()),
});

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
    const childShapes = element.querySelectorAll("path, rect");

    childShapes.forEach((childElement) => {
      const childTagName = childElement.tagName.toLowerCase();

      if (childTagName === "path") {
        childElement.setAttribute("stroke", digitalValue.color);
      }

      if (childTagName === "rect") {
        childElement.setAttribute("stroke", digitalValue.color);
        childElement.setAttribute("fill", digitalValue.fill);
      }
    });
  }
};

export const updatePIDMonitorElements = (svgDocument, monitorData) => {
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
