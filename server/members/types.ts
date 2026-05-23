export type SocialHandles = {
  slack?: {
    userId?: string;
    handle?: string;
  };
  github?: {
    username: string;
  };
  linkedin?: {
    handle: string;
  };
  x?: {
    handle: string;
  };
  discord?: {
    userId?: string;
    handle?: string;
  };
  notion?: {
    userId?: string;
  };
  email?: string;
};

export type Member = {
  id: string;
  name: string;
  role?: string;
  /** ISO date — enables "since-joined" wraps */
  joinDate?: string;
  socials: SocialHandles;
};
