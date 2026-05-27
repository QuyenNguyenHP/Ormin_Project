import { useEffect, useMemo, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import Footer from "../components/Footer";
import FOConsumptionChart from "../components/FOConsumptionChart";
import DashboardButton from "../components/DashboardButton";
import {
  fetchDOConsumptionHistory,
  fetchModbusStatus,
} from "../services/pidMonitorApi";

const MODBUS_STATUS_POLL_INTERVAL_MS = 6000;
const MAX_RANGE_MS = 7 * 24 * 3600000;

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

const calculateConsumptionLitres = (points) => {
  if (!Array.isArray(points) || points.length < 2) {
    return 0;
  }

  return points.slice(1).reduce((total, point, index) => {
    const previousPoint = points[index];
    const durationHours =
      (Number(point.timestampMs ?? 0) - Number(previousPoint.timestampMs ?? 0)) /
      3600000;

    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      return total;
    }

    const previousGap = Number(previousPoint.bandGap ?? 0);
    const currentGap = Number(point.bandGap ?? 0);

    return total + ((previousGap + currentGap) / 2) * durationHours;
  }, 0);
};

const formatUtcLabel = (timestampMs) => {
  const date = new Date(timestampMs);
  return [
    `${String(date.getUTCFullYear()).slice(-2)}-${pad(date.getUTCMonth() + 1)}.${pad(date.getUTCDate())}`,
    `${pad(date.getUTCHours())}-${pad(date.getUTCMinutes())}-${pad(date.getUTCSeconds())}`,
  ].join(" ");
};

const buildEngineSeriesConfigMap = (payload) => {
  const displayEngines = Array.isArray(payload?.meta?.displayEngines)
    ? payload.meta.displayEngines
    : [];

  return displayEngines.reduce((configMap, engineConfig) => {
    const displayEngine = Number(engineConfig?.displayEngine);
    if (!displayEngine) {
      return configMap;
    }

    configMap[displayEngine] = {
      inletChannelDescription: String(engineConfig?.inletChannelDescription ?? ""),
      outletChannelDescription: String(engineConfig?.outletChannelDescription ?? ""),
      powerChannelDescription: String(
        engineConfig?.powerChannelDescription ?? payload?.meta?.powerChannelDescription ?? "Engine Power"
      ),
    };
    return configMap;
  }, {});
};

const buildEngineChartData = (records, engineSeriesConfig) => {
  const timestampMap = new Map();

  records.forEach((record) => {
    const timestampMs = Number(record.timestampMs ?? 0);
    const existingPoint = timestampMap.get(timestampMs) ?? {
      timestampLabel: record.timestampLabel ?? formatUtcLabel(timestampMs),
      timestampMs,
      flowIn: 0,
      flowOut: 0,
      enginePower: null,
      unit: record.unit ?? "L/h",
      powerUnit: "kW",
    };
    const channelDescription = String(record.channelDescription ?? "");

    if (channelDescription === engineSeriesConfig.powerChannelDescription) {
      existingPoint.enginePower = Number(record.value ?? 0);
      existingPoint.powerUnit = record.unit ?? "kW";
    } else if (channelDescription === engineSeriesConfig.inletChannelDescription) {
      existingPoint.flowIn = Number(record.value ?? 0);
      existingPoint.unit = record.unit ?? existingPoint.unit ?? "L/h";
    } else if (channelDescription === engineSeriesConfig.outletChannelDescription) {
      existingPoint.flowOut = Number(record.value ?? 0);
      existingPoint.unit = record.unit ?? existingPoint.unit ?? "L/h";
    } else {
      return;
    }

    existingPoint.bandBase = Math.min(existingPoint.flowIn, existingPoint.flowOut);
    existingPoint.bandGap = Math.abs(existingPoint.flowIn - existingPoint.flowOut);
    existingPoint.difference = existingPoint.flowIn - existingPoint.flowOut;
    timestampMap.set(timestampMs, existingPoint);
  });

  const chartData = Array.from(timestampMap.values()).sort(
    (left, right) => left.timestampMs - right.timestampMs
  );

  return {
    chartData,
    flowInLabel: engineSeriesConfig.inletChannelDescription,
    flowOutLabel: engineSeriesConfig.outletChannelDescription,
    unit: chartData[0]?.unit ?? records[0]?.unit ?? "L/h",
    powerLabel: engineSeriesConfig.powerChannelDescription,
    powerUnit:
      chartData.find((point) => point.powerUnit)?.powerUnit ??
      records.find(
        (record) =>
          String(record.channelDescription ?? "") ===
          engineSeriesConfig.powerChannelDescription
      )?.unit ??
      "kW",
  };
};

