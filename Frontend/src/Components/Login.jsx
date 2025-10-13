import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import logo from "../ImagenesP/ImagenesLogin/logoMiAgro.png";
import bgPng from "/FONDOLOGIN.png";
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
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [bgReady, setBgReady] = useState(false);
  const navigate = useNavigate();
  axios.defaults.withCredentials = true;

  useEffect(() => {
    localStorage.removeItem("auth-token");
    localStorage.removeItem("user-role");
    localStorage.removeItem("municipioSeleccionado");
    localStorage.removeItem("fechaSeleccionada");
  }, []);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = bgPng;
    document.head.appendChild(link);
    const img = new Image();
    img.src = bgPng;
    if (img.decode) {
      img.decode().then(() => setBgReady(true)).catch(() => setBgReady(true));
    } else {
      img.onload = () => setBgReady(true);
      img.onerror = () => setBgReady(true);
    }
    return () => document.head.removeChild(link);
  }, []);

  const showToast = (message, opts = {}) => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, message, ...opts }]);
  };
  const closeToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

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

  const openResetModal = () => {
    setResetEmail((values.email || "").trim());
    setShowReset(true);
  };
  const closeResetModal = useCallback(() => setShowReset(false), []);

  useEffect(() => {
    if (!showReset) return;
    const onKey = (e) => { if (e.key === "Escape") closeResetModal(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showReset, closeResetModal]);

  const handleResetFromModal = async (e) => {
    e?.preventDefault?.();
    const email = (resetEmail || "").trim();
    if (!email) {
      showToast("Escribe tu correo para enviarte el enlace", { variant: "warning", title: "Recuperar contraseña" });
      return;
    }
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      showToast("Te enviamos un correo para restablecer tu contraseña", { variant: "success", title: "Revisa tu correo", icon: "✅" });
      closeResetModal();
    } catch (err) {
      const msg = firebaseErrorToMessage(err);
      showToast(msg, { variant: "error", title: "No se pudo enviar el correo" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="LoginPcontainer">
      <div
        className="loginBgLayer"
        style={bgReady ? { opacity: 1, backgroundImage: `url(${bgPng})` } : { opacity: 0 }}
      />
      <ToastStack toasts={toasts} onClose={closeToast} />
      <header className="mgreg-header">
        <a href="/" aria-label="Volver al inicio" className="mgreg-logoLink">
          <img src={logo} alt="Logo MiAgro" className="mgreg-logoHeader" />
        </a>
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
          <button type="button" className="btnLink" onClick={openResetModal} disabled={loading}>
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
            ¿No tienes cuenta? Regístrate
          </button>
        </form>
      </div>
      {showReset && (
        <div
          className="resetModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="resetTitle"
          onMouseDown={(e) => {
            if (e.target.classList.contains("resetModalOverlay")) closeResetModal();
          }}
        >
          <div className="resetModalCard" role="document">
            <button type="button" className="resetClose" aria-label="Cerrar" onClick={closeResetModal}>×</button>
            <div className="resetIcon" aria-hidden="true">🔒</div>
            <h3 id="resetTitle" className="resetTitle">¿Tienes problemas para iniciar sesión?</h3>
            <p className="resetDesc">Ingresa tu correo electrónico y te enviaremos un enlace para que recuperes el acceso a tu cuenta.</p>
            <form onSubmit={handleResetFromModal} className="resetForm" noValidate>
              <input
                type="email"
                placeholder="Correo electrónico"
                className="resetInput"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                autoFocus
                autoComplete="email"
              />
              <button type="submit" className="resetBtnPrimary" disabled={loading} aria-disabled={loading}>
                {loading ? "Enviando..." : "Enviar enlace de inicio de sesión"}
              </button>
            </form>
            <div className="resetDivider" role="separator" aria-hidden="true" />
            <button type="button" className="resetCreateBtn" onClick={() => { closeResetModal(); navigate("/Registro"); }}>
              Crear cuenta nueva
            </button>
            <button type="button" className="resetBackBtn" onClick={closeResetModal}>
              Volver al inicio de sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
