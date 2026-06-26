export const generatePaginationQuery = ({ page = 1, perPage = 15 }: { page?: number, perPage?: number }) => ({
  take: perPage,
  skip: (page - 1) * perPage
})

export const generatePaginationMeta = (currentPage: number = 1, itemsPerPage: number = 15, totalCount: number) => ({
  meta: {
    currentPage,
    itemsPerPage,
    totalItems: totalCount,
    totalPages: Math.ceil(totalCount / itemsPerPage),
  }
})