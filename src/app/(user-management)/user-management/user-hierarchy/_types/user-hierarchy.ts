export type DepthToken = {
  bg: string;
  icon: string;
  border: string;
};

export type UserNodeProps = {
  reportingTo: string;
  depth?: number;
};

export type UserCardProps = {
  userId: string;
  name: string;
  roleName: string;
  depth: number;
};


