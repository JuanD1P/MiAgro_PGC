import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import Swal from "sweetalert2";
import "@sweetalert2/themes/borderless/borderless.css";
import "./DOCSS/Admin.css";
import NavbarAdm from "./NavbarAdm";

const api = axios.create({
  baseURL: "http://localhost:3000",
  withCredentials: true,
});
api.interceptors.request.use((config) => {
  const t = localStorage.getItem("auth-token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

function AuSelect({ value, onChange, options, placeholder = "Selecciona…", disabled = false, className = "", busy = false, id }) {
  const [open, setOpen] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(-1);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef(null);
  const listRef = useRef(null);

  const selected = useMemo(() => options.find((o) => o.value === value) || null, [options, value]);

  function computePos() {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: Math.round(r.bottom), left: Math.round(r.left), width: Math.round(r.width) });
  }

  useEffect(() => {
    function onDoc(e) {
      const t = e.target;
      const btn = btnRef.current;
      const list = listRef.current;
      const isInsideBtn = btn && btn.contains(t);
      const isInsideList = list && list.contains(t);
      if (!isInsideBtn && !isInsideList) {
        setOpen(false);
        setHoverIdx(-1);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    computePos();
    const onScroll = () => computePos();
    const onResize = () => computePos();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  function onKeyDown(e) {
    if (disabled) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setHoverIdx(Math.max(0, options.findIndex((o) => o.value === value)));
      } else if (hoverIdx >= 0) {
        onChange?.(options[hoverIdx].value);
        setOpen(false);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHoverIdx((i) => Math.min((i < 0 ? -1 : i) + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setHoverIdx((i) => Math.max((i < 0 ? options.length : i) - 1, 0));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const list = open
    ? createPortal(
        <ul
          ref={(el) => (listRef.current = el)}
          role="listbox"
          className="au-sel-list au-sel-portal"
          aria-labelledby={id}
          style={{ top: pos.top + 6, left: pos.left, width: pos.width }}
          tabIndex={-1}
        >
          {options.map((opt, idx) => {
            const active = value === opt.value;
            const hover = hoverIdx == idx;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={active}
                className={`au-sel-item ${active ? "is-active" : ""} ${hover ? "is-hover" : ""}`}
                onMouseEnter={() => setHoverIdx(idx)}
                onMouseLeave={() => setHoverIdx(-1)}
                onClick={() => {
                  onChange?.(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
                {active && <span className="au-sel-check">✓</span>}
              </li>
            );
          })}
        </ul>,
        document.body
      )
    : null;

  return (
    <div className={`au-sel ${disabled ? "au-sel--disabled" : ""} ${className}`}>
      <button
        id={id}
        ref={btnRef}
        type="button"
        className={`au-sel-btn ${busy ? "au-sel-btn--busy" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (disabled) return;
          computePos();
          setOpen((o) => !o);
        }}
        onKeyDown={onKeyDown}
        disabled={disabled}
      >
        <span className="au-sel-label">
          {selected ? selected.label : <span className="au-sel-ph">{placeholder}</span>}
        </span>
        <span className="au-sel-caret" aria-hidden>▾</span>
      </button>
      {list}
    </div>
  );
}

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("ALL");
  const [changingId, setChangingId] = useState("");

  useEffect(() => {
    obtenerUsuarios();
  }, []);

  const obtenerUsuarios = async () => {
    try {
      setLoading(true);
      setErr("");
      const { data } = await api.get("/api/usuarios");
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.response?.data?.error || "No fue posible cargar los usuarios");
    } finally {
      setLoading(false);
    }
  };

  const eliminarUsuario = async (id) => {
    const result = await Swal.fire({
      title: "¿Eliminar usuario?",
      text: "Esta accion eliminara el usuario del sistema de forma permanente.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      showLoaderOnConfirm: true,
      buttonsStyling: false,
      customClass: {
        popup: "au-sw-popup",
        title: "au-sw-title",
        htmlContainer: "au-sw-text",
        actions: "au-sw-actions",
        confirmButton: "au-sw-confirm",
        cancelButton: "au-sw-cancel",
      },
      preConfirm: async () => {
        try {
          await api.delete(`/api/usuarios/${id}`);
        } catch (error) {
          Swal.showValidationMessage(error?.response?.data?.error || "No fue posible eliminar el usuario");
          return false;
        }
      },
      allowOutsideClick: () => !Swal.isLoading(),
    });

    if (result.isConfirmed) {
      await obtenerUsuarios();
      Swal.fire({
        icon: "success",
        title: "Usuario eliminado",
        timer: 1200,
        showConfirmButton: false,
        customClass: { popup: "au-sw-popup" },
        buttonsStyling: false,
      });
    }
  };

  const confirmarYCambiarRol = async (u, nuevoRol) => {
    if ((u.rol || "USER") === nuevoRol) return;
    const prettyActual = (u.rol || "USER") === "ADMIN" ? "Administrador" : "Usuario";
    const prettyNuevo = nuevoRol === "ADMIN" ? "Administrador" : "Usuario";
    const res = await Swal.fire({
      title: "Confirmar cambio de rol",
      html: `¿Quiere re asignar el rol de <b>${prettyActual}</b> a <b>${prettyNuevo}</b>?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, cambiar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      buttonsStyling: false,
      customClass: {
        popup: "au-sw-popup",
        title: "au-sw-title",
        htmlContainer: "au-sw-text",
        actions: "au-sw-actions",
        confirmButton: "au-sw-confirm",
        cancelButton: "au-sw-cancel",
      },
    });
    if (!res.isConfirmed) return;

    try {
      setChangingId(u.id);
      await api.put(`/api/usuarios/${u.id}/rol`, { rol: nuevoRol });
      await obtenerUsuarios();
      const el = document.getElementById(`au-role-${u.id}`);
      if (el) {
        el.classList.remove("au-role-flash");
        void el.offsetWidth;
        el.classList.add("au-role-flash");
      }
      Swal.fire({
        icon: "success",
        title: "Rol actualizado",
        timer: 900,
        showConfirmButton: false,
        customClass: { popup: "au-sw-popup" },
        buttonsStyling: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No fue posible cambiar el rol",
        text: error?.response?.data?.error || "Intenta de nuevo",
        customClass: { popup: "au-sw-popup" },
        buttonsStyling: false,
      });
    } finally {
      setChangingId("");
    }
  };

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return usuarios.filter((u) => {
      const coincideTexto = `${u.id} ${u.nombre_completo || u.nombre || ""} ${u.email || ""}`.toLowerCase().includes(q);
      const coincideRol = filtroRol === "ALL" ? true : (u.rol || "USER") === filtroRol;
      return coincideTexto && coincideRol;
    });
  }, [usuarios, busqueda, filtroRol]);

  return (
    <div className="au-layout">
      <NavbarAdm />
      <section className="au-main">
        <header className="au-mainHead">
          <div>
            <h1 className="au-title">Gestión de Usuarios</h1>
            <p className="au-sub">Agrega nuevos usuarios o cambia permisos existentes.</p>
          </div>
          <input
            className="au-search"
            placeholder="Buscar por nombre, correo o ID…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </header>

        {err && <div className="au-alert">{err}</div>}

        <div className="au-card">
          <div className="au-cardHead">
            <div className="au-selectWrap">
              <AuSelect
                value={filtroRol}
                onChange={setFiltroRol}
                options={[
                  { value: "ALL", label: "Todos" },
                  { value: "USER", label: "Usuarios" },
                  { value: "ADMIN", label: "Administradores" },
                ]}
              />
            </div>
            <div className="au-chip">{loading ? "Cargando..." : `${lista.length} usuarios`}</div>
          </div>

          <div className="au-tableWrap">
            <table className="au-table">
              <thead className="au-thead">
                <tr>
                  <th className="au-th">ID</th>
                  <th className="au-th">USUARIO</th>
                  <th className="au-th">CORREO</th>
                  <th className="au-th">ROL</th>
                  <th className="au-th">ACCIÓN</th>
                </tr>
              </thead>
              <tbody className="au-tbody">
                {loading ? (
                  <>
                    <tr className="au-skRow"><td colSpan="5" /></tr>
                    <tr className="au-skRow"><td colSpan="5" /></tr>
                    <tr className="au-skRow"><td colSpan="5" /></tr>
                  </>
                ) : lista.length ? (
                  lista.map((u) => (
                    <tr key={u.id} className="au-row">
                      <td className="au-td au-tdMuted">
                        <span className="au-idSmall">{u.id}</span>
                      </td>
                      <td className="au-td au-user">
                        <img
                          src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.nombre_completo || u.email || u.id)}`}
                          alt={u.nombre_completo || "avatar"}
                          className="au-avatar"
                        />
                        <span>{u.nombre_completo || u.nombre || "-"}</span>
                      </td>
                      <td className="au-td">{u.email}</td>
                      <td className="au-td">
                        <AuSelect
                          id={`au-role-${u.id}`}
                          value={u.rol || "USER"}
                          onChange={(val) => confirmarYCambiarRol(u, val)}
                          options={[
                            { value: "USER", label: "Usuario" },
                            { value: "ADMIN", label: "Administrador" },
                          ]}
                          busy={changingId === u.id}
                          disabled={changingId === u.id}
                          className="au-w-full"
                        />
                      </td>
                      <td className="au-td">
                        <button className="au-btnDanger" onClick={() => eliminarUsuario(u.id)} title="Eliminar usuario">
                          🗑 Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="au-empty">No hay usuarios</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
