import type { PrintOption } from '@blueflutes/shared';
import { PhotoTile } from '../../components/photo/PhotoTile.js';
import { seedPhotoUrl } from '../../lib/seed-photos.js';

interface PrintCardProps {
  option: PrintOption;
  index: number;
}

export function PrintCard({ option, index }: PrintCardProps) {
  const dollars = option.basePrice >= 100
    ? `$${option.basePrice / 100}`
    : `$${option.basePrice}`;

  return (
    <div className="bg-surface border border-line rounded-[12px] overflow-hidden">
      <PhotoTile ratio="4:3" src={seedPhotoUrl(index + 10, 600)} alt={option.size} />
      <div className="p-[15px]">
        <p className="text-[15px] font-semibold text-ink">{option.size}</p>
        <p className="font-mono text-[11px] text-muted mt-1 mb-3">{option.kind}</p>
        <div className="flex items-center justify-between">
          <span className="font-serif text-[22px] text-ink">{dollars}</span>
          <button className="px-[14px] py-2 bg-ink text-paper rounded-[8px] font-semibold text-[12.5px] transition-colors duration-150 hover:bg-ink-2">
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
