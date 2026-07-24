const FLOW_IDS = [
  "DO_transfer_flow",
  "HO_transfer_flow",
  "DO_eninge_inlet_flow_1",
  "HO_eninge_inlet_flow_1",
  "DO_eninge_inlet_flow_2",
  "HO_eninge_inlet_flow_2",
  "DO_eninge_inlet_flow_3",
  "HO_eninge_inlet_flow_3",
  "DO_eninge_inlet_flow_4",
  "HO_eninge_inlet_flow_4",
  "DO_eninge_outlet_flow_1",
  "HO_eninge_outlet_flow_1",
  "DO_eninge_outlet_flow_2",
  "HO_eninge_outlet_flow_2",
  "DO_eninge_outlet_flow_3",
  "HO_eninge_outlet_flow_3",
  "DO_eninge_outlet_flow_4",
  "HO_eninge_outlet_flow_4",
];

const DIGITAL_IDS = [
  "DO_transfer_pump_1",
  "DO_transfer_pump_2",
  "DO_feed_pump_1",
  "DO_feed_pump_2",
  "HO_transfer_pump_1",
  "HO_transfer_pump_2",
  "HO_pressure_pump_1",
  "HO_pressure_pump_2",
  "HO_feed_pump_1",
  "HO_feed_pump_2",
  "HO_purifier_pump_1",
  "HO_purifier_pump_2",
  "Sludge_transfer_pump",
  "FO_Drain_pump_1",
  "FO_Drain_pump_2",
  "DO_unloading_pump",
  "HO_unloading_pump",
  "LC_D.O.service.tank",
  "LC_H.O.settling.tank",
  "LH_D.O.service.tank",
  "LH_F.O. drain tank",
  "LH_H.O.settling.tank",
  "LL_D.O.service.tank",
  "LC_F.O. drain tank",
  "LL_H.O.service.tank",
  "LL_H.O.settling.tank",
  "LS_Sludge.tank",
  "TS_F.O. drain tank",
  "TS_H.O.purifier.No1",
  "TS_H.O.purifier.No2",
  "TS_H.O.purifier.No3",
  "TS_H.O.settling.tank",
  "TS_H.O.settling.tank_2",
  "TS1_H.O.service.tank",
  "TS2_H.O.service.tank",
  "TSH_F.O. drain tank",
  "TSH_H.O.service.tank",
  "TSH_H.O.settling.tank",
  "HO_line_signal",
  "DO_line_signal",
  "Viscosity_controller_signal",
  "inlet_change_valve_1_signal",
  "outlet_change_valve_1_signal",
  "inlet_change_valve_2_signal",
  "outlet_change_valve_2_signal",
  "inlet_change_valve_3_signal",
  "outlet_change_valve_3_signal",
  "inlet_change_valve_4_signal",
  "outlet_change_valve_4_signal",
];

const DEFAULT_DIGITAL_STYLE = {
  onColor: "#05DF72",
  offColor: "#99A1AF",
  onFill: "rgba(5, 223, 114, 0.32)",
  offFill: "rgba(255, 77, 80, 0)",
};

const BLUE_DIGITAL_STYLE = {
  onColor: "#2563EB",
  offColor: "#99A1AF",
  onFill: "rgba(37, 99, 235, 0.24)",
  offFill: "rgba(255, 77, 80, 0)",
};

const PURPLE_DIGITAL_STYLE = {
  onColor: "#A855F7",
  offColor: "#99A1AF",
  onFill: "rgba(168, 85, 247, 0.24)",
  offFill: "rgba(255, 77, 80, 0)",
};

const RED_DIGITAL_STYLE = {
  onColor: "#EF4444",
  offColor: "#99A1AF",
  onFill: "rgba(239, 68, 68, 0.24)",
  offFill: "rgba(255, 77, 80, 0)",
};

const ORANGE_DIGITAL_STYLE = {
  onColor: "#F59E0B",
  offColor: "#99A1AF",
  onFill: "rgba(245, 158, 11, 0.24)",
  offFill: "rgba(255, 77, 80, 0)",
};

