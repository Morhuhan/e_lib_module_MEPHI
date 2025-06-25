import { X } from 'lucide-react';

export interface ChipProps {
  label: string;
  onRemove: () => void;
}

const Chip: React.FC<ChipProps> = ({ label, onRemove }) => (
  <span className="flex items-center gap-1 rounded-2xl bg-gray-200 px-3 py-0.5 text-sm">
    {label}
    <button
      type="button"
      onClick={onRemove}
      className="hover:text-red-600 focus:outline-none"
      aria-label={`Удалить ${label}`}
    >
      <X size={14} />
    </button>
  </span>
);

export default Chip;