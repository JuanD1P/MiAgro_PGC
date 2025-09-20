import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "../ImagenesP/ImagenesLogin/LogoPeque.png";
import "./DOCSS/Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();


  const role = localStorage.getItem("user-role");
  const isLogged = !!localStorage.getItem("auth-token");

  const handleLogout = () => {
    localStorage.clear();
    navigate("/userlogin");
    window.location.reload();
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <img src={logo} alt="MiAgro Logo" className="navbar-logo" />
        {isLogged && (
          <h1 className="navbar-title">
            {role === "ADMIN" ? "Panel de Admin" : "Panel de Usuario"}
          </h1>
        )}
      </div>

      <div className="navbar-right">
        {!isLogged ? (
          <>
            <button
              onClick={() => navigate("/userlogin")}
              className="navbar-btn navbar-btnPrimary"
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => navigate("/registro")}
              className="navbar-btn navbar-btnSecondary"
            >
              Registrarse
            </button>
          </>
        ) : (
          <button onClick={handleLogout} className="navbar-btn navbar-btnLogout">
            Cerrar Sesión
          </button>
        )}
      </div>
    </nav>
  );
}
