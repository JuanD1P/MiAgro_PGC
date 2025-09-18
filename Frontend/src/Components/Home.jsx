import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, BarChart3, CloudSun, Leaf } from "lucide-react";
import { useNavigate } from "react-router-dom";
import styles from "./DOCSS/Home.module.css";

/* ---------- LOGO ---------- */
import INICIO_LOGO from "../ImagenesP/ImagenesInicio/logoMiAgro.png";

/* ---------- IMÁGENES DEL CARRUSEL ---------- */
import Slide1 from "../ImagenesP/ImagenesInicio/Madrid.jpeg";
import Slide2 from "../ImagenesP/ImagenesInicio/Soacha.jpg";
import Slide3 from "../ImagenesP/ImagenesInicio/Mosquera.jpg";
import Slide4 from "../ImagenesP/ImagenesInicio/Funza.jpg";
import Slide5 from "../ImagenesP/ImagenesInicio/Faca.jpg";
import Slide6 from "../ImagenesP/ImagenesInicio/Elrosal.jpg";
import Slide7 from "../ImagenesP/ImagenesInicio/Subachoque.jpeg";
import Slide8 from "../ImagenesP/ImagenesInicio/Zipacon.jpg";

import Slide9 from  "../ImagenesP/ImagenesInicio/cota.webp";
import Slide10 from "../ImagenesP/ImagenesInicio/tenjo.jpg";
import Slide11 from "../ImagenesP/ImagenesInicio/tabio.jpeg";
import Slide12 from "../ImagenesP/ImagenesInicio/cajica.jpg";
import Slide13 from "../ImagenesP/ImagenesInicio/chia.jpg";
import Slide14 from "../ImagenesP/ImagenesInicio/tocancipa.jpeg";
import Slide15 from "../ImagenesP/ImagenesInicio/gachancipa.jpg";
import Slide16 from "../ImagenesP/ImagenesInicio/zipaquira.jpg";
import Slide17 from "../ImagenesP/ImagenesInicio/sopo.webp";
import Slide18 from "../ImagenesP/ImagenesInicio/nemocon.webp";
import Slide19 from "../ImagenesP/ImagenesInicio/suesca.jpg";
import Slide20 from "../ImagenesP/ImagenesInicio/sesquile.jpeg";
import Slide21 from "../ImagenesP/ImagenesInicio/la calera.jpg";
import Slide22 from "../ImagenesP/ImagenesInicio/guatavita.jpeg";
import Slide23 from "../ImagenesP/ImagenesInicio/guasca.jpeg";
import Slide24 from "../ImagenesP/ImagenesInicio/bojaca.jpg";

/* ---------- GALERÍA ---------- */
import CultivoA from "../ImagenesP/ImagenesInicio/CultivoA.jpeg";
import CultivoB from "../ImagenesP/ImagenesInicio/CultivoB.jpg";
import PaisajeA from "../ImagenesP/ImagenesInicio/PaisajeA.jpg";
import PaisajeB from "../ImagenesP/ImagenesInicio/PaisajeB.jpg";
import MercadoA from "../ImagenesP/ImagenesInicio/MercadoA.jpg";
import MercadoB from "../ImagenesP/ImagenesInicio/MercadoB.jpg";

