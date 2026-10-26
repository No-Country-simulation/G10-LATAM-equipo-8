export interface DatosPaginacionHistorial {
  offset: number;
  limit: number;
  total: number;
}

export interface ResumenPaginacionHistorial {
  firstItem: number;
  lastItem: number;
  currentPage: number;
  totalPages: number;
  previousOffset: number | null;
  nextOffset: number | null;
}

export function resumirPaginacionHistorial({
  offset,
  limit,
  total,
}: DatosPaginacionHistorial): ResumenPaginacionHistorial {
  const pageSize = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 1;
  const itemCount = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  const requestedOffset = Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0;
  const totalPages = Math.ceil(itemCount / pageSize);
  const lastPageOffset = totalPages > 0 ? (totalPages - 1) * pageSize : 0;
  const safeOffset = Math.min(requestedOffset, lastPageOffset);

  return {
    firstItem: itemCount === 0 ? 0 : safeOffset + 1,
    lastItem: Math.min(safeOffset + pageSize, itemCount),
    currentPage: totalPages === 0 ? 0 : Math.floor(safeOffset / pageSize) + 1,
    totalPages,
    previousOffset: safeOffset > 0 ? Math.max(0, safeOffset - pageSize) : null,
    nextOffset: safeOffset + pageSize < itemCount ? safeOffset + pageSize : null,
  };
}
