import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../ImagenesP/ImagenesLogin/LogoPeque.png";
import "./DOCSS/Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState(localStorage.getItem("user-role"));
  const [isLogged, setIsLogged] = useState(!!localStorage.getItem("auth-token"));

  useEffect(() => {
    const sync = () => {
      setRole(localStorage.getItem("user-role"));
      setIsLogged(!!localStorage.getItem("auth-token"));
    };
    sync();
    const h = () => sync();
    window.addEventListener("auth-changed", h);
    return () => window.removeEventListener("auth-changed", h);
  }, [location]);

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
            {role === "ADMIN" ? "| Panel de Administrador" : "| Panel de Usuario"}
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
          <>
            {role === "ADMIN" && (
              <>

              </>
            )}

            {role === "USER" && (
              <>
              <button
                  onClick={() => navigate("/Inicio")}
                  className="navbar-btn navbar-btnPrimary"
                >
                  Inicio
                </button>
                <button
                  onClick={() => navigate("/PreciosDiarios")}
                  className="navbar-btn navbar-btnPrimary"
                >
                  Precios Hoy
                </button>
                
              </>
            )}

            <button
              onClick={handleLogout}
              className="navbar-btn navbar-btnSecondary"
            >
              Cerrar Sesión
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