export default function Home() {
  const navigate = useNavigate();

  const slides = useMemo(
    () => [
      { src: Slide1, title: "Madrid, Cundinamarca" },
      { src: Slide2, title: "Soacha, Cundinamarca" },
      { src: Slide3, title: "Mosquera, Cundinamarca" },
      { src: Slide4, title: "Funza, Cundinamarca" },
      { src: Slide5, title: "Facatativá, Cundinamarca" },
      { src: Slide6, title: "El Rosal, Cundinamarca" },
      { src: Slide7, title: "Subachoque, Cundinamarca" },
      { src: Slide8, title: "Zipacón, Cundinamarca" },
      { src: Slide9, title: "Cota, Cundinamarca" },
      { src: Slide10, title: "Tenjo, Cundinamarca" },
      { src: Slide11, title: "Tabio, Cundinamarca" },
      { src: Slide12, title: "Cajicá, Cundinamarca" },
      { src: Slide13, title: "Chía, Cundinamarca" },
      { src: Slide14, title: "Tocancipá, Cundinamarca" },
      { src: Slide15, title: "Gachancipá, Cundinamarca" },
      { src: Slide16, title: "Zipaquirá, Cundinamarca" },
      { src: Slide17, title: "Sopó, Cundinamarca" },
      { src: Slide18, title: "Nemocón, Cundinamarca" },
      { src: Slide19, title: "Suesca, Cundinamarca" },
      { src: Slide20, title: "Sesquilé, Cundinamarca" },
      { src: Slide21, title: "La Calera, Cundinamarca" },
      { src: Slide22, title: "Guatavita, Cundinamarca" },
      { src: Slide23, title: "Guasca, Cundinamarca" },
      { src: Slide24, title: "Bojacá, Cundinamarca" },
    ],
    []
  );

  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);
  const hoveringRef = useRef(false);

  useEffect(() => {
    const play = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (!hoveringRef.current) setIdx((i) => (i + 1) % slides.length);
      }, 3000);
    };
    play();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [slides.length]);

  const onMouseEnter = () => (hoveringRef.current = true);
  const onMouseLeave = () => (hoveringRef.current = false);

  const currentSlide = slides[idx] || { title: "" };

  return (
    <div className={styles.app}>
      {/* LOGO SUELTO (sin navbar) */}
      <div className={styles.logoOnly} aria-label="Logo Mi Agro">
        <img
          src={INICIO_LOGO}
          alt="Mi Agro"
          className={styles.logo}
          draggable={false}
          onClick={() => navigate("/")}
        />
      </div>

      {/* HERO */}
      <section className={styles.hero} aria-label="Bienvenida">
        <div className={styles.heroInner}>
          <span className={styles.badge}>
            <Leaf size={16} /> Inteligencia para sembrar mejor
          </span>
          <h1 className={styles.title}>Bienvenido a Mi Agro</h1>
          <p className={styles.subtitle}>
            Información clara y tranquila para tomar decisiones agrícolas en la Sabana de Bogotá.
          </p>
        </div>
      </section>

      {/* INTRO */}
      <section className={styles.main} aria-label="Introducción">
        <div className={styles.textCard}>
          <p>
            Aquí podrás conocer la información de los principales productos agrícolas, junto con proyecciones de mercado para decidir con mayor seguridad <strong>qué sembrar</strong>, <strong>cuándo</strong> y{" "}
            <strong>cómo</strong> aprovechar las condiciones climáticas de nuestra región.
          </p>
          <p>
            Nuestro objetivo es ayudarte a sembrar con{" "}
            <strong className={styles.accentStrong}>inteligencia</strong>, reducir riesgos y aumentar tu{" "}
            <strong className={styles.accentStrong}>rentabilidad</strong>, siempre cuidando la tierra y el futuro de nuestras comunidades.
          </p>

          <div className={styles.actions} role="group" aria-label="Acciones de usuario">
            <button className={styles.btnPrimary} onClick={() => navigate("/Registro")}>Registrate</button>
            <button className={styles.btnSecondary} onClick={() => navigate("/userlogin")}>Inicia Sesion</button>
          </div>
        </div>

        {/* CARRUSEL */}
        <div className={styles.imageCol}>
          <div className={styles.carousel} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            <div className={styles.frame}>
              {slides.map((s, i) => (
                <img
                  key={i}
                  src={s.src}
                  className={`${styles.slide} ${i === idx ? styles.active : ""}`}
                  alt={s.title}
                  loading={i === 0 ? "eager" : "lazy"}
                  draggable={false}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ))}

              <div className={styles.caption} aria-live="polite">
                {currentSlide.title}
              </div>

              <div className={styles.gradientMask} aria-hidden="true" />
            </div>

            <div className={styles.dots}>
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={`${styles.dot} ${i === idx ? styles.dotActive : ""}`}
                  onClick={() => setIdx(i)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className={styles.features}>
        <article className={styles.feature}>
          <div className={styles.featureHead}>
            <BarChart3 size={18} />
            <h3>Demanda y precios</h3>
          </div>
          <p>Observa el comportamiento del mercado y prioriza cultivos con mejor perspectiva.</p>
        </article>
        <article className={styles.feature}>
          <div className={styles.featureHead}>
            <CloudSun size={18} />
            <h3>Clima a tu favor</h3>
          </div>
          <p>Identifica ventanas de siembra y cosecha según patrones climáticos regionales.</p>
        </article>
        <article className={styles.feature}>
          <div className={styles.featureHead}>
            <Leaf size={18} />
            <h3>Decisiones sostenibles</h3>
          </div>
          <p>Mejores resultados cuidando suelo, agua y productividad a largo plazo.</p>
        </article>
      </section>

      {/* STATS */}
      <section className={styles.stats}>
        <div className={styles.stat}><b>+10</b><span>Productos</span></div>
        <div className={styles.stat}><b>{slides.length}</b><span>Municipios</span></div>
        <div className={styles.stat}><b>+ 12&nbsp;meses</b><span>Histórico</span></div>
        <div className={styles.stat}><b>100%</b><span>Sabana de Bogotá</span></div>
      </section>

      {/* GALLERY */}
      <section className={styles.gallery}>
        <h2 className={styles.galleryTitle}>Explora la Sabana</h2>
        <div className={styles.galleryGrid}>
          <figure className={styles.tile}>
            <img className={`${styles.img} ${styles.bottom}`} src={CultivoB} alt="" />
            <img className={`${styles.img} ${styles.top}`} src={CultivoA} alt="Cultivos verdes en la sabana" />
            <figcaption className={styles.tileLabel}>Cultivos</figcaption>
          </figure>
          <figure className={styles.tile}>
            <img className={`${styles.img} ${styles.bottom}`} src={PaisajeB} alt="" />
            <img className={`${styles.img} ${styles.top}`} src={PaisajeA} alt="Paisaje agrícola" />
            <figcaption className={styles.tileLabel}>Paisaje</figcaption>
          </figure>
          <figure className={styles.tile}>
            <img className={`${styles.img} ${styles.bottom}`} src={MercadoB} alt="" />
            <img className={`${styles.img} ${styles.top}`} src={MercadoA} alt="Mercado agrícola local" />
            <figcaption className={styles.tileLabel}>Mercado</figcaption>
          </figure>
        </div>
      </section>

      {/* QUOTE */}
      <section className={styles.quoteWrap}>
        <blockquote className={styles.quote}>
          “Sembrar con datos es sembrar con confianza. Cuando conoces tu tierra y tu mercado, cada decisión pesa menos y rinde más.”
          <small>Equipo Mi Agro</small>
        </blockquote>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <div className={styles.ctaCard}>
          <div>
            <div className={styles.ctaTitle}>Comienza con dos datos sencillos</div>
            <div className={styles.ctaText}>Selecciona municipio y fecha para ver recomendaciones a tu medida.</div>
          </div>

          {/* AHORA ES BOTÓN Y VA AL LOGIN */}
          <button
            className={styles.ctaStart}
            onClick={() => navigate("/userlogin")}
            aria-label="Ir al login para iniciar"
          >
            <Calendar size={16} /> Listo para iniciar
          </button>
        </div>
      </section>

    </div>
  );
}
