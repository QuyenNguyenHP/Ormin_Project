export const fetchDebugModbusSnapshot = async () => {
  const response = await fetch("/api/debug/modbus-snapshot");

  if (!response.ok) {
    throw new Error(`Debug Modbus snapshot request failed with status ${response.status}`);
  }

  return response.json();
};

export const fetchModbusStatus = async () => {
  const response = await fetch("/api/modbus-status");

  if (!response.ok) {
    let errorMessage = `modbus-status request failed with status ${response.status}`;

    try {
      const errorPayload = await response.json();
      if (errorPayload?.error) {
        errorMessage = errorPayload.error;
      }
    } catch {
      // Keep the fallback message when the error response is not JSON.
    }

    throw new Error(errorMessage);
  }

  return response.json();
};

export const fetchPagePayload = async (pageName) => {
  const response = await fetch(`/api/${pageName}`);

  if (!response.ok) {
    let errorMessage = `${pageName} request failed with status ${response.status}`;

    try {
      const errorPayload = await response.json();
      if (errorPayload?.error) {
        errorMessage = errorPayload.error;
      }
    } catch {
      // Keep the fallback message when the error response is not JSON.
    }

    throw new Error(errorMessage);
  }

  return response.json();
};

const fetchConsumptionHistory = async (apiPath, {
  windowMinutes,
  startTime,
  endTime,
} = {}) => {
  const url = new URL(apiPath, window.location.origin);

  if (Number.isFinite(windowMinutes) && windowMinutes > 0) {
    url.searchParams.set("windowMinutes", String(windowMinutes));
  }

  if (startTime) {
    url.searchParams.set("startTime", startTime);
  }

  if (endTime) {
    url.searchParams.set("endTime", endTime);
  }

  const response = await fetch(url.pathname + url.search);

  if (!response.ok) {
    let errorMessage = `${apiPath} request failed with status ${response.status}`;

    try {
      const errorPayload = await response.json();
      if (errorPayload?.error) {
        errorMessage = errorPayload.error;
      }
    } catch {
      // Keep the fallback message when the error response is not JSON.
    }

    throw new Error(errorMessage);
  }

  return response.json();
};

export const fetchDOConsumptionHistory = async (options = {}) =>
  fetchConsumptionHistory("/api/do-consumption", options);

export const fetchHOConsumptionHistory = async (options = {}) =>
  fetchConsumptionHistory("/api/ho-consumption", options);

export const fetchFOConsumptionHistory = async (options = {}) =>
  fetchConsumptionHistory("/api/fo-consumption", options);

export const fetchPressureTrendHistory = async ({
  engine,
  windowMinutes,
  startTime,
  endTime,
  channelDescriptions,
} = {}) => {
  const url = new URL("/api/pressure_trend", window.location.origin);

  if (Number.isFinite(engine) && engine > 0) {
    url.searchParams.set("engine", String(engine));
  }

  if (Number.isFinite(windowMinutes) && windowMinutes > 0) {
    url.searchParams.set("windowMinutes", String(windowMinutes));
  }

  if (startTime) {
    url.searchParams.set("startTime", startTime);
  }

  if (endTime) {
    url.searchParams.set("endTime", endTime);
  }

  if (Array.isArray(channelDescriptions) && channelDescriptions.length > 0) {
    channelDescriptions
      .filter((channelDescription) => typeof channelDescription === "string" && channelDescription)
      .forEach((channelDescription) =>
        url.searchParams.append("channelDescription", channelDescription)
      );
  }

  const response = await fetch(url.pathname + url.search);

  if (!response.ok) {
    let errorMessage = `pressure_trend request failed with status ${response.status}`;

    try {
      const errorPayload = await response.json();
      if (errorPayload?.error) {
        errorMessage = errorPayload.error;
      }
    } catch {
      // Keep the fallback message when the error response is not JSON.
    }

    throw new Error(errorMessage);
  }

  return response.json();
};

export const fetchExhTempTrendHistory = async ({
  engine,
  windowMinutes,
  startTime,
  endTime,
  channelDescriptions,
} = {}) => {
  const url = new URL("/api/exh_temp_trend", window.location.origin);

  if (Number.isFinite(engine) && engine > 0) {
    url.searchParams.set("engine", String(engine));
  }

  if (Number.isFinite(windowMinutes) && windowMinutes > 0) {
    url.searchParams.set("windowMinutes", String(windowMinutes));
  }

  if (startTime) {
    url.searchParams.set("startTime", startTime);
  }

  if (endTime) {
    url.searchParams.set("endTime", endTime);
  }

  if (Array.isArray(channelDescriptions) && channelDescriptions.length > 0) {
    channelDescriptions
      .filter((channelDescription) => typeof channelDescription === "string" && channelDescription)
      .forEach((channelDescription) =>
        url.searchParams.append("channelDescription", channelDescription)
      );
  }

  const response = await fetch(url.pathname + url.search);

  if (!response.ok) {
    let errorMessage = `exh_temp_trend request failed with status ${response.status}`;

    try {
      const errorPayload = await response.json();
      if (errorPayload?.error) {
        errorMessage = errorPayload.error;
      }
    } catch {
      // Keep the fallback message when the error response is not JSON.
    }

    throw new Error(errorMessage);
  }

  return response.json();
};
