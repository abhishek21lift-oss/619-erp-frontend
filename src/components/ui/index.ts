// frontend/src/components/ui/index.ts
//
// Public surface of the design system. Add anything new here so call sites
// import from `@/components/ui` rather than reaching into individual files.

export { cn } from './cn';
export type { ClassValue } from './cn';

export { Button } from './Button';
export type { ButtonProps } from './Button';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  CardFooter,
} from './Card';

export { Badge, statusTone } from './Badge';
export type { BadgeProps } from './Badge';

export { Skeleton, SkeletonText, SkeletonKpi } from './Skeleton';
export type { SkeletonProps } from './Skeleton';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { KpiCard } from './KpiCard';
export type { KpiCardProps } from './KpiCard';

export { DonutChart } from './DonutChart';
export type { DonutChartProps, DonutDatum } from './DonutChart';

export { PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';

export { FloatInput } from './FloatInput';
export { SearchInput } from './SearchInput';
export type { SearchInputProps } from './SearchInput';

export { FilterChips } from './FilterChips';
export type { FilterChipsProps, FilterChip } from './FilterChips';

export { StatCard } from './StatCard';
export type { StatCardProps } from './StatCard';

export {
  GlassTable, GlassThead, GlassTh, GlassTr, GlassTd, GlassTbody,
} from './GlassTable';
export type { GlassTableProps } from './GlassTable';

export { default as ComingSoon } from './ComingSoon';

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './table';

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  CHART_COLORS,
  useChartConfig,
} from './chart';
export type { ChartConfig, ChartColor } from './chart';
