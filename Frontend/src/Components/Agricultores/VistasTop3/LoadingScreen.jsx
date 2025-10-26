import React from "react";
import "../DOCSS/top3.css";

export default function LoadingScreen({ tips = [], activeIndex = 0, showProgress = true, useGif = false }) {
  return (
    <div className="top3-overlay top3-overlay--blur" aria-live="polite">
      <div className="top3-loading-card">
        <div className="top3-load-head">
          <div className="top3-lettuce" aria-hidden="true">
            {useGif ? (
              <img src="/lechuga.gif" alt="" style={{ width: 40, height: 40, objectFit: "contain" }} />
            ) : (
              <span className="spin">🥬</span>
            )}
          </div>
          <div>
            <div style={{ fontWeight: 800, letterSpacing: .3 }}>Cargando tu recomendación</div>
            <div style={{ opacity: .85, fontSize: 13 }}>Pantalla de juego · no cierres esta ventana</div>
          </div>
        </div>
        <div className="top3-tips">
          {tips.map((t, i) => (
            <div key={`${i}-${t.slice(0,12)}`} className="top3-tip" style={{ opacity: i === activeIndex ? 1 : .45 }}>
              {t}
            </div>
          ))}
        </div>
        {showProgress && (
          <div className="top3-progress">
            <span />
          </div>
        )}
      </div>
    </div>
  );
}
