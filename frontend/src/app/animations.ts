import type { Variants } from 'motion/react'

export const springPop: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 20 },
  },
}

export const springSlide: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },
}

export const springHeavy: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 200, damping: 30 },
  },
}

export const easeOut: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
}

export const easeInOut: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeInOut' },
  },
}

export const messageVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 350, damping: 28 },
  },
}

export const sourceContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
}

export const sourceCardVariants: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
}

export const listVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
}

export const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 350, damping: 28 },
  },
}

export const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
}

export const sidebarContainerVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 300, damping: 30, staggerChildren: 0.04 },
  },
}

export const sidebarItemVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 350, damping: 28 },
  },
}

export const dotVariants: Variants = {
  initial: { y: 0 },
  animate: {
    y: [-4, 0, -4],
    transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
  },
}

export const buttonVariants = {
  idle: { scale: 1 },
  hover: { scale: 1.04, transition: { type: 'spring', stiffness: 400, damping: 15 } },
  tap: { scale: 0.96, transition: { type: 'spring', stiffness: 500, damping: 20 } },
}

export const cardHoverVariants = {
  idle: { boxShadow: '0 0 0px rgba(124,58,237,0)' },
  hover: { boxShadow: '0 0 20px rgba(124,58,237,0.25)', transition: { duration: 0.2 } },
}

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 380, damping: 24 },
  },
}

export const pulseGlow = {
  animate: {
    boxShadow: [
      '0 0 20px rgba(124,58,237,0.2)',
      '0 0 40px rgba(124,58,237,0.4)',
      '0 0 20px rgba(124,58,237,0.2)',
    ],
    transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
  },
}
