const DEFAULT_OFF_COLOR = "#D9D9D9";

export const buildDeviceStatusMonitorDataFromPagePayload = (payload = {}) => {
  const indicators = payload.sections?.indicators ?? [];

  return indicators.reduce((accumulator, indicator) => {
    const svgId = indicator.svg_id ?? indicator.key;
    if (!svgId) {
      return accumulator;
    }

    accumulator[svgId] = {
      isOn: Boolean(indicator.value),
      onColor: indicator.on_color ?? "#22c55e",
      offColor: indicator.off_color ?? DEFAULT_OFF_COLOR,
      label: indicator.label ?? svgId,
    };

    return accumulator;
  }, {});
};

export const updateDeviceStatusMonitorElements = (svgDocument, monitorData) => {
  if (!svgDocument || !monitorData) {
    return;
  }

  Object.entries(monitorData).forEach(([svgId, indicator]) => {
    const targetElement = svgDocument.getElementById(svgId);
    if (!targetElement) {
      return;
    }

    const nextColor = indicator.isOn ? indicator.onColor : indicator.offColor;
    const hasExplicitFill = targetElement.hasAttribute("fill");
    const currentFill = targetElement.getAttribute("fill");
    const fillIsUnset = !hasExplicitFill || currentFill === "none";
    const hasStroke = targetElement.hasAttribute("stroke");

    targetElement.setAttribute("fill", nextColor);
    if (fillIsUnset && hasStroke) {
      targetElement.setAttribute("stroke", nextColor);
    }

    const titleText = `${indicator.label}: ${indicator.isOn ? "ON" : "OFF"}`;
    const existingTitle = targetElement.querySelector("title");

    if (existingTitle) {
      existingTitle.textContent = titleText;
    } else {
      const titleNode = targetElement.ownerDocument.createElementNS(
        "http://www.w3.org/2000/svg",
        "title"
      );
      titleNode.textContent = titleText;
      targetElement.prepend(titleNode);
    }
  });
};
