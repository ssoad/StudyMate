import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
  style?: React.CSSProperties;
}

export function Card({ children, className = '', glass = false, style }: CardProps) {
  return (
    <div 
      className={`${glass ? 'glass-panel animate-fade-in' : 'card animate-fade-in'} ${className}`} 
      style={style}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', style }: { children: React.ReactNode, className?: string, style?: React.CSSProperties }) {
  return <div className={`card-header ${className}`} style={style}>{children}</div>;
}

export function CardBody({ children, className = '', style }: { children: React.ReactNode, className?: string, style?: React.CSSProperties }) {
  return <div className={`card-body ${className}`} style={style}>{children}</div>;
}

export function CardFooter({ children, className = '', style }: { children: React.ReactNode, className?: string, style?: React.CSSProperties }) {
  return <div className={`card-footer ${className}`} style={style}>{children}</div>;
}