const DEFAULT_FLOW_STYLE = {
  onColor: "#05DF72",
  warningColor: "#F59E0B",
  offColor: "#FF0909",
  overlayFill: "rgba(5, 223, 114, 0.18)",
};

const DIGITAL_STYLE_OVERRIDES = {
  "TS_F.O. drain tank": RED_DIGITAL_STYLE,
  "TS_H.O.settling.tank": RED_DIGITAL_STYLE,
  "TS_H.O.settling.tank_2": RED_DIGITAL_STYLE,
  "TS2_H.O.service.tank": RED_DIGITAL_STYLE,
  "TSH_F.O. drain tank": ORANGE_DIGITAL_STYLE,
  "TSH_H.O.service.tank": ORANGE_DIGITAL_STYLE,
  "TSH_H.O.settling.tank": ORANGE_DIGITAL_STYLE,
};

const PID_GROUP_CONFIG = [
  {
    elementIds: ["DO-line"],
    sourceType: "digital",
    sourceIds: ["DO_line_signal"],
    style: { ...BLUE_DIGITAL_STYLE },
  },
  {
    elementIds: ["HO-line"],
    sourceType: "digital",
    sourceIds: ["HO_line_signal"],
    style: { ...PURPLE_DIGITAL_STYLE },
  },
  {
    elementIds: ["inlet_change _valve_1"],
    sourceType: "digital",
    sourceIds: ["inlet_change_valve_1_signal"],
    style: { ...BLUE_DIGITAL_STYLE },
  },
  {
    elementIds: ["inlet_change _valve_2"],
    sourceType: "digital",
    sourceIds: ["inlet_change_valve_2_signal"],
    style: { ...BLUE_DIGITAL_STYLE },
  },
  {
    elementIds: ["inlet_change _valve_3"],
    sourceType: "digital",
    sourceIds: ["inlet_change_valve_3_signal"],
    style: { ...BLUE_DIGITAL_STYLE },
  },
  {
    elementIds: ["inlet_change _valve_4"],
    sourceType: "digital",
    sourceIds: ["inlet_change_valve_4_signal"],
    style: { ...BLUE_DIGITAL_STYLE },
  },
  {
    elementIds: ["outlet_change _valve_1"],
    sourceType: "digital",
    sourceIds: ["outlet_change_valve_1_signal"],
    style: { ...BLUE_DIGITAL_STYLE },
  },
  {
    elementIds: ["outlet_change _valve_2"],
    sourceType: "digital",
    sourceIds: ["outlet_change_valve_2_signal"],
    style: { ...BLUE_DIGITAL_STYLE },
  },
  {
    elementIds: ["outlet_change _valve_3"],
    sourceType: "digital",
    sourceIds: ["outlet_change_valve_3_signal"],
    style: { ...BLUE_DIGITAL_STYLE },
  },
  {
    elementIds: ["outlet_change _valve_4"],
    sourceType: "digital",
    sourceIds: ["outlet_change_valve_4_signal"],
    style: { ...BLUE_DIGITAL_STYLE },
  },
  {
    elementIds: ["Heater 1"],
    sourceType: "digital",
    sourceIds: ["HO_line_signal"],
    style: { ...ORANGE_DIGITAL_STYLE },
  },
  {
    elementIds: ["Heater 2"],
    sourceType: "digital",
    sourceIds: ["HO_line_signal"],
    style: { ...ORANGE_DIGITAL_STYLE },
  },
  {
    elementIds: ["Viscosity-Controller"],
    sourceType: "digital",
    sourceIds: ["Viscosity_controller_signal"],
    style: { ...RED_DIGITAL_STYLE },
  },
];

const formatFlowValue = (value, unit = "L/H") =>
  `${Math.round(value)} ${unit}`;

const getFlowColorFromStyle = (value, style = DEFAULT_FLOW_STYLE) => {
  if (value >= 90) return style.onColor;
  if (value >= 70) return style.warningColor;
  return style.offColor;
};

const getDigitalStyleForId = (digitalId) =>
  DIGITAL_STYLE_OVERRIDES[digitalId] ?? DEFAULT_DIGITAL_STYLE;

