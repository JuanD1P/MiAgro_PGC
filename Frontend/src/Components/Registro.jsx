import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "./DOCSS/Registro.css";
import logo from "../ImagenesP/ImagenesLogin/logoMiAgro.png";
import bgReg from "/FONDOREG.png";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  fetchSignInMethodsForEmail,
  getAdditionalUserInfo
} from "firebase/auth";
import { auth, db } from "../firebase/client";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import ToastStack from "./ToastStack";

const TERMS_FILE = "TERMINOSYSERVICIOSMIAGRO.pdf";
const TERMS_HREF = `${import.meta.env.BASE_URL}${encodeURIComponent(TERMS_FILE)}`;
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

export default function Registro() {
  const [values, setValues] = useState({ nombre_completo: "", email: "", password: "", confirmPassword: "" });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [bgReady, setBgReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = bgReg;
    document.head.appendChild(link);
    const img = new Image();
    img.src = bgReg;
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
    if (c === "auth/email-already-in-use") return "Este correo ya está en uso";
    if (c === "auth/invalid-email") return "Correo inválido";
    if (c === "auth/weak-password") return "La contraseña es demasiado débil";
    if (c === "auth/network-request-failed") return "Error de red";
    if (c === "auth/popup-closed-by-user") return "Ventana de Google cerrada";
    if (c === "auth/cancelled-popup-request") return "Se canceló la ventana emergente";
    if (c === "auth/operation-not-allowed") return "Operación no permitida";
    return err?.message || "Ocurrió un error";
  };

  const validarCampos = () => {
    if (!termsAccepted) return "Debes aceptar los Términos y Condiciones.";
    if (!values.nombre_completo || !values.email || !values.password || !values.confirmPassword) return "Todos los campos son obligatorios";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return "Correo inválido";
    if (values.password.length < 6) return "La contraseña debe tener al menos 6 caracteres";
    if (!/[a-z]/.test(values.password)) return "Debe contener al menos una minúscula";
    if (!/[A-Z]/.test(values.password)) return "Debe contener al menos una mayúscula";
    if (!/[0-9]/.test(values.password)) return "Debe contener al menos un número";
    if (values.password !== values.confirmPassword) return "Las contraseñas no coinciden";
    return null;
  };

  const crearDocumentoUsuarioSiNoExiste = async (uid, dataExtra = {}) => {
    const ref = doc(db, "usuarios", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        nombre: values.nombre_completo || dataExtra.displayName || "",
        email: values.email || dataExtra.email || "",
        rol: "USER",
        activo: true,
        creadoEn: serverTimestamp(),
        ...dataExtra
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validarCampos();
    if (err) {
      showToast(err, { variant: "error", title: "No se pudo registrar" });
      return;
    }
    try {
      setIsSubmitting(true);
      const cred = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await updateProfile(cred.user, { displayName: values.nombre_completo });
      await crearDocumentoUsuarioSiNoExiste(cred.user.uid);
      showToast("Registro exitoso", { variant: "success", title: "Listo", icon: "✅" });
      setValues({ nombre_completo: "", email: "", password: "", confirmPassword: "" });
      setTermsAccepted(false);
      setShowPassword(false);
      setShowConfirmPassword(false);
    } catch (error) {
      const msg = firebaseErrorToMessage(error);
      showToast(msg, { variant: "error", title: "No se pudo registrar" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setIsSubmitting(true);
      const result = await signInWithPopup(auth, provider);
      const info = getAdditionalUserInfo(result);
      const user = result.user;
      await crearDocumentoUsuarioSiNoExiste(user.uid, {
        displayName: user.displayName || "",
        email: user.email || "",
        provider: "google"
      });
      if (info?.isNewUser) {
        showToast("Registro exitoso con Google", { variant: "success", title: "Listo", icon: "✅" });
      } else {
        showToast("Correo ya registrado", { variant: "warning", title: "Aviso" });
      }
      setValues({ nombre_completo: "", email: "", password: "", confirmPassword: "" });
      setTermsAccepted(false);
      setShowPassword(false);
      setShowConfirmPassword(false);
    } catch (error) {
      if (error?.code === "auth/account-exists-with-different-credential") {
        const email = error?.customData?.email;
        let msg = "Este correo ya está registrado.";
        try {
          if (email) {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            if (methods?.includes("password")) {
              msg = "Este correo ya está registrado con correo y contraseña. Inicia sesión con tu clave.";
            } else if (methods?.length) {
              msg = `Este correo ya está registrado con otro proveedor: ${methods.join(", ")}.`;
            }
          }
        } catch {}
        showToast(msg, { variant: "error", title: "No se pudo continuar" });
      } else {
        const msg = firebaseErrorToMessage(error);
        showToast(msg, { variant: "error", title: "No se pudo continuar" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mgreg-page">
      <div
        className="regBgLayer"
        style={bgReady ? { opacity: 1, backgroundImage: `url(${bgReg})` } : { opacity: 0 }}
      />
      <ToastStack toasts={toasts} onClose={closeToast} />
      <header className="mgreg-header">
        <a href="/" aria-label="Volver al inicio" className="mgreg-logoLink">
          <img src={logo} alt="Logo MiAgro" className="mgreg-logoHeader" />
        </a>
      </header>
      <div className="mgreg-container">
        <form onSubmit={handleSubmit} className="mgreg-form" noValidate>
          <div className="mgreg-headings">
            <h1>Registra tus datos</h1>
            <p>Completa el formulario para crear tu cuenta</p>
          </div>
          <input
            id="nombreCompleto"
            type="text"
            value={values.nombre_completo}
            onChange={(e) => setValues({ ...values, nombre_completo: e.target.value })}
            placeholder="Nombre Completo"
            required
            autoComplete="name"
          />
          <input
            id="email"
            type="email"
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
            placeholder="Email"
            required
            autoComplete="email"
          />
          <div className="mgreg-password">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={values.password}
              onChange={(e) => setValues({ ...values, password: e.target.value })}
              placeholder="Contraseña"
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              className="mgreg-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <div className="mgreg-password">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={values.confirmPassword}
              onChange={(e) => setValues({ ...values, confirmPassword: e.target.value })}
              placeholder="Confirmar Contraseña"
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              className="mgreg-toggle"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Ocultar confirmación" : "Mostrar confirmación"}
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <div className="mgreg-terms">
            <input
              id="terms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              required
            />
            <label htmlFor="terms">
              Acepto los{" "}
              <a href={TERMS_HREF} className="mgreg-terms-link" target="_blank" rel="noreferrer">
                Términos y Condiciones
              </a>
            </label>
          </div>
          <button
            type="submit"
            className="mgreg-btnPrimary"
            disabled={!termsAccepted || isSubmitting}
            aria-disabled={!termsAccepted || isSubmitting}
          >
            {isSubmitting ? "Registrando..." : "Crear cuenta"}
          </button>
          <div className="mgreg-divider"><span>o</span></div>
          <button
            type="button"
            onClick={handleGoogle}
            className="mgreg-btnGoogle"
            disabled={isSubmitting}
            aria-label="Continuar con Google"
            title="Continuar con Google"
          >
            <svg className="mgreg-googleIc" viewBox="0 0 48 48" aria-hidden="true">
              <path d="M44.5 20H24v8.5h11.8C34.9 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.3 0 6.3 1.2 8.6 3.3l6-6C34.6 4.3 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.1-2.7-.5-4z"></path>
            </svg>
            Continuar con Google
          </button>
          <button type="button" onClick={() => navigate("/userlogin")} className="mgreg-btnLink">
            ¿Ya tienes cuenta? Inicia sesión
          </button>
        </form>
      </div>
    </div>
  );
}
