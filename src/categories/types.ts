export type CategoryTree = {
    id: number;
    name: string;
    icon?: string;
    parent?: CategoryTree;
    children?: CategoryTree[];
  };
  
  export type FlatCategory = {
    id: number;
    name: string;
    icon?: string;
    parentId: number | null;
    path?: string[];
  };