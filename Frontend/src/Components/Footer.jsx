import React from "react";
import { useNavigate } from "react-router-dom";
import logoSmall from "../ImagenesP/ImagenesLogin/logoMiAgro.png"; // ajusta la ruta si difiere
import "./DOCSS/Footer.css";

export default function Footer() {
  const navigate = useNavigate();

  const year = new Date().getFullYear();

  return (
    <footer className="ma-footer" aria-labelledby="footerTitle">
      {/* Ola decorativa superior */}
      <div className="ma-wave" aria-hidden="true" />

      <div className="ma-wrap">
        {/* Columna 1: Marca y descripción */}
        <div className="ma-col">
          <div className="ma-brand">
            <img src={logoSmall} alt="Logo MiAgro" className="ma-logo" />
            <div className="ma-brandText">
              <h2 id="footerTitle" className="ma-title">Mi Agro</h2>
              <p className="ma-subtitle">Datos y herramientas para el campo.</p>
            </div>
          </div>
          <p className="ma-desc">
            Centralizamos información climática, productiva y de gestión para facilitar
            decisiones en tiempo real. Siembra datos, cosecha insights 🌾.
          </p>

          <div className="ma-social" aria-label="Redes sociales">
            <a className="ma-socialBtn" href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
              {/* Instagram SVG */}
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5a5.5 5.5 0 1 1 0 11.001A5.5 5.5 0 0 1 12 7.5zm0 2a3.5 3.5 0 1 0 .001 7.001A3.5 3.5 0 0 0 12 9.5zM17.5 6a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5z"/></svg>
            </a>
            <a className="ma-socialBtn" href="https://wa.me/573200000000" target="_blank" rel="noreferrer" aria-label="WhatsApp">
              {/* WhatsApp SVG */}
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.04 2a9.9 9.9 0 0 0-8.48 15.1L2 22l4.99-1.53A9.96 9.96 0 1 0 12.04 2zm0 18.1c-1.58 0-3.1-.41-4.44-1.2l-.32-.19-2.96.91.96-2.87-.2-.33A7.95 7.95 0 1 1 12.04 20.1zm4.62-5.96c-.25-.13-1.48-.73-1.71-.82-.23-.08-.4-.12-.57.13-.17.24-.65.81-.8.98-.15.17-.3.18-.55.06-.25-.13-1.05-.39-2-1.25-.74-.66-1.24-1.47-1.39-1.72-.15-.26-.02-.4.11-.53.11-.11.24-.29.36-.44.12-.15.16-.26.24-.44.08-.19.04-.35-.02-.49-.06-.13-.57-1.38-.78-1.89-.2-.48-.41-.41-.57-.42h-.49c-.17 0-.45.06-.69.35-.24.29-.9.88-.9 2.14s.92 2.49 1.05 2.66c.13.17 1.81 2.76 4.4 3.87.62.27 1.11.43 1.49.55.63.2 1.2.17 1.65.1.5-.08 1.48-.6 1.69-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.3z"/></svg>
            </a>
            <a className="ma-socialBtn" href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub">
              {/* GitHub SVG */}
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.86c-2.78.6-3.37-1.18-3.37-1.18-.46-1.18-1.12-1.5-1.12-1.5-.92-.63.07-.62.07-.62 1.01.07 1.54 1.04 1.54 1.04 .9 1.53 2.36 1.09 2.94.84.09-.67.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.93 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.28.1-2.67 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0 1 12 6.8c.85 0 1.7.11 2.5.32 1.9-1.29 2.75-1.02 2.75-1.02.55 1.39.2 2.42.1 2.67.64.7 1.03 1.6 1.03 2.69 0 3.83-2.34 4.67-4.57 4.92.36.31.68.91.68 1.84v2.72c0 .27.18.58.69.48A10 10 0 0 0 12 2z"/></svg>
            </a>
            <a className="ma-socialBtn" href="https://discord.com" target="_blank" rel="noreferrer" aria-label="Discord">
              {/* Discord SVG */}
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.32 5.36A17.4 17.4 0 0 0 15.86 4l-.22.43c1.23.3 2.13.73 2.9 1.22-1.26-.62-2.52-1.02-3.77-1.25a15.7 15.7 0 0 0-3.53 0A16 16 0 0 0 7 5.65c.78-.49 1.69-.92 2.91-1.22L9.7 4C8.1 4.3 6.6 4.84 5.28 5.6 2.82 9 2.1 12.27 2.35 15.5c1.48 1.1 3.1 1.87 4.86 2.32.39-.53.74-1.1 1.03-1.7-.57-.22-1.1-.5-1.6-.82.1-.07.21-.14.32-.21a9.5 9.5 0 0 0 9.08 0c.11.07.22.14.32.21-.5.32-1.04.6-1.61.82.3.6.65 1.17 1.04 1.7a15.2 15.2 0 0 0 4.86-2.33c.26-3.15-.45-6.42-2.96-10.13zM9.6 13.47c-.88 0-1.6-.83-1.6-1.84 0-1.02.71-1.84 1.6-1.84.88 0 1.6.82 1.6 1.84 0 1.01-.72 1.84-1.6 1.84zm4.8 0c-.88 0-1.6-.83-1.6-1.84 0-1.02.72-1.84 1.6-1.84.89 0 1.6.82 1.6 1.84 0 1.01-.71 1.84-1.6 1.84z"/></svg>
            </a>
          </div>
        </div>

        {/* Columna 2: Enlaces rápidos */}
        <div className="ma-col">
          <h3 className="ma-h3">Enlaces</h3>
          <ul className="ma-links">
            <li><button type="button" onClick={() => navigate("/")} className="ma-link">Inicio</button></li>
            <li><button type="button" onClick={() => navigate("/Inicio")} className="ma-link">Dashboard</button></li>
            <li><button type="button" onClick={() => navigate("/Registro")} className="ma-link">Crear cuenta</button></li>
            <li><button type="button" onClick={() => navigate("/userlogin")} className="ma-link">Iniciar sesión</button></li>
            <li><a className="ma-link" href="/TERMINOSYSERVICIOSMIAGRO.pdf" target="_blank" rel="noreferrer">Términos y Condiciones</a></li>
          </ul>
        </div>

        {/* Columna 3: Contacto (tarjeta) */}
        <div className="ma-col">
          <h3 className="ma-h3">Contáctenos</h3>
          <div className="ma-contactCard" role="group" aria-label="Información de contacto">
            <div className="ma-contactRow">
              <span className="ma-chip">Teléfono</span>
              <a className="ma-contact" href="tel:+573200000000">+57 320 000 0000</a>
            </div>
            <div className="ma-contactRow">
              <span className="ma-chip">Correo</span>
              <a className="ma-contact" href="mailto:equipoMiAgro@outlook.com">equipoMiAgro@outlook.com</a>
            </div>
            <div className="ma-contactRow">
              <span className="ma-chip">Soporte</span>
              <a className="ma-contact" href="mailto:soporte@miagro.com">soporte@miagro.com</a>
            </div>
          </div>


        </div>
      </div>


      <div className="ma-bottom">
        <span>© Equipo Mi Agro</span>
        <span className="ma-dot" aria-hidden="true">•</span>
        <span>{year} <a className="ma-bottomLink" href="/">MiAgro</a>. Todos los derechos reservados.</span>
      </div>
    </footer>

  );
}
