// Components
export { Button, type ButtonProps, buttonVariants } from "./components/button";
export { Input, type InputProps } from "./components/input";
export { Modal, type ModalProps } from "./components/modal";
export { Tooltip, type TooltipProps } from "./components/tooltip";
export {
  Avatar,
  type AvatarProps,
  type StatusType,
} from "./components/avatar";
export { Badge, type BadgeProps } from "./components/badge";
export { Titlebar, type TitlebarProps } from "./components/titlebar";
export { Skeleton, type SkeletonProps } from "./components/skeleton";
export { Spinner, type SpinnerProps } from "./components/spinner";
export { Switch, type SwitchProps } from "./components/switch";
export { Kbd, type KbdProps } from "./components/kbd";
export {
  Surface,
  type SurfaceProps,
  surfaceVariants,
} from "./components/surface";
export {
  IconButton,
  type IconButtonProps,
  iconButtonVariants,
} from "./components/icon-button";
export { WorkspaceHeader, type WorkspaceHeaderProps } from "./components/workspace-header";
export { SectionHeader } from "./components/section-header";
export { EmptyState } from "./components/empty-state";
export { StatusBadge } from "./components/status-badge";
export { SegmentedControl, SegmentedControlItem } from "./components/segmented-control";

// Radix-based primitives
export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  type DialogContentProps,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./components/dialog";
export {
  Popover,
  PopoverTrigger,
  PopoverAnchor,
  PopoverClose,
  PopoverContent,
} from "./components/popover";
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./components/dropdown-menu";
export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "./components/tabs";
export {
  ThemeProvider,
  ThemeScript,
  useTheme,
  type ThemePreference,
  type ResolvedTheme,
  type ThemeProviderProps,
} from "./components/theme-provider";

// Motion tokens
export {
  DURATION,
  EASING,
  SPRING,
  fade,
  fadeInUp,
  scaleIn,
  sheetRight,
} from "./lib/motion";

// Utilities
export { cn } from "./lib/utils";
