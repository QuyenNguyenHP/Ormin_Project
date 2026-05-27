export const FLOW_IDS = [
  "D.O Transfer Flow",
  "H.O Transfer Flow",
  "D.O Inlet Flow DG#1",
  "H.O Inlet Flow DG#1",
  "D.O Inlet Flow DG#2",
  "Flow6",
  "Flow7",
  "Flow8",
  "Flow9",
  "Flow10",
  "Flow11",
  "Flow12",
  "Flow13",
  "Flow14",
  "Flow15",
  "Flow16",
  "Flow17",
  "Flow18",
];

export const FLOW_MAPPINGS = [
  { id: "D.O Transfer Flow", register: 40001, scale: 1, unit: "L/H" },
  { id: "H.O Transfer Flow", register: 40002, scale: 1, unit: "L/H" },
  { id: "D.O Inlet Flow DG#1", register: 40003, scale: 1, unit: "L/H" },
  { id: "H.O Inlet Flow DG#1", register: 40004, scale: 1, unit: "L/H" },
  { id: "D.O Inlet Flow DG#2", register: 40005, scale: 1, unit: "L/H" },
  { id: "Flow6", register: 40006, scale: 1, unit: "L/H" },
  { id: "Flow7", register: 40007, scale: 1, unit: "L/H" },
  { id: "Flow8", register: 40008, scale: 1, unit: "L/H" },
  { id: "Flow9", register: 40009, scale: 1, unit: "L/H" },
  { id: "Flow10", register: 40010, scale: 1, unit: "L/H" },
  { id: "Flow11", register: 40011, scale: 1, unit: "L/H" },
  { id: "Flow12", register: 40012, scale: 1, unit: "L/H" },
  { id: "Flow13", register: 40013, scale: 1, unit: "L/H" },
  { id: "Flow14", register: 40014, scale: 1, unit: "L/H" },
  { id: "Flow15", register: 40015, scale: 1, unit: "L/H" },
  { id: "Flow16", register: 40016, scale: 1, unit: "L/H" },
  { id: "Flow17", register: 40017, scale: 1, unit: "L/H" },
  { id: "Flow18", register: 40018, scale: 1, unit: "L/H" },
];

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

export const DIGITAL_MAPPINGS = [
  { id: "pump 1", bit: 10001 },
  { id: "pump 2", bit: 10002 },
  { id: "pump 3", bit: 10003 },
  { id: "pump 4", bit: 10004 },
  { id: "pump 5", bit: 10005 },
  { id: "pump 6", bit: 10006 },
  { id: "pump 7", bit: 10007 },
  { id: "pump 8", bit: 10008 },
  { id: "pump 9", bit: 10009 },
  { id: "pump 10", bit: 10010 },
  { id: "pump 11", bit: 10011 },
  { id: "pump 12", bit: 10012 },
  { id: "LC_D.O.service.tank", bit: 10013 },
  { id: "LC_H.O.settling.tank", bit: 10014 },
  { id: "LH_D.O.service.tank", bit: 10015 },
  { id: "LH_F.O. drain tank", bit: 10016 },
  { id: "LH_H.O.settling.tank", bit: 10017 },
  { id: "LL_D.O.service.tank", bit: 10018 },
  { id: "LL_F.O. drain tank", bit: 10019 },
  { id: "LL_H.O.service.tank", bit: 10020 },
  { id: "LL_H.O.settling.tank", bit: 10021 },
  { id: "LS_Sludge.tank", bit: 10022 },
  { id: "TS_D.O.service.tank", bit: 10023 },
  { id: "TS_F.O. drain tank", bit: 10024 },
  { id: "TS_H.O.purifier.No1", bit: 10025 },
  { id: "TS_H.O.purifier.No2", bit: 10026 },
  { id: "TS_H.O.purifier.No3", bit: 10027 },
  { id: "TS_H.O.settling.tank", bit: 10028 },
  { id: "TS1_H.O.service.tank", bit: 10029 },
  { id: "TS2_H.O.service.tank", bit: 10030 },
  { id: "TSH_D.O.service.tank", bit: 10031 },
  { id: "TSH_F.O. drain tank", bit: 10032 },
  { id: "TSH_H.O.service.tank", bit: 10033 },
  { id: "TSH_H.O.settling.tank", bit: 10034 },
];

const DIGITAL_ON_COLOR = "#05DF72";
const DIGITAL_OFF_COLOR = "#99A1AF";
const DIGITAL_ON_FILL = "rgba(5, 223, 114, 0.32)";
const DIGITAL_OFF_FILL = "rgba(255, 77, 80, 0)";

export const formatFlowValue = (value, unit = "L/H") =>
  `${Math.round(value)} ${unit}`;

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

export const buildFlowDataFromAddressMap = (registerMap) =>
  FLOW_MAPPINGS.reduce((accumulator, flowMapping) => {
    const rawValue = registerMap[flowMapping.register] ?? 0;
    const scaledValue = Number(rawValue) * (flowMapping.scale ?? 1);

    accumulator[flowMapping.id] = {
      value: scaledValue,
      label: formatFlowValue(scaledValue, flowMapping.unit),
      color: getFlowColor(scaledValue),
      register: flowMapping.register,
      rawValue,
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

export const buildDigitalDataFromAddressMap = (bitMap) =>
  DIGITAL_MAPPINGS.reduce((accumulator, digitalMapping) => {
    const isOn = Boolean(bitMap[digitalMapping.bit]);

    accumulator[digitalMapping.id] = {
      value: isOn,
      label: isOn ? "ON" : "OFF",
      color: isOn ? DIGITAL_ON_COLOR : DIGITAL_OFF_COLOR,
      fill: isOn ? DIGITAL_ON_FILL : DIGITAL_OFF_FILL,
      bit: digitalMapping.bit,
      rawValue: isOn ? 1 : 0,
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

export const buildPIDMonitorDataFromModbus = ({
  holdingRegisters = {},
  discreteInputs = {},
}) => ({
  flowData: buildFlowDataFromAddressMap(holdingRegisters),
  digitalData: buildDigitalDataFromAddressMap(discreteInputs),
});

export const buildPIDMonitorDataFromPagePayload = (payload = {}) => {
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

    if (!digitalId) {
      return accumulator;
    }

    accumulator[digitalId] = {
      value: isOn,
      label: isOn ? "ON" : "OFF",
      color: isOn ? DIGITAL_ON_COLOR : DIGITAL_OFF_COLOR,
      fill: isOn ? DIGITAL_ON_FILL : DIGITAL_OFF_FILL,
    };

    return accumulator;
  }, {});

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
