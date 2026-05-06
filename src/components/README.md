# Components Organization

This directory contains all React components organized by their type and purpose.

## Directory Structure

### 📦 `core/`
Basic UI primitives and fundamental components that serve as building blocks for the entire application.
- **Buttons, inputs, selects, checkboxes** - Form controls
- **Cards, badges, alerts** - Content containers
- **Tables, data-tables** - Data display primitives
- **Dialogs, drawers, sheets** - Overlay components
- **Loading, skeleton** - Loading states
- **Typography** - Text components

### 🏗️ `layout/`
Components responsible for page structure and navigation layout.
- **Sidebars** - Navigation sidebars for different sections
- **Breadcrumbs** - Navigation breadcrumbs
- **Headers, footers** - Page layout components

### 📝 `forms/`
Form-specific components and form-related utilities.
- **Form inputs, selects** - Form field components
- **Form validation** - Validation components
- **Form layouts** - Form structure components

### 💬 `feedback/`
Components that provide user feedback and interactions.
- **Modals** - Dialog boxes and overlays
- **Alerts, notifications** - User notifications
- **Confirmations** - Confirmation dialogs
- **Error states** - Error handling components

### 🧭 `navigation/`
Components for navigation and user interaction.
- **Tabs** - Tab navigation components
- **Action dropdowns** - Action menus
- **Navigation menus** - Menu components
- **Pagination** - Page navigation

### 📊 `data-display/`
Components for displaying and managing data.
- **Data tables** - Table components for different entities
- **Charts, graphs** - Data visualization
- **Lists, grids** - Data listing components
- **Filters** - Data filtering components

### 🎨 `media/`
Components for handling media and visual content.
- **Image upload** - Image handling components
- **Animations** - Animated components
- **Visual effects** - Special visual components

### 🏢 `business-logic/`
Domain-specific components that implement business functionality.
- **Authentication** - Auth-related components
- **Orders** - Order management components
- **Sections** - Business-specific sections
- **Shared business components** - Reusable business logic
- **Field management** - Dynamic field components

## Usage Guidelines

1. **Import from appropriate category**: Import components from their respective category directories
2. **Maintain separation**: Keep components in their designated categories
3. **Documentation**: Add JSDoc comments for complex components
4. **Naming**: Use kebab-case for file names and PascalCase for component names

## Example Imports

```tsx
// Core components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Layout components
import { Sidebar } from '@/components/layout/sidebar'
import { Breadcrumb } from '@/components/layout/breadcrumb'

// Business logic components
import { ProtectedRoute } from '@/components/business-logic/protected-route'
import { OrderTable } from '@/components/business-logic/orders/order-table'
```

## Migration Notes

- All existing imports should be updated to reflect the new directory structure
- Components have been moved based on their primary function and usage
- Some components may appear in multiple categories if they serve multiple purposes

