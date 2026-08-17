import { IconButton, Input, InputGroup, type InputProps } from '@chakra-ui/react'
import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export const PasswordInput = forwardRef<HTMLInputElement, InputProps>(function PasswordInput(
  props,
  ref,
) {
  const [visible, setVisible] = useState(false)

  return (
    <InputGroup
      endElement={
        <IconButton
          type="button"
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((current) => !current)}
          variant="ghost"
          size="xs"
          color="fg.muted"
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </IconButton>
      }
    >
      <Input ref={ref} type={visible ? 'text' : 'password'} {...props} />
    </InputGroup>
  )
})
