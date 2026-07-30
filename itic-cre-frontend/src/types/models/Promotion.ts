export interface Promotion {
    id: string;
    name: string;
    year: string | null;
}

export interface PromotionData {
    name: string;
    year?: string;
}