const buildEngineCards = (payload) => {
  const engines = Array.isArray(payload?.engines) ? payload.engines : [1, 2, 3, 4];
  const records = Array.isArray(payload?.records) ? payload.records : [];
  const rangeStartMs = payload?.meta?.rangeStartMs ?? null;
  const rangeEndMs = payload?.meta?.rangeEndMs ?? null;
  const engineSeriesConfigMap = buildEngineSeriesConfigMap(payload);

  return engines.map((engineNumber) => {
    const engineRecords = records.filter(
      (record) => Number(record.engine) === Number(engineNumber)
    );
    const chartPayload = buildEngineChartData(engineRecords, {
      inletChannelDescription:
        engineSeriesConfigMap[engineNumber]?.inletChannelDescription ??
        `D.O Inlet Flow DG#${engineNumber}`,
      outletChannelDescription:
        engineSeriesConfigMap[engineNumber]?.outletChannelDescription ??
        `D.O Out Flow DG#${engineNumber}`,
      powerChannelDescription:
        engineSeriesConfigMap[engineNumber]?.powerChannelDescription ?? "Engine Power",
    });

    return {
      engineNumber,
      engineRecords,
      rangeStartMs,
      rangeEndMs,
      totalConsumptionLitres: calculateConsumptionLitres(chartPayload.chartData),
      latestPoint: chartPayload.chartData[chartPayload.chartData.length - 1] ?? null,
      ...chartPayload,
    };
  });
};

const DOConsumption = () => {
  const [payload, setPayload] = useState(null);
  const [modbusConnected, setModbusConnected] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pollIntervalMs, setPollIntervalMs] = useState(null);
  const [draftStartInput, setDraftStartInput] = useState("");
  const [draftEndInput, setDraftEndInput] = useState("");
  const [appliedRange, setAppliedRange] = useState(null);

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
        const nextPayload = await fetchDOConsumptionHistory(
          appliedRange
            ? {
                startTime: new Date(appliedRange.startMs).toISOString(),
                endTime: new Date(appliedRange.endMs).toISOString(),
              }
            : {}
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

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load D.O. consumption data."
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
  }, [appliedRange]);

  const engineCards = useMemo(() => buildEngineCards(payload), [payload]);

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
              <Box className="flex items-center justify-between gap-4">
                <Box>
                  <Typography className="text-[24px] font-semibold text-[#f8fafc]">
                    D.O Consumption
                  </Typography>
                  <Typography className="text-[13px] text-[#94a3b8]">
                    Compare inlet flow, outlet flow and engine power for DG#1 to DG#4.
                  </Typography>
                </Box>
              </Box>
              <Box className="w-full flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                <Box className="w-full xl:w-auto rounded-[14px] border border-[#334155] bg-[#111827] !px-3 !py-3">
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
                  </Box>
                </Box>
              </Box>
              <Box className="grid grid-cols-1 xl:grid-cols-2 gap-4 w-full">
                {engineCards.map((engineCard) => (
                  <Box
                    key={engineCard.engineNumber}
                    className="rounded-[12px] border border-[#334155] bg-[#0f172a] !p-4"
                  >
                    <FOConsumptionChart
                      chartData={engineCard.chartData}
                      flowInLabel={engineCard.flowInLabel}
                      flowOutLabel={engineCard.flowOutLabel}
                      powerLabel={engineCard.powerLabel}
                      powerUnit={engineCard.powerUnit}
                      unit={engineCard.unit}
                      rangeStartMs={engineCard.rangeStartMs}
                      rangeEndMs={engineCard.rangeEndMs}
                      chartHeight={280}
                      title={`Engine ${engineCard.engineNumber} D.O Consumption Trend`}
                      subtitle={`${engineCard.flowInLabel} vs ${engineCard.flowOutLabel}`}
                      emptyMessage={
                        isLoading
                          ? "Loading engine data..."
                          : `No data returned for Engine ${engineCard.engineNumber} in the selected window.`
                      }
                    />
                  </Box>
                ))}
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

export default DOConsumption;
