
import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { useSelector } from "react-redux";
import { Login } from "./user/Login";
import Register from "./pages/Register";
import Chat from "./pages/Chat";

import "./App.css";

function ProtectedRoute({ children }) {
  const session = useSelector(
      (state) => state.auth.session
  );

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
      <Routes>
        <Route
            path="/"
            element={<Navigate to="/messages" replace />}
        />

        <Route path="/login" element={<Login />} />

        <Route
            path="/register"
            element={<Register />}
        />

        <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
        />

        <Route
            path="/messages/user/:userId"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
        />

        <Route
            path="/messages/room/:roomId"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
        />

        <Route
            path="*"
            element={<Navigate to="/messages" replace />}
        />
      </Routes>
  );
}
