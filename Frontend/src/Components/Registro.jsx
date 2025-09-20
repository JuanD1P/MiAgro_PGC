import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from "react-icons/fa";
import './DOCSS/Registro.css';
import logo from '../ImagenesP/ImagenesLogin/logoMiAgro.png';

// 🔐 Firebase
import {
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { auth, db } from "../firebase/client";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

const Registro = () => {
  const [values, setValues] = useState({
    nombre_completo: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  // ------- Helpers -------
  const validarCampos = () => {
    if (!termsAccepted) return "Debes aceptar los Términos y Condiciones para continuar.";
    if (!values.nombre_completo || !values.email || !values.password || !values.confirmPassword)
      return "Todos los campos son obligatorios";
    if (!values.email.includes('@')) return "El correo debe contener un '@'";
    if (values.password.length < 6) return "La contraseña debe tener al menos 6 caracteres";
    if (!/[A-Za-z]/.test(values.password)) return "La contraseña debe contener al menos una letra";
    if (!/\d/.test(values.password)) return "La contraseña debe contener al menos un número";
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
        rol: "USER",               // rol por defecto
        activo: true,
        creadoEn: serverTimestamp(),
        ...dataExtra,
      });
    }
  };

  // ------- Registro con Email/Password -------
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const errMsg = validarCampos();
    if (errMsg) {
      setError(errMsg);
      return;
    }

    try {
      setIsSubmitting(true);

      // 1) Crear cuenta en Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, values.email, values.password);

      // 2) Guardar displayName en el perfil de Auth
      await updateProfile(cred.user, { displayName: values.nombre_completo });

      // 3) Crear doc en Firestore (con rol por defecto)
      await crearDocumentoUsuarioSiNoExiste(cred.user.uid);

      // 4) Redirigir a login (mantengo tu ruta /userlogin)
      navigate('/userlogin');
    } catch (err) {
      console.error("Error en el registro:", err);
      let msg = err?.message || "No fue posible completar el registro.";
      if (err?.code === "auth/email-already-in-use") msg = "Este correo ya está en uso";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ------- Registro/Ingreso con Google -------
  const provider = new GoogleAuthProvider();
  const handleGoogle = async () => {
    try {
      // Si quieres exigir T&C también para Google, descomenta:
      // if (!termsAccepted) { setError("Debes aceptar los Términos y Condiciones para continuar."); return; }

      setError(null);
      setIsSubmitting(true);

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await crearDocumentoUsuarioSiNoExiste(user.uid, {
        displayName: user.displayName || "",
        email: user.email || "",
        provider: "google",
      });

      // Entra directo (o navega al login si prefieres)
      navigate('/userlogin'); // o navigate('/Inicio');
    } catch (err) {
      console.error("Google sign-in error:", err);
      let msg = err?.message || "No fue posible continuar con Google";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page">
      {/* Header con logo arriba a la izquierda */}
      <header className="app-header">
        <img src={logo} alt="Logo MiAgro" className="logoHeader" />
      </header>

      {/* Fondo + contenedor */}
      <div className="registro-container">
        {error && <div className='error-message' role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className='form-container' noValidate>
          <div className="form-headings">
            <h1>BIENVENIDO</h1>
            <p>Completa el formulario:</p>
          </div>

          <label className="sr-only" htmlFor="nombreCompleto">Nombre Completo</label>
          <input
            id="nombreCompleto"
            type="text"
            value={values.nombre_completo}
            onChange={(e) => setValues({ ...values, nombre_completo: e.target.value })}
            placeholder="Nombre Completo"
            required
            autoComplete="name"
          />

          <label className="sr-only" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
            placeholder="Email"
            required
            autoComplete="email"
          />

          <div className="password-container">
            <label className="sr-only" htmlFor="password">Contraseña</label>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={values.password}
              onChange={(e) => setValues({ ...values, password: e.target.value })}
              placeholder="Contraseña"
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              className="toggle-visibility"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <div className="password-container">
            <label className="sr-only" htmlFor="confirmPassword">Confirmar Contraseña</label>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={values.confirmPassword}
              onChange={(e) => setValues({ ...values, confirmPassword: e.target.value })}
              placeholder="Confirmar Contraseña"
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              className="toggle-visibility"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Ocultar confirmación" : "Mostrar confirmación"}
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          {/* Términos y condiciones */}
          <div className="terms-row">
            <input
              id="terms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              required
            />
            <label htmlFor="terms">
              Acepto los <a href="/terminos" className="terms-link">Términos y Condiciones</a>
            </label>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={!termsAccepted || isSubmitting}
            aria-disabled={!termsAccepted || isSubmitting}
          >
            {isSubmitting ? "Registrando..." : "Registrarse"}
          </button>

          {/* Botón Google (usa tus clases o agrega una en tu CSS si quieres estilos distintos) */}
          <button
            type="button"
            onClick={handleGoogle}
            className="btn-google" /* crea esta clase en tu CSS si deseas */
            disabled={isSubmitting}
            style={{ marginTop: 12 }}
          >
            Continuar con Google
          </button>

          <button
            type="button"
            onClick={() => navigate('/userlogin')}
            className='botonLogin1'
          >
            Inicia sesión
          </button>
        </form>
      </div>
    </div>
  );
};

export default Registro;
