import { BrowserRouter as Router, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import Login from './Components/Login';
import Registro from './Components/Registro';
import Inicio from './Components/Agricultores/Inicio';
import NotFound from './Components/NotFound';
import ProtectedRoute from './Components/PrivateRoute';
import Admin from './Components/Administradores/Admin';
import Navbar from './Components/Navbar';
import Home from './Components/Home';
import Footer from './Components/Footer';
import NavbarAdm from './Components/Administradores/NavbarAdm';
import PreciosDiarios from './Components/Agricultores/PreciosDiarios';
import ProductosAdmin from './Components/Administradores/ProductosAdmin';
import MunicipiosAdm from './Components/Administradores/MunicipiosAdm';
import MunicipioDetalle from './Components/Administradores/MunicipioDetalle';
import ChatIA from './Components/Agricultores/ChatIA';
import TopProductos from './Components/Agricultores/TopProductos';
import StartModal from './Components/Agricultores/VistasTop3/StartModal.jsx';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Navigate to="/Home" />} />
                <Route path="/userlogin" element={<Login />} />
                <Route path="/Registro" element={<Registro />} />


                 {/* RUTAS PARA EL ADMINISTRADOR */}
                <Route element={<LayoutWithNavbar2 />}>
                    <Route path="/Admin" element={
                        <ProtectedRoute allowedRoles={['ADMIN']}>
                            <Admin />
                        </ProtectedRoute>
                    } />

                    <Route path="/Admin/Productos" element={
                        <ProtectedRoute allowedRoles={['ADMIN']}>
                            <ProductosAdmin />
                        </ProtectedRoute>
                    } />

                    <Route path="/Admin/Municipios" element={
                        <ProtectedRoute allowedRoles={['ADMIN']}>
                            <MunicipiosAdm />
                        </ProtectedRoute>
                    } />
                    <Route path="/Admin/Municipios/:id" element={
                        <ProtectedRoute allowedRoles={['ADMIN']}>
                            <MunicipioDetalle />
                        </ProtectedRoute>
                    } />

                </Route>

                <Route element={<LayoutWithNavbar />}>
                <Route path="/Home" element={<Home />} />
              

                {/* RUTAS PARA LOS USUARIOS */}   

                    <Route path ="/TopProductos" element={
                        <ProtectedRoute allowedRoles={['USER']}>
                            <TopProductos />
                        </ProtectedRoute>
                    } />

                    <Route path="/StartModal" element={
                        <ProtectedRoute allowedRoles={['USER']}>
                            <StartModal />
                        </ProtectedRoute>
                    } />
                    
                    <Route path="/Inicio" element={
                        <ProtectedRoute allowedRoles={['USER']}>
                            <Inicio />
                        </ProtectedRoute>
                    } />

                      <Route path="/PreciosDiarios" element={
                        <ProtectedRoute allowedRoles={['USER']}>
                            <PreciosDiarios />
                        </ProtectedRoute>
                    } />

                    </Route>
                    
                    <Route element={<LayoutWithNavbar2 />}>
                    <Route path="/ChatIA" element={
                        <ProtectedRoute allowedRoles={['USER']}>
                            <ChatIA />
                        </ProtectedRoute>
                    } />
                   </Route>
                   <Route path="/StartModal" element={
                        <ProtectedRoute allowedRoles={['USER']}>
                            <StartModal />
                        </ProtectedRoute>
                    } />

                

    

                {/* RUTA NO ENCONTRADA */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Router>
    );
}



function LayoutWithNavbar() {
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
    </>
  );
}
function LayoutWithNavbar2() {
  return (
    <>
      <Navbar />
      <Outlet />

    </>
  );
}
export default App;
