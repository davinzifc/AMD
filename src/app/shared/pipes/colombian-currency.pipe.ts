import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'colombianCurrency' })
export class ColombianCurrencyPipe implements PipeTransform {
  transform(value: number | null | undefined, decimals: number = 2): string {
    if (value == null) return '';
    const rounded = Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    const parts = rounded.toFixed(decimals).split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return decimals > 0 ? `${intPart},${parts[1]}` : intPart;
  }
}
