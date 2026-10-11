interface TenantFooterProps {
  showPoweredBy?: boolean;
}

/**
 * Footer shown on tenant-hosted pages.
 * Only renders the "Powered by Blueflutes" attribution when `showPoweredBy`
 * is true (default). In production this will be gated to the Solo plan;
 * Studio and Atelier tenants can suppress it.
 */
export function TenantFooter({ showPoweredBy = true }: TenantFooterProps) {
  if (!showPoweredBy) return null;

  return (
    <footer className="py-8 text-center font-mono text-[11px] text-ink-3 tracking-[0.08em]">
      POWERED BY BLUEFLUTES
    </footer>
  );
}