const getDigitalPresentation = (isOn, style = DEFAULT_DIGITAL_STYLE) => ({
  value: isOn,
  label: isOn ? "ON" : "OFF",
  color: isOn ? style.onColor : style.offColor,
  fill: isOn ? style.onFill : style.offFill,
});

const getShapeElements = (element) => {
  if (!element) return [];

  if (element.tagName.toLowerCase() !== "g") {
    return [element];
  }

  return Array.from(
    element.querySelectorAll("path, rect, line, polyline, polygon, circle, ellipse")
  ).filter((childElement) => !childElement.closest("mask"));
};

const captureElementStyleSnapshot = (element) => ({
  fill: element.getAttribute("fill"),
  stroke: element.getAttribute("stroke"),
});

const ensureOriginalStyleSnapshot = (element) => {
  if (!element) return;

  if (element.dataset.originalStyleCaptured === "true") {
    return;
  }

  const shapes = getShapeElements(element);
  const snapshot = {
    element: captureElementStyleSnapshot(element),
    shapes: shapes.map((shapeElement) => ({
      id: shapeElement.id || null,
      snapshot: captureElementStyleSnapshot(shapeElement),
    })),
  };

  element.dataset.originalStyleSnapshot = JSON.stringify(snapshot);
  element.dataset.originalStyleCaptured = "true";
};

const restoreElementStyleSnapshot = (element) => {
  if (!element) return;

  const rawSnapshot = element.dataset.originalStyleSnapshot;
  if (!rawSnapshot) return;

  let snapshot;
  try {
    snapshot = JSON.parse(rawSnapshot);
  } catch {
    return;
  }

  const restoreAttributes = (targetElement, targetSnapshot) => {
    if (!targetElement || !targetSnapshot) return;

    if (targetSnapshot.fill == null) {
      targetElement.removeAttribute("fill");
    } else {
      targetElement.setAttribute("fill", targetSnapshot.fill);
    }

    if (targetSnapshot.stroke == null) {
      targetElement.removeAttribute("stroke");
    } else {
      targetElement.setAttribute("stroke", targetSnapshot.stroke);
    }
  };

  restoreAttributes(element, snapshot.element);

  const shapes = getShapeElements(element);
  shapes.forEach((shapeElement, index) => {
    const shapeSnapshot = snapshot.shapes?.[index]?.snapshot;
    restoreAttributes(shapeElement, shapeSnapshot);
  });
};

