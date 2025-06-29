import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from '../components/Header.tsx';
import Login from '../pages/Login.tsx';
import Lists from '../pages/Lists.tsx';
import BorrowRecordsList from '../pages/BorrowRecordsList.tsx';
import Reports from '../pages/Reports.tsx';
import LibrarianRoute from './LibrarianRoute.tsx';
import AdminRoute from './AdminRoute.tsx';
import ManageLibrarians from '../pages/ManageLibrarians.tsx';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Copies from '../pages/Copies.tsx';

const Layout: React.FC = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    /* Контейнер-колонка на всю высоту окна браузера */
    <div className="h-screen flex flex-col">
      {/* Шапка рендерится поверх, вне области, которая скроллится */}
      {!isHomePage && <Header />}

      {/* Основной контент получает собственную вертикальную прокрутку */}
      <main className="flex-1 overflow-y-auto">
        <ToastContainer />
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<LibrarianRoute />}>
            <Route path="/lists" element={<Lists />} />
            <Route path="/borrow-records" element={<BorrowRecordsList />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/copies" element={<Copies />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/admin/librarians" element={<ManageLibrarians />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
};

export default Layout;