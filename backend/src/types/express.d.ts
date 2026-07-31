declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string; // maps to empNo
        name: string;
        email: string;
        position: string | null;
        isAdmin: boolean;
        teamId: string | null;
      };
    }
  }
}

export {};
