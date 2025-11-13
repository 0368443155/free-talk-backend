import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  // Không hiển thị phân trang nếu chỉ có 1 trang
  if (totalPages <= 1) {
    return null
  }

  // Tạo mảng các trang để hiển thị
  const generatePages = () => {
    // Luôn hiển thị trang đầu, trang cuối và các trang xung quanh trang hiện tại
    const pages = []
    
    // Trang đầu
    pages.push(1)
    
    // Trang trước trang hiện tại
    if (currentPage > 3) {
      pages.push("ellipsis-start")
    }
    
    // Các trang xung quanh trang hiện tại
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (i === 1 || i === totalPages) continue // Đã thêm trang đầu và trang cuối
      pages.push(i)
    }
    
    // Trang sau trang hiện tại
    if (currentPage < totalPages - 2) {
      pages.push("ellipsis-end")
    }
    
    // Trang cuối
    if (totalPages > 1) {
      pages.push(totalPages)
    }
    
    return pages
  }

  const pages = generatePages()

  return (
    <div className={cn("flex items-center justify-center space-x-2", className)}>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Trang trước</span>
      </Button>
      
      {pages.map((page, index) => {
        if (page === "ellipsis-start" || page === "ellipsis-end") {
          return (
            <Button
              key={`ellipsis-${index}`}
              variant="outline"
              size="icon"
              disabled
              className="cursor-default"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Trang khác</span>
            </Button>
          )
        }
        
        return (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="icon"
            onClick={() => onPageChange(page as number)}
            className={cn(
              currentPage === page ? "pointer-events-none" : ""
            )}
          >
            {page}
            <span className="sr-only">Trang {page}</span>
          </Button>
        )
      })}
      
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Trang sau</span>
      </Button>
    </div>
  )
}