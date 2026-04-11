import { Dialog as DialogPrimitive } from 'bits-ui'
import Overlay from './dialog-overlay.svelte'
import Content from './dialog-content.svelte'
import Title from './dialog-title.svelte'
import Description from './dialog-description.svelte'
import Footer from './dialog-footer.svelte'
import Header from './dialog-header.svelte'

const Root = DialogPrimitive.Root
const Trigger = DialogPrimitive.Trigger
const Close = DialogPrimitive.Close
const Portal = DialogPrimitive.Portal

export {
  Root,
  Root as Dialog,
  Trigger,
  Trigger as DialogTrigger,
  Close,
  Close as DialogClose,
  Portal,
  Portal as DialogPortal,
  Overlay,
  Overlay as DialogOverlay,
  Content,
  Content as DialogContent,
  Title,
  Title as DialogTitle,
  Description,
  Description as DialogDescription,
  Footer,
  Footer as DialogFooter,
  Header,
  Header as DialogHeader
}
