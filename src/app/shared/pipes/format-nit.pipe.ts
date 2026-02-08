import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formatea NIT con separador de miles (punto).
 * Solo se consideran dígitos: 1111111 => 1.111.111
 */
export function formatNit(value: string | null | undefined): string {
  if (value == null || value === '') return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return value;
  const reversed = digits.split('').reverse();
  const parts: string[] = [];
  for (let i = 0; i < reversed.length; i += 3) {
    parts.push(reversed.slice(i, i + 3).reverse().join(''));
  }
  return parts.reverse().join('.');
}

@Pipe({ name: 'formatNit', standalone: true })
export class FormatNitPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatNit(value);
  }
}
