import { useEffect, useMemo, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import Footer from "../components/Footer";
import DashboardButton from "../components/DashboardButton";
import TimeSeriesLineChart from "../components/TimeSeriesLineChart";
import {
  fetchModbusStatus,
  fetchPressureTrendHistory,
} from "../services/pidMonitorApi";

const LIVE_POLL_INTERVAL_MS = 6000;
const LIVE_VIEWPORT_LATEST_DATA_RATIO = 2 / 3;
const MODBUS_STATUS_POLL_INTERVAL_MS = 6000;
const MAX_RANGE_MS = 7 * 24 * 3600000;

const pressureTrendSeriesConfig = [
  {
    channelDescription: "Engine Power",
    dataKey: "enginePower",
    name: "Engine Power",
    color: "#c57e22",
    precision: 2,
    yAxisIndex: 1,
    defaultUnit: "kW",
  },
  {
    channelDescription: "Fuel Oil Pressure",
    dataKey: "fuelOilPressure",
    name: "Fuel Oil Pressure",
    color: "#f97316",
    precision: 2,
    yAxisIndex: 0,
    defaultUnit: "MPa",
    transformValue: (value, unit) => {
      const numericValue = Number(value ?? 0);
      return String(unit ?? "").trim().toLowerCase() === "bar"
        ? numericValue / 10
        : numericValue;
    },
  },
  {
    channelDescription: "Engine LO Pressure",
    dataKey: "engineLoPressure",
    name: "Engine LO Pressure",
    color: "#38bdf8",
    precision: 2,
    yAxisIndex: 0,
    defaultUnit: "MPa",
    transformValue: (value, unit) => {
      const numericValue = Number(value ?? 0);
      return String(unit ?? "").trim().toLowerCase() === "bar"
        ? numericValue / 10
        : numericValue;
    },
  },
  {
    channelDescription: "Intake Air Pressure",
    dataKey: "intakeAirPressure",
    name: "Intake Air Pressure",
    color: "#22c55e",
    precision: 2,
    yAxisIndex: 0,
    defaultUnit: "MPa",
    transformValue: (value, unit) => {
      const numericValue = Number(value ?? 0);
      return String(unit ?? "").trim().toLowerCase() === "bar"
        ? numericValue / 10
        : numericValue;
    },
  },
  {
    channelDescription: "Cooler Water Pressure",
    dataKey: "coolerWaterPressure",
    name: "Cooler Water Pressure",
    color: "#e879f9",
    precision: 2,
    yAxisIndex: 0,
    defaultUnit: "MPa",
    transformValue: (value, unit) => {
      const numericValue = Number(value ?? 0);
      return String(unit ?? "").trim().toLowerCase() === "bar"
        ? numericValue / 10
        : numericValue;
    },
  },
];

const pad = (value) => String(value).padStart(2, "0");

const toUtcInputValue = (timestampMs) => {
  if (!timestampMs) {
    return "";
  }

  const date = new Date(timestampMs);
  return [
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`,
  ].join("T");
};

const fromUtcInputValue = (inputValue) => {
  if (!inputValue) {
    return null;
  }

  return new Date(`${inputValue}:00Z`).getTime();
};

const shiftUtcInputValue = (inputValue, deltaHours) => {
  const timestampMs = fromUtcInputValue(inputValue);
  if (!timestampMs) {
    return inputValue;
  }

  return toUtcInputValue(timestampMs + deltaHours * 3600000);
};

const isRangeTooLong = (startMs, endMs) => endMs - startMs >= MAX_RANGE_MS;
const buildEngineLabel = (engineNumber) => `Engine ${engineNumber}`;

const buildHistoryRequestOptions = (engineNumber, range) => ({
  engine: engineNumber,
  ...(range
    ? {
        startTime: new Date(range.startMs).toISOString(),
        endTime: new Date(range.endMs).toISOString(),
      }
    : {}),
  channelDescriptions: pressureTrendSeriesConfig.map(
    (seriesItem) => seriesItem.channelDescription
  ),
});

const getLatestTimestampMs = (records) =>
  (Array.isArray(records) ? records : []).reduce((latestTimestampMs, record) => {
    const timestampMs = Number(record?.timestampMs ?? 0);
    return timestampMs > latestTimestampMs ? timestampMs : latestTimestampMs;
  }, 0);

const mergeTrendRecords = (currentRecords, nextRecords) => {
  const mergedByKey = new Map();

  [
    ...(Array.isArray(currentRecords) ? currentRecords : []),
    ...(Array.isArray(nextRecords) ? nextRecords : []),
  ].forEach((record) => {
    const timestampMs = Number(record?.timestampMs ?? 0);
    const engine = Number(record?.engine ?? 0);
    const channelDescription = String(record?.channelDescription ?? "");
    const recordKey = `${engine}|${channelDescription}|${timestampMs}`;
    mergedByKey.set(recordKey, record);
  });

  return Array.from(mergedByKey.values()).sort(
    (leftRecord, rightRecord) =>
      Number(leftRecord?.timestampMs ?? 0) - Number(rightRecord?.timestampMs ?? 0)
  );
};

const mergeTrendPayload = (currentPayload, nextPayload) => {
  if (!currentPayload) {
    return nextPayload;
  }

  if (!nextPayload) {
    return currentPayload;
  }

  return {
    ...currentPayload,
    ...nextPayload,
    records: mergeTrendRecords(currentPayload.records, nextPayload.records),
    meta: {
      ...currentPayload.meta,
      ...nextPayload.meta,
      rangeStartMs:
        currentPayload?.meta?.rangeStartMs ?? nextPayload?.meta?.rangeStartMs ?? null,
      rangeEndMs:
        nextPayload?.meta?.rangeEndMs ?? currentPayload?.meta?.rangeEndMs ?? null,
    },
  };
};

const buildChartData = (records) => {
  const rowsByTimestamp = new Map();

  (Array.isArray(records) ? records : []).forEach((record) => {
    const timestampMs = Number(record.timestampMs ?? 0);
    const existingRow = rowsByTimestamp.get(timestampMs) ?? {
      timestampLabel: record.timestampLabel,
      timestampMs,
    };
    const matchingSeries = pressureTrendSeriesConfig.find(
      (seriesItem) => seriesItem.channelDescription === record.channelDescription
    );

    if (!matchingSeries) {
      return;
    }

    existingRow[matchingSeries.dataKey] = matchingSeries.transformValue
      ? matchingSeries.transformValue(record.value, record.unit)
      : Number(record.value ?? 0);
    rowsByTimestamp.set(timestampMs, existingRow);
  });

  return Array.from(rowsByTimestamp.values()).sort(
    (leftRow, rightRow) => leftRow.timestampMs - rightRow.timestampMs
  );
};

const buildChartSeries = (records) =>
  pressureTrendSeriesConfig.map((seriesItem) => {
    const firstMatchingRecord = (Array.isArray(records) ? records : []).find(
      (record) => record.channelDescription === seriesItem.channelDescription
    );

    return {
      name: firstMatchingRecord?.channelDescription ?? seriesItem.name,
      dataKey: seriesItem.dataKey,
      color: seriesItem.color,
      unit: firstMatchingRecord?.unit ?? seriesItem.defaultUnit,
      precision: seriesItem.precision,
      yAxisIndex: seriesItem.yAxisIndex,
    };
  });

const PressureTrend = () => {
  const [payload, setPayload] = useState(null);
  const [modbusConnected, setModbusConnected] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pollIntervalMs, setPollIntervalMs] = useState(null);
  const [draftStartInput, setDraftStartInput] = useState("");
  const [draftEndInput, setDraftEndInput] = useState("");
  const [appliedRange, setAppliedRange] = useState(null);
  const [selectedEngine, setSelectedEngine] = useState(1);
  const [isLiveMode, setIsLiveMode] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadModbusStatus = async () => {
      try {
        const statusPayload = await fetchModbusStatus();

        if (!isActive) {
          return;
        }

        setModbusConnected(Boolean(statusPayload?.connected));
      } catch {
        if (isActive) {
          setModbusConnected(false);
        }
      }
    };

    loadModbusStatus();
    const intervalId = window.setInterval(
      loadModbusStatus,
      MODBUS_STATUS_POLL_INTERVAL_MS
    );

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      setIsLoading(true);

      try {
        const nextPayload = await fetchPressureTrendHistory(
          buildHistoryRequestOptions(selectedEngine, appliedRange)
        );

        if (!isActive) {
          return;
        }

        setPayload(nextPayload);
        setError("");
        setLastUpdated(new Date());
        setPollIntervalMs(null);
        setDraftStartInput((currentValue) =>
          currentValue || toUtcInputValue(nextPayload?.meta?.rangeStartMs)
        );
        setDraftEndInput((currentValue) =>
          currentValue || toUtcInputValue(nextPayload?.meta?.rangeEndMs)
        );
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setPayload(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load pressure trend history data."
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isActive = false;
    };
  }, [appliedRange, selectedEngine]);

  const availableEngines = payload?.engines?.length ? payload.engines : [1, 2, 3, 4];

  useEffect(() => {
    if (payload?.engines?.length && !payload.engines.includes(selectedEngine)) {
      setSelectedEngine(payload.engines[0]);
    }
  }, [payload, selectedEngine]);

  useEffect(() => {
    if (!isLiveMode || isLoading || !payload) {
      return undefined;
    }

    let isActive = true;
    let isFetching = false;

    setPollIntervalMs(LIVE_POLL_INTERVAL_MS);

    const pollLiveData = async () => {
      if (!isActive || isFetching) {
        return;
      }

      isFetching = true;

      try {
        const latestTimestampMs = getLatestTimestampMs(payload?.records);
        const nextPayload = await fetchPressureTrendHistory({
          ...buildHistoryRequestOptions(selectedEngine),
          startTime: new Date(latestTimestampMs || Date.now()).toISOString(),
          endTime: new Date().toISOString(),
        });

        if (!isActive) {
          return;
        }

        setPayload((currentPayload) => mergeTrendPayload(currentPayload, nextPayload));
        setLastUpdated(new Date());
        setError("");
        setDraftEndInput(
          (currentValue) =>
            toUtcInputValue(nextPayload?.meta?.rangeEndMs) || currentValue
        );
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to update live pressure trend data."
        );
      } finally {
        isFetching = false;
      }
    };

    const intervalId = window.setInterval(pollLiveData, LIVE_POLL_INTERVAL_MS);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [isLiveMode, isLoading, payload, selectedEngine]);

  useEffect(() => {
    if (!isLiveMode) {
      setPollIntervalMs(null);
    }
  }, [isLiveMode]);

  const effectiveSelectedEngine = availableEngines.includes(selectedEngine)
    ? selectedEngine
    : availableEngines[0];
  const chartData = useMemo(() => buildChartData(payload?.records), [payload]);
  const series = useMemo(() => buildChartSeries(payload?.records), [payload]);

  const chartRange = useMemo(() => {
    const baseRangeStartMs = payload?.meta?.rangeStartMs ?? null;
    const baseRangeEndMs = payload?.meta?.rangeEndMs ?? null;

    if (
      !isLiveMode ||
      !baseRangeStartMs ||
      !baseRangeEndMs ||
      baseRangeEndMs <= baseRangeStartMs
    ) {
      return {
        rangeStartMs: baseRangeStartMs,
        rangeEndMs: baseRangeEndMs,
      };
    }

    const latestTimestampMs = Math.max(
      getLatestTimestampMs(payload?.records),
      Number(baseRangeEndMs)
    );
    const elapsedRangeMs = latestTimestampMs - Number(baseRangeStartMs);

    if (elapsedRangeMs <= 0) {
      return {
        rangeStartMs: baseRangeStartMs,
        rangeEndMs: baseRangeEndMs,
      };
    }

    const paddedRangeEndMs =
      Number(baseRangeStartMs) + elapsedRangeMs / LIVE_VIEWPORT_LATEST_DATA_RATIO;

    return {
      rangeStartMs: Number(baseRangeStartMs),
      rangeEndMs: Math.max(paddedRangeEndMs, Number(baseRangeEndMs)),
    };
  }, [isLiveMode, payload]);

  const handleApplyRange = () => {
    const startMs = fromUtcInputValue(draftStartInput);
    const endMs = fromUtcInputValue(draftEndInput);

    if (!startMs || !endMs) {
      setError("Both From (UTC) and To (UTC) are required.");
      return;
    }

    if (startMs >= endMs) {
      setError("From (UTC) must be earlier than To (UTC).");
      return;
    }

    if (isRangeTooLong(startMs, endMs)) {
      setError("Selected UTC range must be shorter than 7 days.");
      return;
    }

    setError("");
    setAppliedRange({ startMs, endMs });
  };

  const handleShiftRange = (direction) => {
    const deltaHours = 24 * direction;
    const nextStartInput = shiftUtcInputValue(draftStartInput, deltaHours);
    const nextEndInput = shiftUtcInputValue(draftEndInput, deltaHours);
    const nextStartMs = fromUtcInputValue(nextStartInput);
    const nextEndMs = fromUtcInputValue(nextEndInput);

    setDraftStartInput(nextStartInput);
    setDraftEndInput(nextEndInput);

    if (!nextStartMs || !nextEndMs || nextStartMs >= nextEndMs) {
      setError("Unable to shift the selected UTC range.");
      return;
    }

    if (isRangeTooLong(nextStartMs, nextEndMs)) {
      setError("Selected UTC range must be shorter than 7 days.");
      return;
    }

    setError("");
    setAppliedRange({ startMs: nextStartMs, endMs: nextEndMs });
  };

  const handleToggleLiveMode = () => {
    setIsLiveMode((currentValue) => !currentValue);
  };

  return (
    <Box className="min-h-screen relative bg-[#101828] w-full overflow-hidden shrink-0 flex flex-col items-start leading-[normal] tracking-[normal] mq925:h-auto">
      <Header modbusConnected={modbusConnected} />
      <main className="self-stretch flex-1 overflow-hidden flex items-start [row-gap:20px] max-w-full mq1825:flex-wrap">
        <NavigationSidebar />
        <section className="flex-1 overflow-hidden flex items-start justify-center !p-4 box-border gap-4 max-w-full text-left text-[#f8fafc] font-[Roboto] mq925:h-auto">
          <Box className="relative flex-1 min-h-[916px] overflow-auto rounded-[10px] bg-[#1e2939] border-[#364153] border-solid border-[1px] box-border flex flex-col items-start !p-6 max-w-full shrink-0">
            {isLoading ? (
              <Box className="absolute inset-0 z-10 flex items-center justify-center rounded-[10px] bg-[#0f172ab3] backdrop-blur-[2px]">
                <Box className="flex flex-col items-center gap-3 rounded-[14px] border border-[#334155] bg-[#111827] !px-6 !py-5 shadow-[0_18px_40px_rgba(15,23,42,0.45)]">
                  <CircularProgress size={40} thickness={4.5} sx={{ color: "#38bdf8" }} />
                  <Typography className="text-[14px] font-semibold text-[#dbeafe]">
                    Loading data
                  </Typography>
                </Box>
              </Box>
            ) : null}
            <Box className="w-full flex flex-col gap-6">
              <Box className="w-full flex flex-col gap-4">
                <Box className="w-full rounded-[14px] border border-[#334155] bg-[#111827] !px-3 !py-3">
                  <Box className="flex flex-col gap-3">
                    <Box className="flex flex-wrap items-center gap-3">
                      <Box className="flex items-center gap-2 rounded-[12px] border border-[#334155] bg-[#0b1220] !px-3 !py-2">
                        <Typography className="text-[13px] font-semibold text-[#8fb4ef]">
                          From (UTC)
                        </Typography>
                        <input
                          type="datetime-local"
                          className="min-w-[220px] border-0 bg-transparent text-[14px] font-semibold text-[#f8fafc] outline-none [color-scheme:dark]"
                          value={draftStartInput}
                          onChange={(event) => setDraftStartInput(event.target.value)}
                        />
                      </Box>

                      <Box className="flex items-center gap-2 rounded-[12px] border border-[#334155] bg-[#0b1220] !px-3 !py-2">
                        <Typography className="text-[13px] font-semibold text-[#8fb4ef]">
                          To (UTC)
                        </Typography>
                        <input
                          type="datetime-local"
                          className="min-w-[220px] border-0 bg-transparent text-[14px] font-semibold text-[#f8fafc] outline-none [color-scheme:dark]"
                          value={draftEndInput}
                          onChange={(event) => setDraftEndInput(event.target.value)}
                        />
                      </Box>

                      <DashboardButton onClick={() => handleShiftRange(-1)} active>
                        Prev 24h
                      </DashboardButton>
                      <DashboardButton onClick={() => handleShiftRange(1)} active>
                        Next 24h
                      </DashboardButton>
                      <DashboardButton onClick={handleApplyRange} active>
                        Apply
                      </DashboardButton>
                      <DashboardButton
                        onClick={handleToggleLiveMode}
                        active={isLiveMode}
                        sx={
                          isLiveMode
                            ? {
                                background:
                                  "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                                borderColor: "#f87171",
                                boxShadow:
                                  "0 10px 24px rgba(220, 38, 38, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
                                color: "#ffffff",
                              }
                            : {}
                        }
                      >
                        Live
                      </DashboardButton>
                    </Box>

                    <Box className="flex flex-wrap items-center justify-end gap-3">
                      <Typography className="text-[13px] font-semibold text-[#8fb4ef]">
                        Select engine
                      </Typography>
                      {availableEngines.map((engineNumber) => (
                        <DashboardButton
                          key={engineNumber}
                          active={engineNumber === effectiveSelectedEngine}
                          onClick={() => setSelectedEngine(engineNumber)}
                        >
                          {buildEngineLabel(engineNumber)}
                        </DashboardButton>
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Box>

              {error ? (
                <Box className="w-full rounded-[12px] border border-[#7f1d1d] bg-[#450a0a66] !px-4 !py-3">
                  <Typography className="text-[14px] text-[#fecaca]">{error}</Typography>
                </Box>
              ) : null}

              <Box className="w-full rounded-[12px] border border-[#334155] bg-[#0f172a] !p-4">
                <TimeSeriesLineChart
                  chartData={chartData}
                  series={series}
                  rangeStartMs={chartRange.rangeStartMs}
                  rangeEndMs={chartRange.rangeEndMs}
                  mergeUpdates={isLiveMode}
                  chartHeight={660}
                  title={`${buildEngineLabel(effectiveSelectedEngine)} Load and Pressure Trends`}
                  yAxes={[
                    { name: "Pressure (MPa)", position: "left" },
                    { name: "Load (kW)", position: "right" },
                  ]}
                  emptyMessage={
                    isLoading
                      ? "Loading load and pressure history..."
                      : `No load or pressure history returned for ${buildEngineLabel(effectiveSelectedEngine)} in the selected window.`
                  }
                />
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

export default PressureTrend;
