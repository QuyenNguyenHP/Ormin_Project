import { useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import Footer from "../components/Footer";
import FOConsumptionChart from "../components/FOConsumptionChart";
import DashboardButton from "../components/DashboardButton";
import { fetchFOConsumptionHistory } from "../services/pidMonitorApi";

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

const normalizeDescription = (description) => String(description ?? "").toLowerCase();

const isInputChannel = (description) => {
  const normalized = normalizeDescription(description);
  return normalized.includes("input") || normalized.includes("inlet") || normalized.includes("flow in");
};

const isOutputChannel = (description) => {
  const normalized = normalizeDescription(description);
  return (
    normalized.includes("output") ||
    normalized.includes("outlet") ||
    normalized.includes("flow out")
  );
};

const formatUtcLabel = (timestampMs) => {
  const date = new Date(timestampMs);
  return [
    `${String(date.getUTCFullYear()).slice(-2)}-${pad(date.getUTCMonth() + 1)}.${pad(date.getUTCDate())}`,
    `${pad(date.getUTCHours())}-${pad(date.getUTCMinutes())}-${pad(date.getUTCSeconds())}`,
  ].join(" ");
};

const buildEngineChartData = (records) => {
  const timestampMap = new Map();
  const inputLabels = new Set();
  const outputLabels = new Set();

  records.forEach((record) => {
    const timestampMs = Number(record.timestampMs ?? 0);
    const existingPoint = timestampMap.get(timestampMs) ?? {
      timestampLabel: record.timestampLabel ?? formatUtcLabel(timestampMs),
      timestampMs,
      flowIn: 0,
      flowOut: 0,
      unit: record.unit ?? "L/h",
    };

    if (isInputChannel(record.channelDescription)) {
      existingPoint.flowIn = Number(record.value ?? 0);
      inputLabels.add(record.channelDescription);
    } else if (isOutputChannel(record.channelDescription)) {
      existingPoint.flowOut = Number(record.value ?? 0);
      outputLabels.add(record.channelDescription);
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
    flowInLabel: Array.from(inputLabels)[0] ?? "Flow Input",
    flowOutLabel: Array.from(outputLabels)[0] ?? "Flow Output",
    unit: chartData[0]?.unit ?? records[0]?.unit ?? "L/h",
  };
};

const buildEngineCards = (payload) => {
  const engines = Array.isArray(payload?.engines) ? payload.engines : [1, 2, 3, 4];
  const records = Array.isArray(payload?.records) ? payload.records : [];
  const rangeStartMs = payload?.meta?.rangeStartMs ?? null;
  const rangeEndMs = payload?.meta?.rangeEndMs ?? null;

  return engines.map((engineNumber) => {
    const engineRecords = records.filter(
      (record) => Number(record.engine) === Number(engineNumber)
    );
    const chartPayload = buildEngineChartData(engineRecords);
    const totalConsumptionLitres = calculateConsumptionLitres(chartPayload.chartData);
    const latestPoint = chartPayload.chartData[chartPayload.chartData.length - 1] ?? null;

    return {
      engineNumber,
      engineRecords,
      rangeStartMs,
      rangeEndMs,
      totalConsumptionLitres,
      latestPoint,
      ...chartPayload,
    };
  });
};

const FOConsumption = () => {
  const [payload, setPayload] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pollIntervalMs, setPollIntervalMs] = useState(null);
  const [draftStartInput, setDraftStartInput] = useState("");
  const [draftEndInput, setDraftEndInput] = useState("");
  const [appliedRange, setAppliedRange] = useState(null);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      setIsLoading(true);

      try {
        const nextPayload = await fetchFOConsumptionHistory(
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
            : "Failed to load F.O. consumption data."
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

  const modbusConnected = error ? false : payload ? true : null;
  const engineCards = useMemo(() => buildEngineCards(payload), [payload]);
  const totalRecords = payload?.records?.length ?? 0;
  const rangeStartMs = payload?.meta?.rangeStartMs ?? null;
  const rangeEndMs = payload?.meta?.rangeEndMs ?? null;
  const appliedWindowHours =
    rangeStartMs && rangeEndMs ? Math.round((rangeEndMs - rangeStartMs) / 3600000) : 24;

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

    setError("");
    setAppliedRange({ startMs: nextStartMs, endMs: nextEndMs });
  };

  return (
    <Box className="min-h-screen relative bg-[#101828] w-full overflow-hidden shrink-0 flex flex-col items-start leading-[normal] tracking-[normal] mq925:h-auto">
      <Header modbusConnected={modbusConnected} />
      <main className="self-stretch flex-1 overflow-hidden flex items-start [row-gap:20px] max-w-full mq1825:flex-wrap">
        <NavigationSidebar />
        <section className="flex-1 overflow-hidden flex items-start justify-center !p-4 box-border gap-4 max-w-full text-left text-[#f8fafc] font-[Roboto] mq925:h-auto">
          <Box className="flex-1 min-h-[916px] overflow-auto rounded-[10px] bg-[#1e2939] border-[#364153] border-solid border-[1px] box-border flex flex-col items-start !p-6 max-w-full shrink-0">
            <Box className="w-full flex flex-col gap-6">
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

                    <DashboardButton
                      onClick={() => handleShiftRange(-1)}
                      active
                    >
                      Prev 24h
                    </DashboardButton>
                    <DashboardButton
                      onClick={() => handleShiftRange(1)}
                      active
                    >
                      Next 24h
                    </DashboardButton>
                    <DashboardButton
                      onClick={handleApplyRange}
                      active
                    >
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
                      unit={engineCard.unit}
                      rangeStartMs={engineCard.rangeStartMs}
                      rangeEndMs={engineCard.rangeEndMs}
                      chartHeight={280}
                      title={`Engine ${engineCard.engineNumber} Flow Trend`}
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

export default FOConsumption;
