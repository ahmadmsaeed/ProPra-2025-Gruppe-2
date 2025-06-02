import { Pipe, PipeTransform } from '@angular/core';

/**
 * Truncate pipe to limit text length and add ellipsis
 * Usage: {{ longText | truncate:25 }}
 */
@Pipe({
  name: 'truncate',
  standalone: true
})
export class TruncatePipe implements PipeTransform {
  transform(value: string, limit: number = 25, completeWords: boolean = false, ellipsis: string = '...'): string {
    if (!value) return '';
    if (value.length <= limit) return value;
    
    if (completeWords) {
      limit = value.substring(0, limit).lastIndexOf(' ');
    }
    
    return `${value.substring(0, limit)}${ellipsis}`;
  }
}
