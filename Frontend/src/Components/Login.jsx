import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import logo from "../ImagenesP/ImagenesLogin/LOGO.png";
import "./DOCSS/Login.css";

import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/client";

const Login = () => {
  const [values, setValues] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  axios.defaults.withCredentials = true;

  useEffect(() => {
    localStorage.removeItem("auth-token");
    localStorage.removeItem("user-role");
    localStorage.removeItem("municipioSeleccionado");
    localStorage.removeItem("fechaSeleccionada");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!values.email || !values.password) {
      setError("Todos los campos deben ser completados");
      return;
    }

    try {
      setLoading(true);

      const { user } = await signInWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );

      const idToken = await user.getIdToken();
      localStorage.setItem("auth-token", idToken);

      const { data } = await axios.post("http://localhost:3000/auth/session", {
        idToken,
      });

      if (!data?.ok) {
        throw new Error(data?.error || "Sesión inválida");
      }

      localStorage.setItem("user-role", data.rol);

      if (data.rol === "ADMIN") {
        navigate("/Admin");
      } else {
        navigate("/Inicio");
      }
      window.location.reload();
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        (err?.code === "auth/invalid-credential"
          ? "Credenciales inválidas"
          : err?.message || "No se pudo iniciar sesión");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="LoginPcontainer">
      <div className="LoginScontainer">
        <img src={logo} alt="Logo" className="logoLogin" />

        <div className={`text-dangerLogin ${error ? "show" : ""}`}>
          {error}
        </div>

        <form onSubmit={handleSubmit} className="formularioLogin">
          <div className="form1">
            <input
              type="email"
              name="email"
              autoComplete="off"
              placeholder="Ingresa Email"
              className="input1"
              value={values.email}
              onChange={(e) =>
                setValues({ ...values, email: e.target.value })
              }
            />
          </div>

          <div className="form2">
            <input
              type="password"
              name="password"
              placeholder="Ingresa Contraseña"
              className="input2"
              value={values.password}
              onChange={(e) =>
                setValues({ ...values, password: e.target.value })
              }
            />
          </div>

          <button type="submit" className="boton2" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresa"}
          </button>
        </form>

        <button onClick={() => navigate("/Registro")} className="botonLogin1">
          Ir a Registro
        </button>
      </div>
    </div>
  );
};

export default Login;
