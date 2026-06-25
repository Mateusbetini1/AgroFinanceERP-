import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RowActionsProps {
  onEdit: () => void
  onDelete: () => void
  isDeleting?: boolean
}

export function RowActions({ onEdit, onDelete, isDeleting }: RowActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
        Editar
      </Button>
      <Button type="button" variant="destructive" size="sm" loading={isDeleting} onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
        Excluir
      </Button>
    </div>
  )
}
