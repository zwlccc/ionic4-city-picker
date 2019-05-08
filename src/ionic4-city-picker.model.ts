export interface CityPickerColumn {
    name?: string;
    code?: string;
    children?: CityPickerColumn[];
  }
  
  export interface CityData {
    province?: string;
    city?: string;
    region?: string;
  }
  