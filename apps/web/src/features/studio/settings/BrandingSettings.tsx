import { Eyebrow } from '../../../components/ui/Eyebrow.js';
import ThemeEditor from '../../../pages/dashboard/settings/ThemeEditor.js';

export default function BrandingSettings() {
  return (
    <div>
      <Eyebrow>BRANDING</Eyebrow>
      <h2 className="font-serif text-[28px] font-medium text-ink mt-1 mb-8">Branding</h2>
      <ThemeEditor />
    </div>
  );
}
