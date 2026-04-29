# Supabase SQL Files

This directory contains the database schema and functions for the Grossary app.

## Essential Files (Keep These)

### Core Database Structure
- **`schema.sql`** - Main database schema with tables, indexes, views, and core functions
- **`add_user_roles.sql`** - User role system (free, premium, admin)

### App Functions (Used by React Hooks)
- **`supabase_function_avg_prices.sql`** - Used by `useProductAverages()` hook
- **`essential_functions.sql`** - Consolidated functions used by your React hooks

### Feature Modules
- **`shopping_lists_schema.sql`** - Shopping lists feature (if implemented)
- **`community_social.sql`** - Community features (if implemented)

### Optional/Future Features
- **`product_images.sql`** - Product image handling
- **`supabase_function_recent_prices.sql`** - Enhanced recent prices function

## Setup Instructions

1. Run `schema.sql` first to create the basic database structure
2. Run `add_user_roles.sql` to add user roles
3. Run `supabase_function_avg_prices.sql` for price averaging functionality
4. Run other feature files as needed

## Functions Used by React Hooks

- `get_product_averages()` → `useProductAverages()`
- `search_products()` → `useProductSearch()`
- `search_products_nearby()` → `useProductSearch()` with location
- `nearby_stores()` → Used internally by search functions

## Removed Files

Cleaned up duplicate/outdated files:
- `enhanced_price_estimation*.sql` (duplicates)
- `price_estimation*.sql` (old versions)
- `schema_updates*.sql` (old versions)
- `corrected_best_deal_logic.sql` (outdated)
- `complete_corrected_functions.sql` (outdated)