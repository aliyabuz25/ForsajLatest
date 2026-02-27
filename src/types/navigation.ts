export interface SidebarItem {
  title: string;
  icon?: string;
  path?: string;
  children?: SidebarItem[];
  badge?: {
    text: string;
    color: string;
  };
}
