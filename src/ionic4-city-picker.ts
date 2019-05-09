import { Component, Directive, AfterContentInit, OnDestroy, HostListener, ChangeDetectorRef, Input, Output , EventEmitter, forwardRef, ViewEncapsulation } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { PickerController } from '@ionic/angular';
import { PickerButton, PickerColumn, PickerOptions, PickerColumnOption, Mode, SelectPopoverOption, StyleEventDetail } from '@ionic/core';
import { CityPickerColumn, CityData } from './ionic4-city-picker.model';

export const CITY_PICKER_VALUE_ACCESSOR: any = {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => IonCityPicker),
    multi: true
};

@Component({
  selector: 'ionic4-city-picker', 
  template:
  '<div class="city-picker-text">{{cityText}}</div>' +
  '<button type="button"  ' +
          'role="ombobox" ' +
          'aria-haspopup="true"  ' +
          '[attr.aria-labelledby]="labelId" ' +
          '[attr.aria-disabled]="disabled" ' +
          '[attr.aria-expanded]="isExpanded" ' +
          'class="city-picker-button">' +
  '</button>',
  styleUrls: ['ionic4-city-picker.scss'],
  host: {
    '[class.city-picker-disabled]': 'disabled',
    '[class.city-picker-readonly]': 'readonly',
    '[class.city-picker-placeholder]': 'addPlaceholderClass'
  },
  providers: [CITY_PICKER_VALUE_ACCESSOR],
  encapsulation: ViewEncapsulation.None,
})
export class IonCityPicker implements AfterContentInit, ControlValueAccessor {

  private cityIds = 0;
  private inputId = `ion-city-${this.cityIds++}`;
  public labelId = this.inputId + `-lbl`;
  private cityValue: CityData = {};
  public cityText = '';
  public addPlaceholderClass = false;
  private buttonEl?: HTMLButtonElement;
  public isExpanded = false;

  private isLoadData = false;

  private provinceCol = 0;
  private cityCol = 0;
  private regionCol = 0;
  
  private onChange: Function = (randomNumber: number) => {};

  private onTouch: Function = () => {};

  /**
   * The value of the city string.
   */
  @Input() value = '';

  /**
   * The mode determines which platform styles to use.
   */
  @Input() mode!: Mode;

  /**
   * The name of the control, which is submitted with the form data.
   */
  @Input() name: string = this.inputId;

  /**
   * If `true`, the user cannot interact with the city.
   */
  @Input() disabled = false;

  /**
   * If `true`, the city appears normal but is not interactive.
   */
  @Input() readonly = false;

  /**
   * Any additional options that the picker interface can accept.
   * See the [Picker API docs](https://ionicframework.com/docs/api/picker) for the picker options.
   */
  @Input() pickerOptions?: SelectPopoverOption;

  /**
   * @input {string} The text to display on the picker's cancel button. Default: `Cancel`.
   */
  @Input() cancelText = 'Cancel';

  /**
   * @input {string} The text to display on the picker's "Done" button. Default: `Done`.
   */
  @Input() doneText = 'Done';

  /**
   * @input {CityPickerColumn} city data
   */
  @Input() citiesData: CityPickerColumn[] = [];

  /**
   * @input {string} separate
   */
  @Input() separator = '-';

  /**
   * The text to display when there's no city selected yet.
   * Using lowercase to match the input attribute
   */
  @Input() placeholder?: string | null;

  /**
   * @output {any} Emitted when the city selection has changed.
   */
  @Output() ionChange: EventEmitter<any> = new EventEmitter();

  /**
   * @output {any} Emitted when the city selection was cancelled.
   */
  @Output() ionCancel: EventEmitter<any> = new EventEmitter();

  /**
   * Emitted when the styles change.
   * @internal
   */
  @Output() ionStyle: EventEmitter<StyleEventDetail>= new EventEmitter();


  constructor(
      private pickerCtrl: PickerController,
      private changeDetectorRef: ChangeDetectorRef
  ) {
  }

  ngAfterContentInit() {
    this.cityText = this.value;
    if (this.cityText === '') {
      this.cityText = this.placeholder != null ? this.placeholder : '';
    }
    this.hasReadonly();
    this.hasDisable();
    this.updateCityValue(this.value);
    this.emitStyle();
  }


  ngAfterContentChecked() {
    if(this.isLoadData || this.citiesData.length ===0){
     return;
    }
    this.hasPlaceholder();
    this.updateCityValue(this.value);
    this.isLoadData = true;

  }

  writeValue(val: any) {
    this.setValue(val);
  }

