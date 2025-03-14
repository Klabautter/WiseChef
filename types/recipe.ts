export interface Ingredient {
  name: string;
  amount?: string;
  isExpiringSoon?: boolean;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: Ingredient[];
  instructions: string[];
  cookingTime: number;
  difficulty: 'Einfach' | 'Mittel' | 'Schwer';
  servings: number;
  imageUrl?: string;
  tips?: string[];
  createdAt: string;
} 