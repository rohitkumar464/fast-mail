import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Mail from "./Mail";

function App() {
  const token = localStorage.getItem("token");

  return (
    <Routes>
      <Route path="/" element={token ? <Mail /> : <Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}

export default App;
