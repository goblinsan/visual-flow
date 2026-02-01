export interface GradientFill {
  type: 'linear' | 'radial';
  colors: string[];
  angle?: number;
}

export interface GradientPickerProps {
  gradient: GradientFill | undefined;
  onGradientChange: (gradient: GradientFill | undefined) => void;
  solidColor: string | undefined;
  onSolidColorChange: (color: string | undefined) => void;
}

export function gradientToCSS(gradient: GradientFill): string {
  const { type, colors, angle } = gradient;
  if (type === 'linear') {
    return `linear-gradient(${angle ?? 0}deg, ${colors.join(', ')})`;
  }
  return `radial-gradient(circle, ${colors.join(', ')})`;
}