const applyColorToShape = (
  element,
  color,
  fill = DEFAULT_DIGITAL_STYLE.offFill
) => {
  const tagName = element.tagName.toLowerCase();
  const hasStroke = element.hasAttribute("stroke");
  const hasFill = element.hasAttribute("fill");
  const fillValue = String(element.getAttribute("fill") ?? "").toLowerCase();
  const strokeValue = String(element.getAttribute("stroke") ?? "").toLowerCase();
  const isWhiteMaskShape =
    fillValue === "white" ||
    fillValue === "#ffffff" ||
    strokeValue === "white" ||
    strokeValue === "#ffffff";

  if (isWhiteMaskShape) {
    return;
  }

  if (tagName === "line" || tagName === "polyline") {
    element.setAttribute("stroke", color);
    return;
  }

  if (tagName === "rect") {
    element.setAttribute("stroke", color);
    element.setAttribute("fill", fill);
    return;
  }

  if (tagName === "circle" || tagName === "ellipse" || tagName === "polygon") {
    if (hasStroke) {
      element.setAttribute("stroke", color);
    }
    if (hasFill) {
      element.setAttribute("fill", fill);
    }
    return;
  }

  if (tagName === "path") {
    if (hasStroke) {
      element.setAttribute("stroke", color);
    }
    if (hasFill || !hasStroke) {
      element.setAttribute("fill", color);
    }
  }
};

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
      color: getFlowColorFromStyle(numericValue),
    };

    return accumulator;
  }, {});

  const digitalData = digitals.reduce((accumulator, digitalItem) => {
    const digitalId = digitalItem.label;
    const isOn = Boolean(digitalItem.value);

    if (!digitalId) {
      return accumulator;
    }

    accumulator[digitalId] = getDigitalPresentation(
      isOn,
      getDigitalStyleForId(digitalId)
    );

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
  ensureOriginalStyleSnapshot(element);
  setElementStateAttributes(element, digitalValue);
  getShapeElements(element).forEach((shapeElement) =>
    applyColorToShape(shapeElement, digitalValue.color, digitalValue.fill)
  );
};

const updateFlowElementStyles = (
  element,
  flowValue,
  style = DEFAULT_FLOW_STYLE
) => {
  if (!element || !flowValue) return;

  if (element.tagName.toLowerCase() !== "g") {
    element.setAttribute("fill", flowValue.color);
    return;
  }

  getShapeElements(element).forEach((shapeElement) =>
    applyColorToShape(shapeElement, flowValue.color, style.overlayFill)
  );
};

const selectMostActiveFlowValue = (flowValues) =>
  flowValues.reduce((selectedValue, candidateValue) => {
    if (!candidateValue) return selectedValue;
    if (!selectedValue) return candidateValue;
    return candidateValue.value > selectedValue.value ? candidateValue : selectedValue;
  }, null);

const resolveConfiguredFlowValue = (flowData, sourceIds = [], style = DEFAULT_FLOW_STYLE) => {
  const selectedValue = selectMostActiveFlowValue(
    sourceIds.map((flowId) => flowData[flowId]).filter(Boolean)
  );

  if (!selectedValue) return null;

  return {
    ...selectedValue,
    color: getFlowColorFromStyle(selectedValue.value, style),
  };
};

const resolveConfiguredDigitalValue = (
  digitalData,
  sourceIds = [],
  style = DEFAULT_DIGITAL_STYLE
) => {
  const sourceValue =
    sourceIds.map((digitalId) => digitalData[digitalId]).find((value) => value?.value) ??
    sourceIds.map((digitalId) => digitalData[digitalId]).find(Boolean);

  if (!sourceValue) return null;

  return getDigitalPresentation(Boolean(sourceValue.value), style);
};

const resolveGeneralLineValue = (digitalData) => {
  const doLineValue = digitalData.DO_line_signal;
  const hoLineValue = digitalData.HO_line_signal;

  if (doLineValue?.value) {
    return getDigitalPresentation(true, BLUE_DIGITAL_STYLE);
  }

  if (hoLineValue?.value) {
    return getDigitalPresentation(true, PURPLE_DIGITAL_STYLE);
  }

  return null;
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

  const generalLineElement = svgDocument.getElementById("General_line");
  const generalLineValue = resolveGeneralLineValue(digitalData);
  if (generalLineElement && generalLineValue) {
    updateDigitalElementStyles(generalLineElement, generalLineValue);
  } else if (generalLineElement) {
    restoreElementStyleSnapshot(generalLineElement);
  }

  PID_GROUP_CONFIG.forEach((groupConfig) => {
    const { elementIds, sourceIds, sourceType, style } = groupConfig;

    if (sourceType === "flow") {
      const flowValue = resolveConfiguredFlowValue(flowData, sourceIds, style);
      if (!flowValue) return;

      elementIds.forEach((targetId) => {
        const targetElement = svgDocument.getElementById(targetId);
        if (!targetElement) return;
        updateFlowElementStyles(targetElement, flowValue, style);
      });
      return;
    }

    const digitalValue = resolveConfiguredDigitalValue(digitalData, sourceIds, style);
    if (!digitalValue) return;

    elementIds.forEach((targetId) => {
      const targetElement = svgDocument.getElementById(targetId);
      if (!targetElement) return;
      updateDigitalElementStyles(targetElement, digitalValue);
    });
  });

  DIGITAL_IDS.forEach((digitalId) => {
    const digitalElement = svgDocument.getElementById(digitalId);
    const digitalValue = digitalData[digitalId];

    if (!digitalElement || !digitalValue) return;

    updateDigitalElementStyles(digitalElement, digitalValue);
  });
};
