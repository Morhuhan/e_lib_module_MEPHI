import React from 'react';

interface AddButtonProps {
  onClick: () => void;
  ariaLabel: string;
}

/* ───────── без dashed, только цвет ───────── */
const AddButton: React.FC<AddButtonProps> = ({ onClick, ariaLabel }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    className="
      flex h-7 w-7 items-center justify-center rounded-full
      border border-gray-400 text-gray-400
      transition-colors
      hover:bg-emerald-100 hover:text-emerald-400 hover:border-emerald-400
      focus:outline-none
    "
  >
    +
  </button>
);

export default AddButton;