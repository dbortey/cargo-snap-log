import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/rainbow.scss";

createRoot(document.getElementById("root")!).render(<App />);
