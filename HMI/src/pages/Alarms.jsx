import { useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import Footer from "../components/Footer";
import DashboardButton from "../components/DashboardButton";
import { usePolledPagePayload } from "../hooks/usePolledPagePayload";

const FALLBACK_ALARM_LABELS = [
  "Over Speed",
  "Engine Start Failure",
  "Turbo-charger gas outlet temp switch (2nd)",
  "Heavy fault of oil mist detector",
  "L.O press.switch for engine (2nd)",
  "Jacket water thermal switch (2nd)",
  "L.O press.switch for turbo-charger (2nd)",
  "Jacket water press.switch (2nd)",
  "DC control power supply failure",
  "GAC Abnormal",
  "Emergency stop",
  "Jacket water flow relay",
  "Over voltage",
  "Under voltage",
  "Gen differential",
  "Reverse power",
  "Field failure",
  "Light fault of oil mist detector",
  "Light fault of oil mist detector system failure",
  "LO press.switch for engine (1st)",
  "LO press.switch for priming",
  "Cooler water press switch",
  "L.O. press switch for turbo-charger (1st)",
  "Jacket water thermal switch (1st)",
  "Cooler water thermal switch",
  "L.O. thermal switch",
  "L.O. sump tank level switch",
  "Jacket water press switch (1st)",
  "L.O. filter differential press switch",
  "T/C L.O filter differential press switch",
  "F.O leak tank level switch",
  "Cooler water flow relay",
  "Level switch for C.W. expansion tank #1",
  "Level switch for C.W. expansion tank #2",
  "Level switch for J.W. expansion tank #1",
  "Level switch for J.W. expansion tank #2",
  "Level switch for DO service tank level high",
  "Level switch for DO service tank level low",
  "F.O press.switch",
  "Display failure",
  "DC100V source abnormal",
  "DC24V source abnormal",
  "Auto synchro failure",
  "CB non-close",
  "Over Speed (mechanical side)",
  "Thermal switch for alternator bearing (Fly-wheel side)",
  "Thermal switch for alternator bearing (Anti-Fly-wheel side)",
  "RATED SPEED",
  "LOW SPEED",
  "STARTING SOLENOID VALVE",
  "FUEL SHUT DOWN DEVICE",
  "FUEL CONTROL PISTON MAGNETIC VALVE",
  "FUEL OIL CUT PISTON MAGNETIC VALVE",
  "GOVERNOR HANDLE SWITCH",
  "TURNING HANDLE POSITION SWITCH",
  "TURBO-CHARGER GAS OUTLET TEMP. SWITCH (1st)",
  "Limit switch for change over valve #1",
  "Limit switch for change over valve #2",
  "Limit switch for change over valve #3",
  "Limit switch for change over valve #4",
  "Ready to start",
];

const FALLBACK_ENGINES = Array.from({ length: 4 }, (_, engineIndex) => ({
  key: `engine_${engineIndex + 1}`,
  title: `Engine ${engineIndex + 1}`,
  bits: FALLBACK_ALARM_LABELS.map((label, bitIndex) => ({
    key: `fallback_bit_${engineIndex + 1}_${bitIndex + 1}`,
    label,
    value: false,
  })),
  activeCount: 0,
}));

const normalizeEngines = (backendEngines) => {
  if (!Array.isArray(backendEngines) || backendEngines.length === 0) {
    return FALLBACK_ENGINES;
  }

  return backendEngines.map((engine, engineIndex) => {
    const bits = Array.isArray(engine.bits) ? engine.bits : [];
    const normalizedBits = bits.map((bit, bitIndex) => ({
      key: bit.key ?? `bit_${bitIndex + 1}`,
      label: bit.label ?? `Bit ${bitIndex + 1}`,
      value: Boolean(bit.value),
    }));

    return {
      key: engine.key ?? `engine_${engineIndex + 1}`,
      title: engine.title ?? `Engine ${engineIndex + 1}`,
      bits: normalizedBits,
      activeCount: normalizedBits.filter((bit) => bit.value).length,
    };
  });
};

const chunkBitsIntoGroups = (bits, groupCount = 4) => {
  if (!Array.isArray(bits) || bits.length === 0) {
    return [];
  }

  const prioritizedBits = [...bits].sort((leftBit, rightBit) => {
    if (leftBit.value === rightBit.value) {
      return leftBit.label.localeCompare(rightBit.label);
    }

    return leftBit.value ? -1 : 1;
  });
  const chunkSize = Math.ceil(prioritizedBits.length / groupCount);

  return Array.from({ length: groupCount }, (_, groupIndex) => {
    const startIndex = groupIndex * chunkSize;
    const groupBits = prioritizedBits.slice(startIndex, startIndex + chunkSize);

    if (groupBits.length === 0) {
      return null;
    }

    return {
      key: `alarm_group_${groupIndex + 1}`,
      title: `ALARM LIST ${groupIndex + 1}`,
      bits: groupBits,
      activeCount: groupBits.filter((bit) => bit.value).length,
    };
  }).filter(Boolean);
};

const SelectEngineButtons = ({ engineNames, selectedEngineName, onSelectEngine }) => (
  <Box className="flex flex-wrap items-center gap-3">
    <Typography className="text-[#cbd5e1] font-medium">Select engines:</Typography>
    {engineNames.map((engineName) => (
      <DashboardButton
        key={engineName}
        active={selectedEngineName === engineName}
        onClick={() => onSelectEngine(engineName)}
      >
        {engineName}
      </DashboardButton>
    ))}
  </Box>
);

const AlarmBitRow = ({ bit }) => (
  <Box className="grid grid-cols-[minmax(0,1fr)_78px] items-center gap-2 rounded-[10px] border border-[#334155] bg-[rgba(15,23,42,0.72)] px-3 py-2">
    <Typography className="text-[12px] leading-4 text-[#e2e8f0]">
      {bit.label}
    </Typography>
    <Box className="flex justify-end">
      <Box
        className={`min-w-[66px] rounded-full border px-2 py-1 text-center text-[10px] font-semibold tracking-[0.3px] ${
          bit.value
            ? "border-[#ef4444] bg-[rgba(239,68,68,0.18)] text-[#fecaca]"
            : "border-[#22c55e] bg-[rgba(34,197,94,0.16)] text-[#bbf7d0]"
        }`}
      >
        {bit.value ? "ACTIVE" : "NORMAL"}
      </Box>
    </Box>
  </Box>
);

const AlarmGroupCard = ({ group }) => (
  <Box className="rounded-[16px] border border-[#475569] bg-[rgba(15,23,42,0.74)] p-4 backdrop-blur-sm">
    <Box className="mb-3 flex items-center justify-between gap-3">
      <Typography className="text-[13px] font-semibold tracking-[0.45px] text-[#f8fafc]">
        {group.title}
      </Typography>
      <Box
        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
          group.activeCount > 0
            ? "bg-[rgba(239,68,68,0.18)] text-[#fecaca]"
            : "bg-[rgba(34,197,94,0.16)] text-[#bbf7d0]"
        }`}
      >
        {group.activeCount}/{group.bits.length}
      </Box>
    </Box>

    <Box className="grid gap-2">
      {group.bits.map((bit) => (
        <AlarmBitRow key={bit.key} bit={bit} />
      ))}
    </Box>
  </Box>
);

const Alarms = () => {
  const { payload, isLoading, error, lastUpdated, pollIntervalMs } = usePolledPagePayload("alarm");
  const modbusConnected = error ? false : payload ? true : null;

  const engines = useMemo(() => normalizeEngines(payload?.sections?.engines), [payload]);
  const engineNames = useMemo(() => engines.map((engine) => engine.title), [engines]);
  const [selectedEngineName, setSelectedEngineName] = useState("Engine 1");

  const effectiveSelectedEngineName = engineNames.includes(selectedEngineName)
    ? selectedEngineName
    : engineNames[0] ?? "Engine 1";

  const selectedEngine =
    engines.find((engine) => engine.title === effectiveSelectedEngineName) ?? engines[0] ?? null;

  const alarmGroups = useMemo(
    () => chunkBitsIntoGroups(selectedEngine?.bits ?? []),
    [selectedEngine]
  );

  return (
    <Box className="h-[1080px] relative bg-[#101828] w-full overflow-hidden shrink-0 flex flex-col items-start leading-[normal] tracking-[normal] mq925:h-auto">
      <Header modbusConnected={modbusConnected} />
      <main className="self-stretch h-[955px] overflow-hidden shrink-0 flex items-start [row-gap:20px] max-w-full mq1825:flex-wrap">
        <NavigationSidebar />
        <section className="h-[948px] w-[1696px] overflow-hidden shrink-0 flex items-start !p-4 box-border gap-4 max-w-full text-left text-[#f8fafc] font-[Roboto] mq925:h-auto">
          <Box className="min-h-[916px] flex-1 rounded-[10px] bg-[#1e2939] border-[#364153] border-solid border-[1px] box-border overflow-auto flex flex-col items-start !p-6 max-w-full shrink-0">
            <SelectEngineButtons
              engineNames={engineNames}
              selectedEngineName={effectiveSelectedEngineName}
              onSelectEngine={setSelectedEngineName}
            />

            <Box className="mt-6 w-full rounded-[18px] border border-[#475569] overflow-hidden relative">
              <Box
                className="absolute inset-0"
                sx={{
                  "@keyframes alarmCanvasPopIn": {
                    "0%": {
                      opacity: 0,
                      transform: "scale(0.96)",
                    },
                    "65%": {
                      opacity: 0.72,
                      transform: "scale(1.015)",
                    },
                    "100%": {
                      opacity: 0.62,
                      transform: "scale(1)",
                    },
                  },
                  backgroundImage:
                    "radial-gradient(circle at 18% 22%, rgba(239, 68, 68, 0.14), transparent 22%), radial-gradient(circle at 82% 18%, rgba(96, 165, 250, 0.14), transparent 24%), url('/engine_image.png')",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "cover, cover, 88%",
                  opacity: 0.62,
                  filter: "saturate(0.82)",
                  transformOrigin: "center",
                  animation: "alarmCanvasPopIn 900ms ease-out",
                  willChange: "transform, opacity",
                }}
              />
              <Box
                className="absolute inset-0"
                sx={{
                  background:
                    "radial-gradient(circle at top, rgba(248, 113, 113, 0.08), transparent 30%), linear-gradient(180deg, rgba(15, 23, 42, 0.18), rgba(15, 23, 42, 0.82))",
                }}
              />

              <Box className="relative z-[1] p-5 md:p-6">
                <Box className="flex flex-wrap items-center justify-between gap-3">
                  {isLoading ? (
                    <Typography className="text-[13px] text-[#93c5fd]">
                      Loading live Modbus alarm data...
                    </Typography>
                  ) : null}

                  {!isLoading && error ? (
                    <Typography className="text-[13px] text-[#fca5a5]">
                      Backend unavailable. Showing fallback alarm names with NORMAL state until Modbus comes back.
                    </Typography>
                  ) : null}
                </Box>

                <Box className="mt-6 hidden items-start gap-4 xl:grid xl:grid-cols-4">
                  {alarmGroups.map((group) => (
                    <AlarmGroupCard key={group.key} group={group} />
                  ))}
                </Box>

                <Box className="mt-6 grid grid-cols-1 items-start gap-4 xl:hidden md:grid-cols-2">
                  {alarmGroups.map((group) => (
                    <AlarmGroupCard key={group.key} group={group} />
                  ))}
                </Box>
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

export default Alarms;
