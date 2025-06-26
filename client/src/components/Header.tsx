import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext.tsx';
import httpClient from '../utils/httpsClient.tsx';
import Cookies from 'js-cookie';
import ReferenceManagerModal from './ReferenceManagerModal.tsx';
import BorrowModal from './Modals/BorrowModal.tsx';

/* Пути к иконкам из public/ */
const REF_ICON = '/справочники.png';
const BORROW_ICON = '/возврат-выдача.png';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { role, username, clearAuth } = useAuth();

  const [refOpen, setRefOpen] = useState(false);
  const [listsOpen, setListsOpen] = useState(false);
  const [borrowOpen, setBorrowOpen] = useState(false);

  /* Закрываем дропдаун кликом вне его */
  const listsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (listsRef.current && !listsRef.current.contains(e.target as Node)) {
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

  /* Общий класс для пунктов меню */
  const menuBtn =
    'flex items-center space-x-2 px-3 py-2 rounded hover:bg-gray-700 focus:outline-none';

  return (
    <header className="bg-gray-800 text-white py-4 shadow sticky top-0 z-50">
      <nav className="w-full max-w-full flex items-center px-4">
        {/* Левая часть навигации */}
        <div className="flex items-center space-x-4" ref={listsRef}>
          {role === 'LIBRARIAN' && (
            <>
              {/* КНОПКА «Списки» + ДРОПДАУН */}
              <div className="relative">
                <button
                  onClick={() => setListsOpen((o) => !o)}
                  className={menuBtn}
                >
                  <span>Списки ▾</span>
                </button>

                {listsOpen && (
                  <div
                    className="absolute top-full left-0 w-40 bg-gray-700 shadow-lg
                               flex flex-col divide-y divide-gray-600"
                  >
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
              </div>

              <button
                onClick={() => navigate('/borrow-records')}
                className={menuBtn}
              >
                <span>Записи</span>
              </button>
              <button onClick={() => navigate('/reports')} className={menuBtn}>
                <span>Отчёты</span>
              </button>
            </>
          )}

          {role === 'ADMIN' && (
            <button
              onClick={() => navigate('/admin/librarians')}
              className={menuBtn}
            >
              <span>Управление</span>
            </button>
          )}
        </div>

        {/* Центр — модальные кнопки */}
        {role === 'LIBRARIAN' && (
          <div className="flex-1 flex justify-center space-x-4">
            <button onClick={() => setBorrowOpen(true)} className={menuBtn}>
              <img src={BORROW_ICON} alt="" className="w-5 h-5 shrink-0" />
              <span>Сдать/Принять&nbsp;книгу</span>
            </button>

            <button onClick={() => setRefOpen(true)} className={menuBtn}>
              <img src={REF_ICON} alt="" className="w-5 h-5 shrink-0" />
              <span>Справочники</span>
            </button>
          </div>
        )}

        {/* Правая часть — пользователь / выход */}
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

      {/* Модалки */}
      <ReferenceManagerModal open={refOpen} onOpenChange={setRefOpen} />
      <BorrowModal
        open={borrowOpen}
        onClose={() => setBorrowOpen(false)}
        onDone={() => setBorrowOpen(false)}
      />
    </header>
  );
};

export default Header;