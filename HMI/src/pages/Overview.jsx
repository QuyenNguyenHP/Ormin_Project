import { Box } from "@mui/material";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import Footer from "../components/Footer";
import Container1 from "../components/Container1";
import { usePolledPagePayload } from "../hooks/usePolledPagePayload";

const defaultMetricPayload = { value: 0, state: "normal" };

const defaultEngineMetrics = {
  runningHours: defaultMetricPayload,
  engineSpeed: defaultMetricPayload,
  foPress: defaultMetricPayload,
  loPress: defaultMetricPayload,
  loTemp: defaultMetricPayload,
  boostAir: defaultMetricPayload,
};

const fallbackEngines = Array.from({ length: 4 }, (_, index) => ({
  key: `engine_${index + 1}`,
  title: `Engine ${index + 1}`,
  serialNo: index + 1,
  gauge: {
    title: `Engine ${index + 1}`,
    subtitle: "Awaiting backend mapping",
    value: 0,
    min: 0,
    max: 100,
    unit: "%",
    color: "#22c55e",
  },
  metrics: defaultEngineMetrics,
}));

const normalizeMetricPayload = (metric, fallbackValue = 0) => {
  if (metric && typeof metric === "object" && "value" in metric) {
    return {
      ...metric,
      value: metric.value ?? fallbackValue,
      state: metric.state ?? "normal",
    };
  }

  return {
    value: metric ?? fallbackValue,
    state: "normal",
  };
};

const normalizeEngine = (engine, index) => ({
  key: engine.key ?? `engine_${index + 1}`,
  title: engine.title ?? `Engine ${index + 1}`,
  serialNo: engine.serialNo ?? index + 1,
  gauge: {
    title: engine.gauge?.title ?? engine.title ?? `Engine ${index + 1}`,
    subtitle: engine.gauge?.subtitle ?? engine.subtitle ?? "Live engine data",
    value: Number(engine.gauge?.value ?? engine.value ?? 0),
    min: Number(engine.gauge?.min ?? engine.min ?? 0),
    max: Number(engine.gauge?.max ?? engine.max ?? 100),
    unit: engine.gauge?.unit ?? engine.unit ?? "%",
    color: engine.gauge?.color ?? engine.color ?? "#22c55e",
  },
  metrics: {
    runningHours: normalizeMetricPayload(
      engine.metrics?.runningHours ?? engine.runningHours,
      defaultMetricPayload.value
    ),
    engineSpeed: normalizeMetricPayload(
      engine.metrics?.engineSpeed ?? engine.engineSpeed,
      defaultMetricPayload.value
    ),
    foPress: normalizeMetricPayload(
      engine.metrics?.foPress ?? engine.foPress,
      defaultMetricPayload.value
    ),
    loPress: normalizeMetricPayload(
      engine.metrics?.loPress ?? engine.loPress,
      defaultMetricPayload.value
    ),
    loTemp: normalizeMetricPayload(
      engine.metrics?.loTemp ?? engine.loTemp,
      defaultMetricPayload.value
    ),
    boostAir: normalizeMetricPayload(
      engine.metrics?.boostAir ?? engine.boostAir,
      defaultMetricPayload.value
    ),
  },
});

const buildOverviewEngines = (payload) => {
  const configuredEngines = payload?.sections?.engines;
  if (Array.isArray(configuredEngines) && configuredEngines.length > 0) {
    return configuredEngines.slice(0, 4).map(normalizeEngine);
  }

  const gauges = payload?.sections?.gauges ?? [];

  return fallbackEngines.map((fallbackEngine, index) => {
    const gauge = gauges[index];

    if (!gauge) {
      return fallbackEngine;
    }

    return normalizeEngine(
      {
        ...fallbackEngine,
        ...gauge,
        gauge: {
          ...fallbackEngine.gauge,
          ...gauge,
        },
      },
      index
    );
  });
};

const Overview = () => {
  const { payload, isLoading, error, lastUpdated, pollIntervalMs } = usePolledPagePayload("overview");
  const modbusConnected = error ? false : payload ? true : null;
  const overviewEngines = buildOverviewEngines(payload);

  return (
    <Box className="min-h-screen relative bg-[#101828] w-full overflow-hidden shrink-0 flex flex-col items-start leading-[normal] tracking-[normal] mq925:h-auto">
      <Header modbusConnected={modbusConnected} />
      <main className="self-stretch flex-1 overflow-hidden flex items-start [row-gap:20px] max-w-full mq1825:flex-wrap">
        <NavigationSidebar />
        <section className="h-[948px] flex-1 overflow-hidden flex items-start justify-center !p-4 box-border gap-4 max-w-full text-left text-[#f8fafc] font-[Roboto] mq925:h-auto">
          <Box className="flex-1 h-full overflow-auto rounded-[10px] bg-[#1e2939] border-[#364153] border-solid border-[1px] box-border flex flex-col items-start !pt-8 !pb-8 !pl-10 !pr-10 max-w-full shrink-0 mq925:h-auto">
            <Box className="mt-4 grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-4 gap-4 w-full">
              {overviewEngines.map((engine) => (
                <Container1 key={engine.key} engine={engine} />
              ))}
            </Box>
          </Box>
        </section>
      </main>
      <Footer
        lastUpdated={lastUpdated}
        networkStatus={error ? "Disconnected" : payload ? "Connected" : "Connecting..."}
        pollIntervalMs={pollIntervalMs}
      />
    </Box>
  );
};

export default Overview;
