import { forwardRef } from 'react'

import '../../styles/button.css'

const Button = forwardRef(function Button(
  { className = '', variant = 'default', size = 'default', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`button button--${variant} button--${size} ${className}`.trim()}
      {...props}
    />
  )
})

export default Button
