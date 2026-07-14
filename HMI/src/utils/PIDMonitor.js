export const FLOW_IDS = [
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

export const FLOW_MAPPINGS = [
  { id: "D.O Transfer Flow", register: 40051, scale: 1, unit: "L/H", dataType: "int32", registerCount: 2 },
  { id: "H.O Transfer Flow", register: 40057, scale: 1, unit: "L/H", dataType: "int32", registerCount: 2 },
  { id: "D.O Inlet Flow DG#1", register: 40053, scale: 1, unit: "L/H", dataType: "int32", registerCount: 2 },
  { id: "H.O Inlet Flow DG#1", register: 40059, scale: 1, unit: "L/H", dataType: "int32", registerCount: 2 },
  { id: "D.O Inlet Flow DG#2", register: 40153, scale: 1, unit: "L/H", dataType: "int32", registerCount: 2 },
  { id: "H.O Inlet Flow DG#2", register: 40159, scale: 1, unit: "L/H", dataType: "int32", registerCount: 2 },
  { id: "D.O Inlet Flow DG#3", register: 40253, scale: 1, unit: "L/H", dataType: "int32", registerCount: 2 },
  { id: "H.O Inlet Flow DG#3", register: 40259, scale: 1, unit: "L/H", dataType: "int32", registerCount: 2 },
  { id: "D.O Inlet Flow DG#4", register: 40353, scale: 1, unit: "L/H", dataType: "int32", registerCount: 2 },
  { id: "H.O Inlet Flow DG#4", register: 40359, scale: 1, unit: "L/H", dataType: "int32", registerCount: 2 },
  { id: "D.O Outlet Flow DG#1", register: 40055, scale: 1, unit: "L/H", dataType: "int32", registerCount: 2 },
  { id: "H.O Outlet Flow DG#1", register: 40061, scale: 1, unit: "L/H", dataType: "int32", registerCount: 2 },
  { id: "D.O Outlet Flow DG#2", register: 40155, scale: 1, unit: "L/H", dataType: "int32", registerCount: 2 },
  { id: "H.O Outlet Flow DG#2", register: 40161, scale: 1, unit: "L/H", dataType: "int32", registerCount: 2 },
  { id: "D.O Outlet Flow DG#3", register: 40255, scale: 1, unit: "L/H", dataType: "int32", registerCount: 2 },
  { id: "H.O Outlet Flow DG#3", register: 40261, scale: 1, unit: "L/H", dataType: "int32", registerCount: 2 },
  { id: "D.O Outlet Flow DG#4", register: 40355, scale: 1, unit: "L/H", dataType: "int32", registerCount: 2 },
  { id: "H.O Outlet Flow DG#4", register: 40361, scale: 1, unit: "L/H", dataType: "int32", registerCount: 2 },
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
  { id: "pump 1", bit: 11646 },
  { id: "pump 2", bit: 11651 },
  { id: "pump 3", bit: 11656 },
  { id: "pump 4", bit: 11661 },
  { id: "pump 5", bit: 11666 },
  { id: "pump 6", bit: 11671 },
  { id: "pump 7", bit: 11676 },
  { id: "pump 8", bit: 11681 },
  { id: "pump 9", bit: 11686 },
  { id: "pump 10", bit: 11691 },
  { id: "pump 11", bit: 11696 },
  { id: "pump 12", bit: 11701 },
  { id: "LC_D.O.service.tank", bit: 11607 },
  { id: "LC_H.O.settling.tank", bit: 11610 },
  { id: "LH_D.O.service.tank", bit: 10037 },
  { id: "LH_F.O. drain tank", bit: 11613 },
  { id: "LH_H.O.settling.tank", bit: 11608 },
  { id: "LL_D.O.service.tank", bit: 10038 },
  { id: "LL_F.O. drain tank", bit: 11612 },
  { id: "LL_H.O.service.tank", bit: 11611 },
  { id: "LL_H.O.settling.tank", bit: 11609 },
  { id: "LS_Sludge.tank", bit: 11635 },
  { id: "TS_D.O.service.tank", bit: 11623 },
  { id: "TS_F.O. drain tank", bit: 11630 },
  { id: "TS_H.O.purifier.No1", bit: 11776 },
  { id: "TS_H.O.purifier.No2", bit: 11777 },
  { id: "TS_H.O.purifier.No3", bit: 11633 },
  { id: "TS_H.O.settling.tank", bit: 11621 },
  { id: "TS1_H.O.service.tank", bit: 11782 },
  { id: "TS2_H.O.service.tank", bit: 11787 },
  { id: "TSH_D.O.service.tank", bit: 11625 },
  { id: "TSH_F.O. drain tank", bit: 11631 },
  { id: "TSH_H.O.service.tank", bit: 11624 },
  { id: "TSH_H.O.settling.tank", bit: 11622 },
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

const resolveFlowRawValue = (registerMap, flowMapping) => {
  const registerCount = Math.max(1, Number(flowMapping.registerCount ?? 1));
  const dataType = String(flowMapping.dataType ?? "uint16").toLowerCase();

  if (registerCount === 1) {
    return Number(registerMap[flowMapping.register] ?? 0);
  }

  if (registerCount === 2 && (dataType === "int32" || dataType === "uint32")) {
    const highWord = Number(registerMap[flowMapping.register] ?? 0);
    const lowWord = Number(registerMap[flowMapping.register + 1] ?? 0);
    let rawValue = (highWord << 16) | lowWord;

    if (dataType === "int32" && rawValue >= 0x80000000) {
      rawValue -= 0x100000000;
    }

    return rawValue;
  }

  return 0;
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
    const rawValue = resolveFlowRawValue(registerMap, flowMapping);
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
