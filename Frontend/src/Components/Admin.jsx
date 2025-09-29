import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import "@sweetalert2/themes/borderless/borderless.css";
import "./DOCSS/Admin.css";
// ⬇️ Nuevo: usamos la navbar separada
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

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("ALL");

  useEffect(() => { obtenerUsuarios(); }, []);

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
      text: "Esto eliminará el documento y la cuenta de Auth.",
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
          Swal.showValidationMessage(
            error?.response?.data?.error || "No fue posible eliminar el usuario"
          );
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

  const cambiarRol = async (id, rolActual, nuevoRol) => {
    if (rolActual === nuevoRol) return;
    try {
      await api.put(`/api/usuarios/${id}/rol`, { rol: nuevoRol });
      await obtenerUsuarios();
      const el = document.getElementById(`au-role-${id}`);
      if (el) { el.classList.remove("au-role-flash"); void el.offsetWidth; el.classList.add("au-role-flash"); }
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
    }
  };

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return usuarios.filter((u) => {
      const coincideTexto =
        `${u.id} ${u.nombre_completo || u.nombre || ""} ${u.email || ""}`
          .toLowerCase()
          .includes(q);
      const coincideRol =
        filtroRol === "ALL" ? true : (u.rol || "USER") === filtroRol;
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
              <select
                className="au-filter"
                value={filtroRol}
                onChange={(e) => setFiltroRol(e.target.value)}
              >
                <option value="ALL">Todos</option>
                <option value="USER">Usuarios</option>
                <option value="ADMIN">Administradores</option>
              </select>
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
                        <select
                          id={`au-role-${u.id}`}
                          className="au-role"
                          value={u.rol || "USER"}
                          onChange={(e) => cambiarRol(u.id, u.rol, e.target.value)}
                        >
                          <option value="USER">Usuario</option>
                          <option value="ADMIN">Administrador</option>
                        </select>
                      </td>
                      <td className="au-td">
                        <button
                          className="au-btnDanger"
                          onClick={() => eliminarUsuario(u.id)}
                          title="Eliminar usuario"
                        >
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
