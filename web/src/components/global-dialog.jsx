import { useTranslation } from 'react-i18next'
import { Button } from '@/shadcn/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shadcn/ui/dialog'
import { useDialog, useDialogStore } from '@/stores/dialog-store'

export function GlobalDialog() {
  const { t } = useTranslation()
  const { open, title, description } = useDialog()
  const close = useDialogStore(s => s.close)

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && close()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            {t('error.dialogClose')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
