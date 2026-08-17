export interface Promotion {
    id: string;
    name: string;
    year: string | null;
    hasYears?: boolean;
    availableYears?: number[];
}

export interface PromotionData {
    name: string;
    year?: string;
    hasYears?: boolean;
    availableYears?: number[];
}
