import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { ValidationError } from '../../models/processing.model';

@Component({
  selector: 'app-validation-errors',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './validation-errors.component.html',
  styleUrl: './validation-errors.component.scss',
})
export class ValidationErrorsComponent {
  errors = input.required<ValidationError[]>();
}
