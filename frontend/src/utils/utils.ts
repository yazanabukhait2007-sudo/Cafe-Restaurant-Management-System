import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const oklabToRgb = (L: number, a_lab: number, b_lab: number, alpha: number): string => {
  // OKLab to LMS
  const l_lms = L + 0.3963377774 * a_lab + 0.2158037573 * b_lab;
  const m_lms = L - 0.1055613458 * a_lab - 0.0638541728 * b_lab;
  const s_lms = L - 0.0894841775 * a_lab - 1.2914855480 * b_lab;
  
  // LMS cubed
  const l_cube = Math.pow(Math.max(0, l_lms), 3);
  const m_cube = Math.pow(Math.max(0, m_lms), 3);
  const s_cube = Math.pow(Math.max(0, s_lms), 3);
  
  // LMS to Linear sRGB
  const r_lin = +4.0767416621 * l_cube - 3.3077115913 * m_cube + 0.2309699292 * s_cube;
  const g_lin = -1.2684380046 * l_cube + 2.6097574011 * m_cube - 0.3413193965 * s_cube;
  const b_lin = -0.0041960863 * l_cube - 0.7034186147 * m_cube + 1.7076147010 * s_cube;
  
  // Linear sRGB to standard sRGB
  const toSRGB = (x: number) => {
    const val = x >= 0.0031308 ? 1.055 * Math.pow(x, 1 / 2.4) - 0.055 : 12.92 * x;
    return Math.max(0, Math.min(255, Math.round(val * 255)));
  };
  
  const r_val = toSRGB(r_lin);
  const g_val = toSRGB(g_lin);
  const b_val = toSRGB(b_lin);
  
  if (alpha === 1) {
    return `rgb(${r_val}, ${g_val}, ${b_val})`;
  } else {
    return `rgba(${r_val}, ${g_val}, ${b_val}, ${alpha})`;
  }
};

const parseAndConvertColors = (colorStr: string): string => {
  if (!colorStr || typeof colorStr !== 'string') return colorStr;
  
  let res = colorStr;
  
  // Handle oklch(...)
  res = res.replace(/oklch\(([^)]+)\)/gi, (match, contents) => {
    const parts = contents.trim().replace(/,/g, ' ').replace(/\s+/g, ' ').split('/');
    const colors = parts[0].trim().split(' ');
    if (colors.length < 3) return match;
    
    // Normalize values
    const l = parseFloat(colors[0]) * (colors[0].endsWith('%') ? 0.01 : 1);
    const c = parseFloat(colors[1]) * (colors[1].endsWith('%') ? 0.004 : 1); // 100% = 0.4
    let h = parseFloat(colors[2]);
    if (colors[2].toLowerCase().endsWith('rad')) h = (h * 180) / Math.PI;
    const a = parts[1] ? parseFloat(parts[1]) * (parts[1].trim().endsWith('%') ? 0.01 : 1) : 1;
    
    if (isNaN(l) || isNaN(c) || isNaN(h)) return match;
    
    const hRad = (h * Math.PI) / 180;
    return oklabToRgb(l, c * Math.cos(hRad), c * Math.sin(hRad), a);
  });

  // Handle oklab(...)
  res = res.replace(/oklab\(([^)]+)\)/gi, (match, contents) => {
    const parts = contents.trim().replace(/,/g, ' ').replace(/\s+/g, ' ').split('/');
    const colors = parts[0].trim().split(' ');
    if (colors.length < 3) return match;
    
    const l = parseFloat(colors[0]) * (colors[0].endsWith('%') ? 0.01 : 1);
    const a_lab = parseFloat(colors[1]) * (colors[1].endsWith('%') ? 0.004 : 1); // 100% = 0.4
    const b_lab = parseFloat(colors[2]) * (colors[2].endsWith('%') ? 0.004 : 1); // 100% = 0.4
    const alpha = parts[1] ? parseFloat(parts[1]) * (parts[1].trim().endsWith('%') ? 0.01 : 1) : 1;
    
    if (isNaN(l) || isNaN(a_lab) || isNaN(b_lab)) return match;
    
    return oklabToRgb(l, a_lab, b_lab, alpha);
  });

  return res;
};

export function withOklchPolyfill<T>(callback: () => Promise<T>): Promise<T> {
  if (typeof window === 'undefined') return callback();
  
  const originalGetComputedStyle = window.getComputedStyle;
  
  const patchedGetComputedStyle = function(this: any, elt: Element, pseudoElt?: string | null): CSSStyleDeclaration {
    const style = originalGetComputedStyle.call(this || window, elt, pseudoElt);
    
    return new Proxy(style, {
      get(target, prop) {
        // Direct property access on target handles native getters with correct 'this'
        let value;
        try {
          value = target[prop as any];
        } catch (e) {
          return undefined;
        }
        
        if (typeof value === 'function') {
          const bound = value.bind(target);
          // Intercept getPropertyValue as it's the primary way html2canvas reads styles
          if (prop === 'getPropertyValue') {
            return (...args: any[]) => {
              const res = bound(...args);
              return (typeof res === 'string' && (res.includes('oklch') || res.includes('oklab')))
                ? parseAndConvertColors(res)
                : res;
            };
          }
          return bound;
        }
        
        if (typeof value === 'string' && (value.includes('oklch') || value.includes('oklab'))) {
          try {
            return parseAndConvertColors(value);
          } catch (e) {
            return 'rgb(0, 0, 0)';
          }
        }
        
        return value;
      }
    });
  };
  
  window.getComputedStyle = patchedGetComputedStyle as any;
  if (typeof document !== 'undefined' && document.defaultView) {
    document.defaultView.getComputedStyle = patchedGetComputedStyle as any;
  }
  
  return callback().finally(() => {
    window.getComputedStyle = originalGetComputedStyle;
    if (typeof document !== 'undefined' && document.defaultView) {
      document.defaultView.getComputedStyle = originalGetComputedStyle;
    }
  });
}

