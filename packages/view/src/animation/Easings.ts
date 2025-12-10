import bezier from 'bezier-easing';

import { AnimationEasing } from './Animation';

export const LinearEasing: AnimationEasing = it => it;

export const CssEasings: Record<string, AnimationEasing> = {
  Ease: bezier(0.25, 0.1, 0.25, 1.0),
  EaseIn: bezier(0.42, 0, 1.0, 1.0),
  EaseOut: bezier(0, 0, 0.58, 1.0),
  EaseInOut: bezier(0.42, 0, 0.58, 1.0),
};

export const Material3Easings: Record<string, AnimationEasing> = {
  Emphasized: bezier(0.2, 0.0, 0, 1.0), // N/A (Use Standard as a fallback)
  EmphasizedDecelerate: bezier(0.05, 0.7, 0.1, 1.0),
  EmphasizedAccelerate: bezier(0.3, 0.0, 0.8, 0.15),
  Standard: bezier(0.2, 0.0, 0, 1.0),
  StandardDecelerate: bezier(0, 0, 0, 1),
  StandardAccelerate: bezier(0.3, 0, 1, 1),
};
