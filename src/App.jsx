import { useEffect } from "react";
import {
  Routes,
  Route,
  useNavigationType,
  useLocation,
} from "react-router-dom";
import Overview from "./pages/Overview";
import PAndID from "./pages/PAndID";
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
        metaDescription = "Tổng quan hệ thống P&ID.";
        break;
      case "/pid":
        title = "P&ID";
        metaDescription = "Màn hình sơ đồ P&ID của hệ thống.";
        break;
      case "/engine":
        title = "Engine";
        metaDescription = "Thông tin động cơ.";
        break;
      case "/power":
        title = "Power";
        metaDescription = "Thông tin nguồn điện.";
        break;
      case "/exhaust":
        title = "Exhaust";
        metaDescription = "Thông tin hệ thống thoát khí.";
        break;
      case "/alarms":
        title = "Alarms";
        metaDescription = "Cảnh báo hệ thống.";
        break;
      default:
        title = "Overview | P&ID";
        metaDescription = "Tổng quan hệ thống P&ID.";
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
      <Route
        path="/engine"
        element={
          <PlaceholderPage
            title="Engine"
            subtitle="Thông tin động cơ sẽ được hiển thị tại đây."
          />
        }
      />
      <Route
        path="/power"
        element={
          <PlaceholderPage
            title="Power"
            subtitle="Thông tin nguồn điện sẽ được hiển thị tại đây."
          />
        }
      />
      <Route
        path="/exhaust"
        element={
          <PlaceholderPage
            title="Exhaust"
            subtitle="Thông tin hệ thống thoát khí sẽ được hiển thị tại đây."
          />
        }
      />
      <Route
        path="/alarms"
        element={
          <PlaceholderPage
            title="Alarms"
            subtitle="Cảnh báo và trạng thái hệ thống sẽ được hiển thị tại đây."
          />
        }
      />
    </Routes>
  );
}
export default App;
