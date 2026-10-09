import {
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  MIXED_COLOR_NAME,
  MIXED_COLOR_SWATCH,
  PRODUCT_COLORS,
  ProductColorOption,
  resolveProductColor
} from '../product-colors';

@Component({
  selector: 'app-product-color-field',
  imports: [FormsModule],
  templateUrl: './product-color-field.component.html'
})
export class ProductColorFieldComponent {

  @Input() color: string | undefined = '';

  @Input() colorName: string | undefined = '';

  @Output() colorChange = new EventEmitter<string>();

  @Output() colorNameChange = new EventEmitter<string>();

  readonly colors = PRODUCT_COLORS;

  readonly mixedName = MIXED_COLOR_NAME;

  readonly mixedSwatch = MIXED_COLOR_SWATCH;

  customOpen = false;

  search = '';

  private nameTouched = false;

  private nameDraft = '';


  get selected(): ReturnType<typeof resolveProductColor> {

    return resolveProductColor(
      this.color,
      this.colorName
    );

  }


  get visibleColors(): ProductColorOption[] {

    const query =
      this.search.trim().toLowerCase();

    if (!query) {

      return this.colors;

    }

    return this.colors.filter(
      option =>
        option.name.toLowerCase().includes(query)
    );

  }


  get showMixed(): boolean {

    const query =
      this.search.trim().toLowerCase();

    return !query || 'mixed'.includes(query);

  }


  get showCustom(): boolean {

    return this.customOpen || this.isCustomSelection;

  }


  get isCustomSelection(): boolean {

    const name =
      this.selected.colorName;

    if (!this.selected.color || !name) {

      return false;

    }

    if (name === this.mixedName) {

      return false;

    }

    return !this.colors.some(
      option =>
        option.name === name &&
        option.hex.toUpperCase() ===
          this.selected.color.toUpperCase()
    );

  }


  get customPickerValue(): string {

    return this.isCustomSelection
      ? this.selected.color
      : '#16A34A';

  }


  get customNameValue(): string {

    if (this.nameTouched) {

      return this.nameDraft;

    }

    const name =
      (this.colorName ?? '').trim();

    if (
      !name ||
      name.toLowerCase() === 'custom'
    ) {

      return '';

    }

    if (!this.isCustomSelection) {

      return '';

    }

    return name;

  }


  isChosen(
    option: ProductColorOption
  ): boolean {

    return this.selected.colorName === option.name &&
      this.selected.color.toUpperCase() ===
        option.hex.toUpperCase();

  }


  get mixedChosen(): boolean {

    return this.selected.colorName === this.mixedName;

  }


  get customChosen(): boolean {

    return this.showCustom;

  }


  choose(
    option: ProductColorOption
  ): void {

    this.resetCustomDraft();

    this.colorChange.emit(option.hex);

    this.colorNameChange.emit(option.name);

  }


  chooseMixed(): void {

    this.resetCustomDraft();

    this.colorChange.emit('');

    this.colorNameChange.emit(this.mixedName);

  }


  openCustom(): void {

    this.customOpen = true;

  }


  onCustomPicked(
    value: string
  ): void {

    const name =
      this.customNameValue.trim();

    if (!name) {

      const next =
        resolveProductColor(value, 'Custom');

      if (next.colorName !== 'Custom') {

        this.resetCustomDraft();

        this.colorChange.emit(next.color);

        this.colorNameChange.emit(next.colorName);

        return;

      }

    }

    this.emitCustom(value, name);

  }


  onCustomName(
    value: string
  ): void {

    this.nameTouched = true;

    this.nameDraft = value;

    if (!this.isCustomSelection && !this.customOpen) {

      return;

    }

    const hex =
      this.isCustomSelection
        ? this.selected.color
        : '';

    if (!hex) {

      return;

    }

    this.emitCustom(hex, value);

  }


  clear(): void {

    this.resetCustomDraft();

    this.colorChange.emit('');

    this.colorNameChange.emit('');

  }


  private emitCustom(
    hex: string,
    name: string
  ): void {

    const colorName =
      name.trim() || 'Custom';

    this.colorChange.emit(hex.toUpperCase());

    this.colorNameChange.emit(colorName);

  }


  private resetCustomDraft(): void {

    this.customOpen = false;

    this.nameTouched = false;

    this.nameDraft = '';

  }

}
