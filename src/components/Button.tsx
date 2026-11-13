import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

/** Class names for a button look, so links can share it: <Link className={buttonClass('primary')}>. */
export function buttonClass(variant: ButtonProps['variant'] = 'primary', size: ButtonProps['size'] = 'md', extra = '') {
  return ['btn', `btn-${variant}`, size !== 'md' ? `btn-${size}` : '', extra].filter(Boolean).join(' ');
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...props}>
      {icon && <span className="btn-icon">{icon}</span>}
      {children}
    </button>
  );
}
