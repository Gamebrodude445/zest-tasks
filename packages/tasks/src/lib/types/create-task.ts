/**
 * It might seem odd that we have two Task types and they're not necessarily the same,
 * I'm isolating this type so its not accessible elsewhere.
 * I'm using the fact that typescript supports duck typing to give it the minimum type needed to work and be as generic as possible.
 */
export type CreateTaskParameters = {
  id: string;
};