  registerOnChange(fn: Function): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: Function) { 
    this.onTouch = fn; 
  }

  @HostListener('click', ['$event.target'])
  onClick(ev: UIEvent) {
    if (ev.detail === 0) {
      // do not continue if the click event came from a form submit
      return;
    }
    this.setFocus();
    this.open();
  }

  @HostListener('keyup', ['$event.target'])
  onKeyup(ev: UIEvent) {
    if (!this.isExpanded) {
      this.open();
    }
  }

  private async open() {
    if (this.disabled || this.isExpanded) {
      return;
    }
    const pickerOptions = this.generatePickerOptions();
    const picker = await this.pickerCtrl.create(pickerOptions);

    this.isExpanded = true;

    picker.onDidDismiss().then(() => {
      this.updateCityValue(this.value);
      this.isExpanded = false;
      this.setFocus();
    });
    
    picker.addEventListener('ionPickerColChange', async (event: any) => {
      const data = event.detail;

      if (data.name !== 'province' && data.name !== 'city' && data.name !== 'region') { return; }

      const colSelectedIndex = data.selectedIndex;
      const colOptions = data.options;

      const changeData: any = {};
      changeData[data.name] = {
        value: colOptions[colSelectedIndex].value
      };

      this.updateCityValue(changeData);
      const columns = this.generateColumns();

      picker.columns = columns;

      await this.valiCity(picker);
    });
    await this.valiCity(picker);

    await picker.present();
  }

  private emitStyle() {
    this.hasPlaceholder();
    this.ionStyle.emit({
      'interactive': true,
      'city': true,
      'has-placeholder': this.placeholder != null,
      'has-value': this.hasValue(),
      'interactive-disabled': this.disabled,
    });
  }

  private async updateCityValue(value: any) {
    this.updateValue(this.cityValue, value, this.separator);
  }


  private generatePickerOptions(): PickerOptions {
    const pickerOptions: PickerOptions = {
      mode: this.mode,
      ...this.pickerOptions,
      columns: this.generateColumns()
    };

    // If the user has not passed in picker buttons,
    // add a cancel and ok button to the picker
    const buttons = pickerOptions.buttons;
    if (!buttons || buttons.length === 0) {
      pickerOptions.buttons = [
        {
          text: this.cancelText,
          handler: (data) => {
            this.ionCancel.emit();
          }
      }, {
          text: this.doneText,
          handler: (data) => {
            this.value = this.convertDuration(data, 'value');
            this.cityText = this.convertDuration(data, 'text');
            this.updateCityValue(data);
            this.emitStyle();
            this.ionChange.emit(this);
            this.changeDetectorRef.detectChanges();
          }
      }
      ];
    }
    return pickerOptions;
  }

  private convertDuration(durationObject, type) {
      const province = durationObject.province[type].toString();
      const city = durationObject.city[type].toString();
      const region = durationObject.region[type].toString();

      return province + this.separator + city  + this.separator + region;
  }


  private generateColumns(): PickerColumn[] {
    const columns =[];
    // const values = this.value.toString().split(this.separator);
    // Add province data to picker
    const provinceCol: PickerColumn = {
      name:  'province',
      options: this.citiesData.map( province => ({text: province.name, value: province.code, disabled: false, duration: 100}))
    };
    let provinceIndex = this.citiesData.findIndex( option => option.code === this.cityValue.province);
    provinceCol.selectedIndex = provinceIndex === -1 ? 0 : provinceIndex;
    columns.push(provinceCol);

    // Add city data to picker
    const cityColData = this.citiesData[provinceCol.selectedIndex].children;
    const cityCol: PickerColumn = {
      name:  'city',
      options: cityColData.map( city => ({text: city.name, value: city.code, disabled: false, duration: 100}))
    };
    let cityIndex = cityColData.findIndex( option => option.code === this.cityValue.city);
    cityCol.selectedIndex = cityIndex === -1 ? 0 : cityIndex;
    columns.push(cityCol);

    // Add region data to picker
    const regionData = this.citiesData[provinceCol.selectedIndex].children[cityCol.selectedIndex].children;
    const regionColCol: PickerColumn = {
      name:  'region',
      options: regionData.map( city => ({text: city.name, value: city.code, disabled: false, duration: 100}))
    };
    let regionIndex = regionData.findIndex( option => option.code === this.cityValue.region);
    regionColCol.selectedIndex = regionIndex === -1 ? 0 : regionIndex;

    columns.push(regionColCol);

    this.provinceCol = provinceCol.selectedIndex;
    this.cityCol     = cityCol.selectedIndex;
    this.regionCol   = regionColCol.selectedIndex;
    return this.divyColumns(columns);
  }

  private async valiCity(picker: HTMLIonPickerElement) {

    let columns = picker.columns;

    let provinceCol = columns[0];
    let cityCol = columns[1];
    let regionCol = columns[2];

    if(cityCol && this.provinceCol != provinceCol.selectedIndex){
      cityCol.selectedIndex = 0;
      let cityColData = this.citiesData[provinceCol.selectedIndex].children;
      cityCol.options =  cityColData.map( city => { return {text: city.name, value: city.code, disabled: false} });
    }

    if(regionCol && (this.cityCol != cityCol.selectedIndex || this.provinceCol != provinceCol.selectedIndex)){
      let regionData = this.citiesData[provinceCol.selectedIndex].children[cityCol.selectedIndex].children;
      regionCol.selectedIndex = 0;
      regionCol.options = regionData.map( city => {return { text: city.name, value: city.code, disabled: false }} );
    }

    this.provinceCol = provinceCol.selectedIndex;
    this.cityCol     = cityCol.selectedIndex;
    this.regionCol   = regionCol.selectedIndex;
  }

  setValue(newData: any) {
    if (newData === null || newData === undefined) {
      this.value = '';
    } else {
      this.value = newData;
    }
    this.updateCityValue(this.value);
    this.getText();
  }

  getValue(): string {
    return this.value;
  }

  getText() {
    if (
      this.value === undefined ||
      this.value === null ||
      this.value.length === 0
    ) { return; }

    this.cityText = this.renderValue(this.value);
    return this.cityText;
  }

  private hasValue(): boolean {
    const val = this.cityValue;
    return Object.keys(val).length > 0;
  }

  private async setFocus() {
    if (this.buttonEl) {
      this.buttonEl.focus();
    }
  }

  private divyColumns(columns: PickerColumn[]): PickerColumn[] {
    const columnsWidth: number[] = [];
    let col: PickerColumn;
    let width: number;
    for (let i = 0; i < columns.length; i++) {
      col = columns[i];
      columnsWidth.push(0);
  
      for (const option of col.options) {
        width = option.text!.length;
        if (width > columnsWidth[i]) {
          columnsWidth[i] = width;
        }
      }
    }
  
    if (columnsWidth.length === 2) {
      width = Math.max(columnsWidth[0], columnsWidth[1]);
      columns[0].align = 'right';
      columns[1].align = 'left';
      columns[0].optionsWidth = columns[1].optionsWidth = `${width * 17}px`;
  
    } else if (columnsWidth.length === 3) {
      width = Math.max(columnsWidth[0], columnsWidth[2]);
      columns[0].align = 'right';
      columns[2].align = 'left';
    }
    return columns;
  }

  private updateValue(existingData: CityData, newData: any, separator: string): boolean {
  
    if (newData && newData !== '') {
  
      if (typeof newData === 'string') {
        // new value is a string
        // convert it to our CityData if a valid
        newData = this.parseValue(newData);
        if (newData) {
          // successfully parsed string to our CityData
          Object.assign(existingData, newData);
          return true;
        }
  
      } else if ((newData.province || newData.city || newData.region)) {       
        // merge new values from the picker's selection
        // to the existing CityData values
        for (const key of Object.keys(newData)) {
          (existingData as any)[key] = newData[key].value;
        }
        return true;
      }
  
    } else {
      // blank data, clear everything out
      for (const k in existingData) {
        if (existingData.hasOwnProperty(k)) {
          delete (existingData as any)[k];
        }
      }
    }
    return false;
  }

  private parseValue(val: string | undefined | null): CityData | undefined {
    let parse: any[] | null = null;
  
    if (val != null && val !== '') {
      // try parsing for just value first
      parse = val.split(this.separator);
    }
  
    if (parse === null) {
      // wasn't able to parse the value
      return undefined;
    }
  
    return {
      province: parse[0],
      city: parse[1],
      region: parse[2]
    };
  }

  private renderValue(val: string | undefined): string | undefined {
    let parse: any[] | null = null;
  
    if (val != null && val !== '') {
      // try parsing for just value first
      parse = val.split(this.separator);
    }
  
    if (parse === null) {
      // wasn't able to parse the value
      return undefined;
    }

    let textValue;
    this.citiesData.forEach(pro =>{
      if (pro.code !== parse[0]){
        return;
      }
      textValue = pro.name;
      pro.children.forEach(city =>{
        if (city.code !== parse[1]){
          return;
        }
        textValue = textValue + this.separator + city.name;
        city.children.forEach(reg =>{
          if (reg.code !== parse[2]){
            return;
          }        
          textValue = textValue + this.separator + reg.name;
        });
      });
    });
  
    return textValue;
  }

  private async hasPlaceholder(){
    this.addPlaceholderClass =
      (this.getText() === undefined && this.placeholder != null) ? true : false;
  }

  private async hasReadonly(){
    this.readonly = 
      (this.readonly.toString() === '' || this.readonly.toString() === 'true' || this.readonly === true) ? true : false;
  }

  private async hasDisable(){
    this.disabled = 
      (this.disabled.toString() === '' || this.disabled.toString() === 'true' || this.disabled === true) ? true : false;
  }

}
