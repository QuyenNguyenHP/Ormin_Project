import { useEffect } from "react";
import {
  Routes,
  Route,
  useNavigationType,
  useLocation,
} from "react-router-dom";
import Overview from "./pages/Overview";
import PAndID from "./pages/PAndID";
import Engine from "./pages/Engine";
import Exhaust from "./pages/Exhaust";
import FOConsumption from "./pages/FOConsumption";
import PlaceholderPage from "./pages/PlaceholderPage";

function App() {
  const action = useNavigationType();
  const location = useLocation();
  const pathname = location.pathname;

  useEffect(() => {
    if (action !== "POP") {
      window.scrollTo(0, 0);
    }
  }, [action, pathname]);

  useEffect(() => {
    let title = "";
    let metaDescription = "";

    switch (pathname) {
      case "/":
        title = "Overview | P&ID";
        metaDescription = "System overview page.";
        break;
      case "/pid":
        title = "P&ID";
        metaDescription = "P&ID diagram screen.";
        break;
      case "/engine":
        title = "Engine";
        metaDescription = "Engine monitoring page.";
        break;
      case "/power":
        title = "Power";
        metaDescription = "Power information page.";
        break;
      case "/fo-consumption":
        title = "F.O. Consumption";
        metaDescription = "Fuel oil consumption history and flow comparison page.";
        break;
      case "/exhaust":
        title = "Exhaust";
        metaDescription = "Exhaust system information page.";
        break;
      case "/alarms":
        title = "Alarms";
        metaDescription = "System alarms page.";
        break;
      default:
        title = "Overview | P&ID";
        metaDescription = "System overview page.";
    }

    if (title) {
      document.title = title;
    }

    if (metaDescription) {
      const metaDescriptionTag = document.querySelector(
        'head > meta[name="description"]'
      );
      if (metaDescriptionTag) {
        metaDescriptionTag.content = metaDescription;
      }
    }
  }, [pathname]);

  return (
    <Routes>
      <Route path="/" element={<Overview />} />
      <Route path="/pid" element={<PAndID />} />
      <Route path="/engine" element={<Engine />} />
      <Route path="/fo-consumption" element={<FOConsumption />} />
      <Route
        path="/power"
        element={
          <PlaceholderPage
            title="Power"
            subtitle="Power information will be displayed here."
          />
        }
      />
      <Route path="/exhaust" element={<Exhaust />} />
      <Route
        path="/alarms"
        element={
          <PlaceholderPage
            title="Alarms"
            subtitle="System alarms and status will be displayed here."
          />
        }
      />
    </Routes>
  );
}

export default App;
