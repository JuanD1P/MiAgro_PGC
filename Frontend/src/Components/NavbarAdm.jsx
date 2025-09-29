import React from "react";
import { NavLink } from "react-router-dom";
import logo from "../ImagenesP/ImagenesLogin/ADMINLOGO.png";

export default function NavbarAdm() {
  return (
    <aside className="au-nav">
      <div className="au-navBrand">
        <img src={logo} alt="Logo" className="au-navLogo" />
        <div className="au-brandName">ACTIVIDADES</div>
      </div>

      <nav className="au-navMenu">
        <NavLink
          to="/Admin"
          end
          className={({ isActive }) =>
            "au-navItem" + (isActive ? " au-navItem--active" : "")
          }
        >
          Gestion de usuarios.
        </NavLink>

        <NavLink
          to="/Admin/municipios"
          className={({ isActive }) =>
            "au-navItem" + (isActive ? " au-navItem--active" : "")
          }
        >
          Gestion de municipios
        </NavLink>

        <NavLink
          to="/Admin/productos"
          className={({ isActive }) =>
            "au-navItem" + (isActive ? " au-navItem--active" : "")
          }
        >
          Gestion de productos
        </NavLink>
      </nav>
    </aside>
  );
}
