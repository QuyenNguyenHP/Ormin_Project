export const fetchDebugModbusSnapshot = async () => {
  const response = await fetch("/api/debug/modbus-snapshot");

  if (!response.ok) {
    throw new Error(`Debug Modbus snapshot request failed with status ${response.status}`);
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

export const fetchFOConsumptionHistory = async ({
  windowMinutes,
  startTime,
  endTime,
} = {}) => {
  const url = new URL("/api/fo-consumption", window.location.origin);

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
    let errorMessage = `fo-consumption request failed with status ${response.status}`;

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
