import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext.tsx';
import httpClient from '../utils/httpsClient.tsx';
import Cookies from 'js-cookie';
import ReferenceManagerModal from './ReferenceManagerModal.tsx';
import BorrowModal from './Modals/BorrowModal.tsx';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { role, username, clearAuth } = useAuth();

  const [refOpen, setRefOpen] = useState(false);
  const [listsOpen, setListsOpen] = useState(false);
  const [borrowOpen, setBorrowOpen] = useState(false); // Added state for BorrowModal

  /* Закрываем дропдаун кликом вне его */
  const listsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        listsRef.current &&
        !listsRef.current.contains(e.target as Node)
      ) {
        setListsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    try {
      await httpClient.post('/auth/logout');
    } finally {
      Cookies.remove('username');
      clearAuth();
      navigate('/login');
    }
  };

  return (
    <header className="bg-gray-800 text-white py-4 shadow sticky top-0 z-50">
      <nav className="w-full max-w-full flex justify-between items-center px-4">
        <div className="relative space-x-4 flex items-center" ref={listsRef}>
          {role === 'LIBRARIAN' && (
            <>
              {/* КНОПКА Списки */}
              <button
                onClick={() => setListsOpen((o) => !o)}
                className="hover:underline focus:outline-none"
              >
                Списки ▾
              </button>

              {/* DROPDOWN */}
              {listsOpen && (
                <div className="absolute left-0 mt-2 w-40 rounded-lg bg-gray-700 shadow-lg flex flex-col divide-y divide-gray-600">
                  <button
                    onClick={() => {
                      navigate('/lists');
                      setListsOpen(false);
                    }}
                    className="px-4 py-2 text-left hover:bg-gray-600"
                  >
                    Книги
                  </button>
                  <button
                    onClick={() => {
                      navigate('/copies');
                      setListsOpen(false);
                    }}
                    className="px-4 py-2 text-left hover:bg-gray-600"
                  >
                    Экземпляры
                  </button>
                </div>
              )}

              <button onClick={() => setBorrowOpen(true)} className="hover:underline">
                Сдать/Принять книгу
              </button>
              <button onClick={() => navigate('/borrow-records')} className="hover:underline">
                Записи
              </button>
              <button onClick={() => navigate('/reports')} className="hover:underline">
                Отчёты
              </button>
              <button onClick={() => navigate('/import-export')} className="hover:underline">
                Импорт/Экспорт
              </button>
              <button onClick={() => setRefOpen(true)} className="hover:underline">
                Справочники
              </button>
            </>
          )}

          {/* модалки */}
          <ReferenceManagerModal open={refOpen} onOpenChange={setRefOpen} />
          <BorrowModal
            open={borrowOpen}
            onClose={() => setBorrowOpen(false)}
            onDone={() => setBorrowOpen(false)} // Close modal after saving
          />

          {role === 'ADMIN' && (
            <button
              onClick={() => navigate('/admin/librarians')}
              className="hover:underline"
            >
              Управление
            </button>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <span className="font-semibold">{username ?? 'Гость'}</span>
          {role && (
            <button
              onClick={handleLogout}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded"
            >
              Выход
            </button>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;