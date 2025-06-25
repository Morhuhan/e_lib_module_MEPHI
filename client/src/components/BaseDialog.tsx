import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { ReactNode } from 'react';

export interface BaseDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  /** max-width класса (по умолчанию 'max-w-lg') */
  widthClass?: string;
  footer?: ReactNode;
}

const BaseDialog: React.FC<BaseDialogProps> = ({
  open,
  onOpenChange,
  title,
  children,
  widthClass = 'max-w-lg',
  footer,
}) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <AnimatePresence>
      {open && (
        <Dialog.Portal forceMount>
          {/* overlay */}
          <Dialog.Overlay asChild>
            <motion.div
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          </Dialog.Overlay>

          {/* root-контейнер БЕЗ фона → радиусы видны */}
          <Dialog.Content 
            asChild
            className="shadow-none"
            aria-describedby="base-dialog-desc"
          >
            <motion.div
              className={`
                fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-2xl
                -translate-x-1/2 -translate-y-1/2 flex
                bg-transparent pointer-events-none
              `}
              role="dialog"
              aria-modal="true"
              initial={{ scale: 0.92, opacity: 0, y: '-50%', x: '-50%' }}
              animate={{ scale: 1, opacity: 1, y: '-50%', x: '-50%' }}
              exit={{ scale: 0.92, opacity: 0, y: '-50%', x: '-50%' }}
              style={{ maxHeight: '90vh' }}
            >
              {/* Внутренняя «панель» с тенью, скруглениями и границей */}
              <div
                className="flex flex-col w-full pointer-events-auto shadow-xl overflow-hidden"
                style={{ maxHeight: '90vh' }}
              >
                {/* ───── header ───── */}
                <header
                  className="
                    px-6 py-4 flex items-center
                    bg-[#F5F5DC] rounded-t-2xl
                    relative z-10
                  "
                >
                  <Dialog.Title asChild>
                    <h2 className="text-lg font-semibold flex-1 mr-4 min-w-0">{title}</h2>
                  </Dialog.Title>

                  <Dialog.Close asChild>
                    <button
                      aria-label="Закрыть"
                      className="
                        h-8 w-8 flex items-center justify-center flex-shrink-0
                        rounded-full bg-red-600 text-white hover:bg-red-700
                      "
                    >
                      <X size={18} />
                    </button>
                  </Dialog.Close>
                </header>

                {/* ───── body ───── */}
                <div
                  className="flex-1 overflow-y-auto px-6 pt-6 py-4 bg-white relative z-0"
                >
                  {children}
                </div>

                {/* ───── footer ───── */}
                <footer
                  className="
                    px-6 py-4 flex justify-end gap-2
                    bg-[#F5F5DC] rounded-b-2xl
                    relative z-10
                  "
                >
                  {footer}
                </footer>
              </div>
            </motion.div>
          </Dialog.Content>

          {/* скрытое описание для ARIA (устраняет предупреждение Radix) */}
          <Dialog.Description id="base-dialog-desc" className="sr-only">
            Диалоговое окно
          </Dialog.Description>
        </Dialog.Portal>
      )}
    </AnimatePresence>
  </Dialog.Root>
);

export default BaseDialog;