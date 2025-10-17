import React from "react";
import { NavLink } from "react-router-dom";
import logo from "/ADMINLOGO.png";

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
          Gestión de usuarios
        </NavLink>

        <NavLink
          to="/Admin/Municipios"
          className={({ isActive }) =>
            "au-navItem" + (isActive ? " au-navItem--active" : "")
          }
        >
          Gestión de municipios
        </NavLink>

        <NavLink
          to="/Admin/Productos"
          className={({ isActive }) =>
            "au-navItem" + (isActive ? " au-navItem--active" : "")
          }
        >
          Gestión de productos
        </NavLink>
      </nav>
    </aside>
  );
}
