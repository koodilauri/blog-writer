import { Select as SelectPrimitive } from 'bits-ui'
import Trigger from './select-trigger.svelte'
import Content from './select-content.svelte'
import Item from './select-item.svelte'

const Root = SelectPrimitive.Root
const Group = SelectPrimitive.Group
const GroupHeading = SelectPrimitive.GroupHeading
const Portal = SelectPrimitive.Portal
const Viewport = SelectPrimitive.Viewport

export {
  Root,
  Root as Select,
  Group,
  GroupHeading,
  Portal,
  Viewport,
  Trigger,
  Trigger as SelectTrigger,
  Content,
  Content as SelectContent,
  Item,
  Item as SelectItem
}
