export const heroTextVariants = {
  hidden: {
    opacity: 0,
    y: 30,
    filter: 'blur(10px)',
  },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      delay: i * 0.15 + 0.3,
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

export const glowPulseVariants = {
  pulse: {
    scale: [1, 1.08, 1],
    opacity: [0.7, 1, 0.7],
    filter: [
      'drop-shadow(0 0 20px rgba(249, 115, 22, 0.6))',
      'drop-shadow(0 0 45px rgba(239, 68, 68, 0.9))',
      'drop-shadow(0 0 20px rgba(249, 115, 22, 0.6))',
    ],
    transition: {
      duration: 3.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const floatingMascotVariants = {
  float: {
    y: [-8, 8, -8],
    rotate: [-1.5, 1.5, -1.5],
    transition: {
      duration: 5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};
