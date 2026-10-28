import { useState } from "react";
import Auth from "./components/Auth";
import Chat from "./components/Chat";

export default function App() {
  // refresh karne par bhi login bana rahe
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("nova_user"));
    } catch {
      return null;
    }
  });

  const handleLogin = (u) => {
    localStorage.setItem("nova_user", JSON.stringify(u));
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem("nova_user");
    localStorage.removeItem("nova_token");
    setUser(null);
  };

  if (!user) return <Auth onAuth={handleLogin} />;
  return <Chat user={user} onLogout={handleLogout} />;
}