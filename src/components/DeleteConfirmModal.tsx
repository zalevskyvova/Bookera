import React from 'react';
import { Trash2, X } from 'lucide-react';
import { Book, Language } from '../types/book';
import { t } from '../services/i18n';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  book: Book | null;
  language?: Language;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  book,
  language = 'uk',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !book) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-[#1c1d22] border border-[#2e303a] rounded-2xl p-5 shadow-2xl flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t('deleteConfirmTitle', language)}</h3>
              <p className="text-xs text-neutral-400 line-clamp-1">{book.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-[#282a33]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed bg-[#141518] p-3 rounded-xl border border-[#272832]">
          {t('deleteConfirmDesc', language)} &ldquo;{book.title}&rdquo;? {t('deleteConfirmWarn', language)}
        </p>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 rounded-xl bg-[#282a33] hover:bg-[#323541] text-neutral-200 text-xs font-semibold transition-colors"
          >
            {t('cancel', language)}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors shadow-lg shadow-red-900/30"
          >
            {t('deleteBook', language)}
          </button>
        </div>
      </div>
    </div>
  );
};
