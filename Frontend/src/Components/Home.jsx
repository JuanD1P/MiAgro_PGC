// Home.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, BarChart3, CloudSun, Leaf } from "lucide-react";
import { useNavigate } from "react-router-dom";
import styles from "./DOCSS/Home.module.css";
import { db } from "../firebase/client";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import CultivoA from "../ImagenesP/ImagenesInicio/CultivoA.jpeg";
import CultivoB from "../ImagenesP/ImagenesInicio/CultivoB.jpg";
import PaisajeA from "../ImagenesP/ImagenesInicio/PaisajeA.jpg";
import PaisajeB from "../ImagenesP/ImagenesInicio/PaisajeB.jpg";
import MercadoA from "../ImagenesP/ImagenesInicio/MercadoA.jpg";
import MercadoB from "../ImagenesP/ImagenesInicio/MercadoB.jpg";

export default function Home() {
  const navigate = useNavigate();
  const [municipios, setMunicipios] = useState([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);
  const hoveringRef = useRef(false);

  useEffect(() => {
    localStorage.clear();
    window.dispatchEvent(new Event("auth-changed"));
  }, []);

  useEffect(() => {
    const q = query(collection(db, "municipios"), orderBy("creadoEn", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMunicipios(rows.filter((x) => x.url && x.municipio && x.departamento));
      setLoading(false);
    });
    return unsub;
  }, []);

  const slides = useMemo(
    () =>
      municipios.map((m) => ({
        src: m.url,
        title: `${m.municipio}, ${m.departamento}`,
      })),
    [municipios]
  );

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!slides.length) return;
    timerRef.current = setInterval(() => {
      if (!hoveringRef.current) setIdx((i) => (i + 1) % slides.length);
    }, 3200);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length]);

  const onMouseEnter = () => (hoveringRef.current = true);
  const onMouseLeave = () => (hoveringRef.current = false);
  const currentSlide = slides[idx] || { title: "" };

  if (loading) {
    return (
      <div className={styles.loaderScreen}>
        <div className={styles.loaderSpinner}></div>
        <p className={styles.loaderText}>Cargando información…</p>
      </div>
    );
  }

  return (
    <div className={styles.app}>
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

      <section className={styles.main} aria-label="Introducción">
        <div className={styles.textCard}>
          <p>
            Aquí podrás conocer la información de los principales productos agrícolas, junto con proyecciones de mercado para decidir con mayor seguridad <strong>qué sembrar</strong>, <strong>cuándo</strong> y <strong>cómo</strong> aprovechar las condiciones climáticas de nuestra región.
          </p>
          <p>
            Nuestro objetivo es ayudarte a sembrar con <strong className={styles.accentStrong}>inteligencia</strong>, reducir riesgos y aumentar tu <strong className={styles.accentStrong}>rentabilidad</strong>, siempre cuidando la tierra y el futuro de nuestras comunidades.
          </p>
        </div>

        <div className={styles.imageCol}>
          <div className={styles.carousel} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            <div className={styles.frame}>
              {slides.length ? (
                slides.map((s, i) => (
                  <img
                    key={i}
                    src={s.src}
                    className={`${styles.slide} ${i === idx ? styles.active : ""}`}
                    alt={s.title}
                    loading={i === 0 ? "eager" : "lazy"}
                    draggable={false}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ))
              ) : (
                <div className={styles.empty}>Aún no hay municipios registrados</div>
              )}
              <div className={styles.caption} aria-live="polite">{currentSlide.title}</div>
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

      <section className={styles.features} id="features">
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

      <section className={styles.stats} id="cifras">
        <div className={styles.stat}><b>+10</b><span>Productos</span></div>
        <div className={styles.stat}><b>{slides.length}</b><span>Municipios</span></div>
        <div className={styles.stat}><b>+ 12&nbsp;meses</b><span>Histórico</span></div>
        <div className={styles.stat}><b>100%</b><span>Sabana de Bogotá</span></div>
      </section>

      <section className={styles.gallery} id="galeria">
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

      <section className={styles.quoteWrap}>
        <blockquote className={styles.quote}>
          “Sembrar con datos es sembrar con confianza. Cuando conoces tu tierra y tu mercado, cada decisión pesa menos y rinde más.”
          <small>Equipo Mi Agro</small>
        </blockquote>
      </section>

      <section className={styles.cta} id="cta">
        <div className={styles.ctaCard}>
          <div>
            <div className={styles.ctaTitle}>Comienza con dos datos sencillos</div>
            <div className={styles.ctaText}>Selecciona municipio y fecha para ver recomendaciones a tu medida.</div>
          </div>
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
