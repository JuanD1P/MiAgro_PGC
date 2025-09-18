import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from "react-icons/fa";
import './DOCSS/Registro.css';
import logo from '../ImagenesP/ImagenesLogin/logoMiAgro.png';

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
  axios.defaults.withCredentials = true;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    // Bloqueo si no aceptó T&C
    if (!termsAccepted) {
      setError("Debes aceptar los Términos y Condiciones para continuar.");
      return;
    }

    // Validaciones de campos obligatorios
    if (!values.nombre_completo || !values.email || !values.password || !values.confirmPassword) {
      setError("Todos los campos son obligatorios");
      return;
    }

    // Validación simple de correo
    if (!values.email.includes('@')) {
      setError("El correo debe contener un '@'");
      return;
    }

    // Longitud mínima de contraseña
    if (values.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    // Debe contener al menos una letra
    const hasLetter = /[A-Za-z]/.test(values.password);
    if (!hasLetter) {
      setError("La contraseña debe contener al menos una letra");
      return;
    }

    // Debe contener al menos un número
    const hasNumber = /\d/.test(values.password);
    if (!hasNumber) {
      setError("La contraseña debe contener al menos un número");
      return;
    }

    // Coincidencia de contraseñas
    if (values.password !== values.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    const dataToSend = {
      nombre_completo: values.nombre_completo,
      email: values.email,
      password: values.password
    };

    try {
      setIsSubmitting(true);
      const result = await axios.post('http://localhost:3000/auth/register', dataToSend);
      if (result.data.registrationStatus) {
        alert("Registro exitoso");
        navigate('/userlogin');
      } else {
        setError(result.data.Error || "No fue posible completar el registro.");
      }
    } catch (err) {
      console.error("Error en el registro:", err);
      setError("Error en el servidor, intenta más tarde");
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
