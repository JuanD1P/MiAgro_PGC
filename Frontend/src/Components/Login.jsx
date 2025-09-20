import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import logo from '../ImagenesP/ImagenesLogin/logoMiAgro.png';
import "./DOCSS/Login.css";

import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  getAdditionalUserInfo
} from "firebase/auth";
import { auth } from "../firebase/client";
import ToastStack from "../Components/ToastStack";

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

export default function Login() {
  const [values, setValues] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const navigate = useNavigate();

  axios.defaults.withCredentials = true;

  useEffect(() => {
    localStorage.removeItem("auth-token");
    localStorage.removeItem("user-role");
    localStorage.removeItem("municipioSeleccionado");
    localStorage.removeItem("fechaSeleccionada");
  }, []);

  const showToast = (message, opts = {}) => {
    const id = crypto.randomUUID();
    setToasts(t => [...t, { id, message, ...opts }]);
  };
  const closeToast = id => setToasts(t => t.filter(x => x.id !== id));

  const firebaseErrorToMessage = (err) => {
    const c = err?.code || "";
    if (c === "auth/invalid-email") return "Correo inválido";
    if (c === "auth/user-not-found") return "La cuenta no existe";
    if (c === "auth/wrong-password" || c === "auth/invalid-credential") return "Contraseña incorrecta";
    if (c === "auth/too-many-requests") return "Demasiados intentos. Intenta más tarde.";
    if (c === "auth/network-request-failed") return "Error de red";
    if (c === "auth/popup-closed-by-user") return "Ventana de Google cerrada";
    if (c === "auth/account-exists-with-different-credential") return "El correo existe con otro proveedor";
    return err?.message || "Ocurrió un error";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!values.email || !values.password) {
      showToast("Todos los campos deben ser completados", { variant: "error", title: "Error" });
      return;
    }
    try {
      setLoading(true);
      const { user } = await signInWithEmailAndPassword(auth, values.email, values.password);
      const idToken = await user.getIdToken();
      localStorage.setItem("auth-token", idToken);

      const { data } = await axios.post("http://localhost:3000/auth/session", { idToken });
      if (!data?.ok) throw new Error(data?.error || "Sesión inválida");

      localStorage.setItem("user-role", data.rol);
      showToast("Sesión iniciada", { variant: "success", title: "Bienvenido", icon: "✅" });

      if (data.rol === "ADMIN") navigate("/Admin");
      else navigate("/Inicio");
      window.location.reload();
    } catch (err) {
      const msg = firebaseErrorToMessage(err);
      showToast(msg, { variant: "error", title: "No se pudo iniciar sesión" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, provider);
      const info = getAdditionalUserInfo(result);
      const user = result.user;
      const idToken = await user.getIdToken();
      localStorage.setItem("auth-token", idToken);

      const { data } = await axios.post("http://localhost:3000/auth/session", { idToken });
      if (!data?.ok) throw new Error(data?.error || "Sesión inválida");
      localStorage.setItem("user-role", data.rol);

      if (info?.isNewUser) {
        showToast("Registro exitoso con Google", { variant: "success", title: "Listo", icon: "✅" });
      } else {
        showToast("Inicio de sesión con Google", { variant: "success", title: "Bienvenido", icon: "✅" });
      }

      if (data.rol === "ADMIN") navigate("/Admin");
      else navigate("/Inicio");
      window.location.reload();
    } catch (error) {
      if (error?.code === "auth/account-exists-with-different-credential") {
        const email = error?.customData?.email;
        let msg = "Este correo ya está registrado con otro método.";
        try {
          if (email) {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            if (methods?.includes("password")) {
              msg = "Este correo ya está registrado con correo y contraseña. Inicia sesión con tu clave.";
            } else if (methods?.length) {
              msg = `Este correo ya está registrado con: ${methods.join(", ")}.`;
            }
          }
        } catch {}
        showToast(msg, { variant: "error", title: "No se pudo continuar" });
      } else {
        const msg = firebaseErrorToMessage(error);
        showToast(msg, { variant: "error", title: "No se pudo continuar" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    const email = (values.email || "").trim();
    if (!email) {
      showToast("Escribe tu correo para enviarte el enlace", { variant: "warning", title: "Recuperar contraseña" });
      return;
    }
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      showToast("Te enviamos un correo para restablecer tu contraseña", { variant: "success", title: "Revisa tu correo", icon: "✅" });
    } catch (err) {
      const msg = firebaseErrorToMessage(err);
      showToast(msg, { variant: "error", title: "No se pudo enviar el correo" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="LoginPcontainer">
      <ToastStack toasts={toasts} onClose={closeToast} />
      <header className="LoginHeader">
        <img src={logo} alt="Logo" className="logoLogin" />
      </header>

      <div className="LoginScontainer">
        <h2 className="LoginTitle">Inicio de sesión</h2>

        <form onSubmit={handleSubmit} className="formularioLogin" noValidate>
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="Correo"
            className="input1"
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
          />

          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            className="input2"
            value={values.password}
            onChange={(e) => setValues({ ...values, password: e.target.value })}
            autoComplete="current-password"
          />

          <button type="submit" className="btnPrimary" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          <button type="button" className="btnLink" onClick={handleReset} disabled={loading}>
            ¿Olvidaste tu contraseña?
          </button>

          <div className="divider"><span>o</span></div>

          <button type="button" className="btnGoogle" onClick={handleGoogle} disabled={loading}>
            <svg className="googleIc" viewBox="0 0 48 48" aria-hidden="true">
              <path d="M44.5 20H24v8.5h11.8C34.9 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.3 0 6.3 1.2 8.6 3.3l6-6C34.6 4.3 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.1-2.7-.5-4z"></path>
            </svg>
            Continuar con Google
          </button>

          <button onClick={() => navigate("/Registro")} type="button" className="btnLink">
            No tienes cuenta?Registrate
          </button>
        </form>
      </div>
    </div>
  );
}
