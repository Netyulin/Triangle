"use client"

import { useState, useCallback, useMemo } from "react"
import { 
  EyeOff, 
  PencilLine, 
  Plus, 
  Trash2, 
  CheckSquare, 
  FolderInput, 
  Square,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"

export type AdminTableRow = {
  id?: string | number
  title: string
  type: string
  author: string
  status: string
}

type SortField = "title" | "type" | "author" | "status"
type SortDirection = "asc" | "desc"

export type FilterTab = {
  key: string
  label: string
  count?: number
}

type AdminTableProps = {
  title: string
  description?: string
  rows: AdminTableRow[]
  emptyText?: string
  newLabel?: string
  onNew?: () => void
  onEdit?: (row: AdminTableRow) => void
  onDelete?: (row: AdminTableRow) => void
  onToggleVisibility?: (row: AdminTableRow) => void

  // ====== Search & Filter ======
  searchable?: boolean
  searchPlaceholder?: string
  filterTabs?: FilterTab[]
  activeFilter?: string
  onFilterChange?: (key: string) => void

  // ====== Sort ======
  sortable?: boolean

  // ====== Pagination ======
  pageSize?: number
  pageSizeOptions?: number[]

  // ====== Batch Mode Props ======
  batchMode?: boolean
  selectedIds?: Set<string | number>
  onSelectionChange?: (ids: Set<string | number>) => void
  onBatchDelete?: (ids: Array<string | number>) => void
  onBatchHide?: (ids: Array<string | number>) => void
  onBatchShow?: (ids: Array<string | number>) => void
  onBatchMoveCategory?: (ids: Array<string | number>, category: string) => void
  categoryOptions?: string[]
}

function statusClass(status: string) {
  if (status === "published" || status === "done") return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50"
  if (status === "processing") return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900/50"
  if (status === "pending" || status === "draft") return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50"
  if (status === "rejected" || status === "archived" || status === "hidden") return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
  return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
}

function statusLabel(status: string) {
  if (status === "published") return "已发布"
  if (status === "hidden") return "已隐藏"
  if (status === "archived") return "已归档"
  if (status === "pending") return "待处理"
  if (status === "processing") return "处理中"
  if (status === "done") return "已完成"
  if (status === "rejected") return "已拒绝"
  if (status === "draft") return "草稿"
  if (status === "active") return "正常"
  if (status === "disabled") return "已禁用"
  if (status === "banned") return "已封禁"
  return status || "-"
}

export function AdminTable({
  title,
  description,
  rows,
  emptyText = "当前还没有内容。",
  newLabel = "新建",
  onNew,
  onEdit,
  onDelete,
  onToggleVisibility,

  // Search & Filter
  searchable = true,
  searchPlaceholder = "搜索标题、类型、作者...",
  filterTabs = [],
  activeFilter = "all",
  onFilterChange,

  // Sort
  sortable = true,

  // Pagination
  pageSize: defaultPageSize = 10,
  pageSizeOptions = [10, 20, 50],

  // Batch
  batchMode = false,
  selectedIds: controlledSelected,
  onSelectionChange,
  onBatchDelete,
  onBatchHide,
  onBatchShow,
  onBatchMoveCategory,
  categoryOptions = [],
}: AdminTableProps) {

  // ====== Search State ======
  const [searchQuery, setSearchQuery] = useState("")

  // ====== Sort State ======
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  // ====== Pagination State ======
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  // ====== Selection State ======
  const [internalSelected, setInternalSelected] = useState<Set<string | number>>(new Set())
  const activeSelected = controlledSelected ?? internalSelected
  const isControlled = controlledSelected !== undefined

  const setSelected = useCallback((next: Set<string | number>) => {
    if (isControlled && onSelectionChange) {
      onSelectionChange(next)
    } else {
      setInternalSelected(next)
    }
  }, [isControlled, onSelectionChange])

  // ====== Filter & Search Logic ======
  const filteredRows = useMemo(() => {
    let result = rows

    // Apply filter tabs
    if (activeFilter && activeFilter !== "all") {
      result = result.filter(row => row.status === activeFilter)
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(row => 
        row.title.toLowerCase().includes(query) ||
        row.type.toLowerCase().includes(query) ||
        row.author.toLowerCase().includes(query)
      )
    }

    return result
  }, [rows, activeFilter, searchQuery])

  // ====== Sort Logic ======
  const sortedRows = useMemo(() => {
    if (!sortField) return filteredRows

    return [...filteredRows].sort((a, b) => {
      const aVal = a[sortField].toLowerCase()
      const bVal = b[sortField].toLowerCase()
      
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
      return 0
    })
  }, [filteredRows, sortField, sortDirection])

  // ====== Pagination Logic ======
  const totalPages = Math.ceil(sortedRows.length / pageSize)
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedRows.slice(start, start + pageSize)
  }, [sortedRows, currentPage, pageSize])

  // Reset to first page when filter/search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  const handleFilterChange = (key: string) => {
    onFilterChange?.(key)
    setCurrentPage(1)
  }

  // ====== Sort Handler ======
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
    setCurrentPage(1)
  }

  // ====== Selection Handlers ======
  const toggleOne = useCallback((id: string | number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [setSelected])

  const toggleAll = useCallback(() => {
    setSelected(prev => {
      if (prev.size === paginatedRows.length) return new Set()
      return new Set(paginatedRows.map(r => r.id ?? r.title))
    })
  }, [setSelected, paginatedRows])

  const clearAll = useCallback(() => setSelected(new Set()), [setSelected])

  // Derived state
  const allChecked = paginatedRows.length > 0 && activeSelected.size === paginatedRows.length
  const someChecked = activeSelected.size > 0 && !allChecked
  const selectedArray = Array.from(activeSelected)

  // Sort icon helper
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
    return sortDirection === "asc" 
      ? <ArrowUp className="h-3.5 w-3.5 text-primary" />
      : <ArrowDown className="h-3.5 w-3.5 text-primary" />
  }

  // Pagination helpers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page)
  }

  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, sortedRows.length)

  return (
    <section className="admin-panel p-5 relative">
      {/* Header */}
      <div className={cn(
        "mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        batchMode && activeSelected.size > 0 && "opacity-40 pointer-events-none"
      )}>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {onNew ? (
          <button onClick={onNew} className="admin-primary-btn">
            <Plus className="h-4 w-4" />
            {newLabel}
          </button>
        ) : null}
      </div>

      {/* Search & Filter Tabs */}
      {(searchable || filterTabs.length > 0) && (
        <div className="mb-4 space-y-3">
          {/* Filter Tabs */}
          {filterTabs.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {filterTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => handleFilterChange(tab.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                    activeFilter === tab.key
                      ? "bg-primary text-white"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                  )}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px]",
                      activeFilter === tab.key
                        ? "bg-white/20 text-white"
                        : "bg-background text-muted-foreground"
                    )}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Search Bar */}
          {searchable && (
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-10 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table Body */}
      {sortedRows.length ? (
        <>
          <div className="overflow-hidden rounded-2xl border border-border">
            {/* Table Header */}
            <div className={cn(
              "grid items-center bg-secondary/60 px-4 py-3 text-xs font-semibold tracking-[0.16em] text-muted-foreground",
              batchMode ? "grid-cols-[36px_1.6fr_0.8fr_0.8fr_0.8fr_1.1fr]" : "grid-cols-[1.6fr_0.8fr_0.8fr_0.8fr_1.1fr]"
            )}>
              {batchMode ? (
                <button
                  onClick={toggleAll}
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-md border transition-colors",
                    allChecked ? "border-primary bg-primary text-white" :
                    someChecked ? "border-primary bg-primary/10 text-primary" :
                    "border-border hover:border-primary/50"
                  )}
                  aria-label={allChecked ? "取消全选" : "全选"}
                >
                  {(allChecked || someChecked) ? (
                    <CheckSquare className="h-3.5 w-3.5" />
                  ) : (
                    <Square className="h-3.5 w-3.5" />
                  )}
                </button>
              ) : null}
              
              {/* Sortable Headers */}
              <button 
                onClick={() => sortable && handleSort("title")}
                className={cn("flex items-center gap-1 text-left", sortable && "cursor-pointer hover:text-foreground")}
                disabled={!sortable}
              >
                标题
                {sortable && <SortIcon field="title" />}
              </button>
              <button 
                onClick={() => sortable && handleSort("type")}
                className={cn("flex items-center gap-1 text-left", sortable && "cursor-pointer hover:text-foreground")}
                disabled={!sortable}
              >
                类型
                {sortable && <SortIcon field="type" />}
              </button>
              <button 
                onClick={() => sortable && handleSort("author")}
                className={cn("flex items-center gap-1 text-left", sortable && "cursor-pointer hover:text-foreground")}
                disabled={!sortable}
              >
                作者
                {sortable && <SortIcon field="author" />}
              </button>
              <button 
                onClick={() => sortable && handleSort("status")}
                className={cn("flex items-center gap-1 text-left", sortable && "cursor-pointer hover:text-foreground")}
                disabled={!sortable}
              >
                状态
                {sortable && <SortIcon field="status" />}
              </button>
              <span>操作</span>
            </div>

            {/* Rows */}
            {paginatedRows.map((row) => {
              const rowId = row.id ?? row.title
              const checked = activeSelected.has(rowId)

              return (
                <div
                  key={rowId}
                  className={cn(
                    "grid items-center border-t border-border bg-card px-4 py-4 text-sm transition-colors hover:bg-secondary/40 dark:hover:bg-slate-900/35",
                    batchMode ? "grid-cols-[36px_1.6fr_0.8fr_0.8fr_0.8fr_1.1fr]" : "grid-cols-[1.6fr_0.8fr_0.8fr_0.8fr_1.1fr]",
                    batchMode && checked && "bg-primary/5 ring-1 ring-primary/20"
                  )}
                >
                  {/* Checkbox column */}
                  {batchMode ? (
                    <button
                      onClick={() => toggleOne(rowId)}
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                        checked ? "border-primary bg-primary text-white" : "border-border hover:border-primary/50"
                      )}
                      aria-label="选择"
                    >
                      {checked ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                    </button>
                  ) : null}

                  <span className="font-semibold text-foreground truncate" title={row.title}>{row.title}</span>
                  <span className="text-muted-foreground">{row.type}</span>
                  <span className="text-muted-foreground">{row.author}</span>
                  <span>
                    <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-semibold", statusClass(row.status))}>
                      {statusLabel(row.status)}
                    </span>
                  </span>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {onEdit ? (
                      <button onClick={() => onEdit(row)} className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-accent/25 hover:text-accent">
                        <PencilLine className="h-3.5 w-3.5" />
                        编辑
                      </button>
                    ) : null}
                    {onToggleVisibility ? (
                      <button onClick={() => onToggleVisibility(row)} className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-sky-300 hover:text-sky-600">
                        <EyeOff className="h-3.5 w-3.5" />
                        {row.status === "hidden" ? "显示" : "隐藏"}
                      </button>
                    ) : null}
                    {onDelete ? (
                      <button onClick={() => onDelete(row)} className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-rose-300 hover:text-rose-600">
                        <Trash2 className="h-3.5 w-3.5" />
                        删除
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  显示 <span className="font-medium text-foreground">{startItem}-{endItem}</span> 条，
                  共 <span className="font-medium text-foreground">{sortedRows.length}</span> 条
                </span>
                <div className="flex items-center gap-2">
                  <span>每页</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="h-8 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-primary"
                  >
                    {pageSizeOptions.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                  <span>条</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                  title="首页"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                  title="上一页"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition",
                          currentPage === pageNum
                            ? "bg-primary text-white"
                            : "border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                  title="下一页"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                  title="末页"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ====== Floating Batch Action Bar ====== */}
          {batchMode && selectedArray.length > 0 && (
            <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-background px-5 py-3 shadow-2xl shadow-primary/10 backdrop-blur-sm">
                <span className="whitespace-nowrap text-sm font-semibold text-foreground">
                  已选 <span className="text-primary">{selectedArray.length}</span> 项
                </span>

                <div className="h-5 w-px shrink-0 bg-border" />

                {onBatchDelete ? (
                  <button
                    onClick={() => { onBatchDelete(selectedArray); clearAll() }}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    批量删除
                  </button>
                ) : null}

                {onBatchHide ? (
                  <button
                    onClick={() => { onBatchHide(selectedArray); clearAll() }}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    批量隐藏
                  </button>
                ) : null}

                {onBatchShow ? (
                  <button
                    onClick={() => { onBatchShow(selectedArray); clearAll() }}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    批量显示
                  </button>
                ) : null}

                {onBatchMoveCategory && categoryOptions.length > 0 ? (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        onBatchMoveCategory(selectedArray, e.target.value)
                        e.target.value = ""
                        clearAll()
                      }
                    }}
                    className="shrink-0 cursor-pointer rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground outline-none transition hover:border-indigo-300 focus:border-indigo-500"
                    defaultValue=""
                  >
                    <option value="" disabled>移动到分类</option>
                    {categoryOptions.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                ) : null}

                <div className="h-5 w-px shrink-0 bg-border" />

                <button
                  onClick={clearAll}
                  className="shrink-0 text-xs text-muted-foreground transition hover:text-foreground"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="admin-muted-panel border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
          {searchQuery ? "没有找到匹配的内容" : emptyText}
        </div>
      )}
    </section>
  )
}
