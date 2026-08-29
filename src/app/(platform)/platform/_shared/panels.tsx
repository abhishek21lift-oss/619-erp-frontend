export const CommandCenterPanel = dynamic(() => import('@/components/platform/CommandCenterRoot'), {
  loading: () => <PanelSkeleton label="Collecting system state…" />,
});