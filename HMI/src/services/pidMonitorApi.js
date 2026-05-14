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
