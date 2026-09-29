import {
  Shirt,
  Sparkles,
  Utensils,
  Laptop,
  BookOpen,
  MoreHorizontal,
} from "lucide-react";

export const MARKETPLACE_CATEGORIES = [
  {
    name: "Fashion",
    slug: "fashion",
    description: "Clothes, shoes and accessories",
    icon: Shirt,
  },
  {
    name: "Beauty",
    slug: "beauty",
    description: "Perfumes, cosmetics and skincare",
    icon: Sparkles,
  },
  {
    name: "Food",
    slug: "food",
    description: "Meals, snacks and drinks",
    icon: Utensils,
  },
  {
    name: "Tech",
    slug: "tech",
    description: "Gadgets and accessories",
    icon: Laptop,
  },
  {
    name: "Books",
    slug: "books",
    description: "Books and academic materials",
    icon: BookOpen,
  },
  {
    name: "More",
    slug: "more",
    description: "Discover more student businesses",
    icon: MoreHorizontal,
  },
];

export const getCategoryBySlug = (slug) =>
  MARKETPLACE_CATEGORIES.find(
    (category) => category.slug === slug
  );