export type ProductKind = 'food' | 'cosmetic';

/** Raw-ish shape of the fields we request from Open Food / Beauty Facts. */
export interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string;
  quantity?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
  ingredients?: { id?: string; text?: string; percent_estimate?: number; vegan?: string }[];
  ingredients_analysis_tags?: string[];
  additives_tags?: string[];
  allergens_tags?: string[];
  traces_tags?: string[];
  labels_tags?: string[];
  categories_tags?: string[];
  nutriscore_grade?: string;
  nova_group?: number;
  ecoscore_grade?: string;
  nutriments?: Record<string, number | string | undefined>;
  image_front_url?: string;
  image_front_small_url?: string;
  image_url?: string;
  countries_tags?: string[];
  serving_size?: string;
}

/** Normalised product used everywhere in the UI. */
export interface Product {
  barcode: string;
  kind: ProductKind;
  name: string;
  brand: string;
  quantity?: string;
  imageUrl?: string;
  ingredientsText: string;
  ingredientList: string[];
  additives: string[];
  allergens: string[];
  traces: string[];
  labels: string[];
  categories: string[];
  analysisTags: string[];
  nutriScore?: string;
  novaGroup?: number;
  ecoScore?: string;
  nutriments: Nutriments;
  servingSize?: string;
}

export interface Nutriments {
  energyKcal?: number;
  fat?: number;
  saturatedFat?: number;
  carbohydrates?: number;
  sugars?: number;
  fiber?: number;
  proteins?: number;
  salt?: number;
  sodium?: number;
}

export interface SearchHit {
  barcode: string;
  name: string;
  brand: string;
  imageUrl?: string;
  kind: ProductKind;
  nutriScore?: string;
  novaGroup?: number;
}

export class ProductNotFoundError extends Error {
  constructor(public barcode: string) {
    super(`No product found for barcode ${barcode}`);
    this.name = 'ProductNotFoundError';
  }
}

export class NetworkError extends Error {
  constructor(message = 'Could not reach the product database') {
    super(message);
    this.name = 'NetworkError';
  }
}
