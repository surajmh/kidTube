/** What is narrowing a parent list: free text, one child, one category. */
export type ParentFilters = {
  query: string;
  childId: string | null;
  categoryId: string | null;
};
