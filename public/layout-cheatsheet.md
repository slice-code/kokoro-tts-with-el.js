# layout.js Cheatsheet

## What it is
- `layout.js` is a full-featured application layout framework built on `el.js`
- Provides routing, theming, sidebar/navbar management, and UI components
- Requires `el.js` to be loaded first
- Creates a complete app shell with navigation, sidebar, and content areas

## Core Requirements
- Must have `<div id="app"></div>` in HTML
- Must load `el.js` library first: `https://unpkg.com/@slice-code/el.js@1.0.6/el.js`
- Uses hash-based routing (`#/path`)

## Public API Methods

### Routing
```js
layout.addPage({
  path: '/dashboard',
  component: () => el('div').text('Dashboard'),
  roles: ['admin', 'user'], // Optional RBAC
  hideLayout: false, // Optional: hide navbar/sidebar
  fullWidthDesktop: false, // Optional: full width on desktop
  pageContentPadding: '10px' // Optional: override padding
});

layout.navigate('/dashboard'); // Navigate to page
layout.navigate('/dashboard', true); // Replace history
layout.isValidRoute('/dashboard'); // Check if route exists
layout.isCrudDynamicRoute('/users/create'); // Check if CRUD route
```

### Menus
```js
// Add sidebar menu
layout.addSideMenu([
  {
    name: 'Dashboard',
    page: '/dashboard',
    icon: 'fas fa-home',
    roles: ['admin'] // Optional RBAC
  },
  {
    name: 'Settings',
    icon: 'fas fa-cog',
    children: [ // Dropdown menu
      { name: 'General', page: '/settings/general' },
      { name: 'Security', page: '/settings/security' }
    ]
  }
]);

// Add navbar menu
layout.addNavbar([
  { name: 'Dashboard', page: '/dashboard' },
  { name: 'Profile', page: '/profile' }
]);
```

### RBAC (Role-Based Access Control)
```js
layout.setRole('admin'); // Set current user role
layout.getRole(); // Get current role
```

### Middleware
```js
layout.middleware((path, pageConfig) => {
  // Run before each page render
  // Return { allowed: false, redirect: '/login' } to block
  return { allowed: true };
});
```

### Themes
```js
layout.setTheme('default'); // Built-in themes
// Available: default, blue, dark, light, purple, green, red, orange, teal, pink, gray

layout.setCustomTheme({
  navbarBg: '#333',
  navbarColor: '#fff',
  sidebarBg: '#444',
  sidebarColor: '#fff'
});
```

### UI Components
```js
// Toast notifications
layout.toast('Message', { 
  type: 'success', // success, error, warning, info
  title: 'Title',
  duration: 3000 
});

// Alias
layout.notify('Message', { type: 'info', title: 'Title' });

// Confirmation dialog
layout.confirm({
  title: 'Delete?',
  message: 'Are you sure?',
  confirmText: 'Delete',
  cancelText: 'Cancel',
  onConfirm: () => { /* do something */ },
  onCancel: () => { /* cancelled */ },
  dismissible: true
});

layout.closeConfirm(); // Close confirmation

// Modal dialog
layout.modal({
  title: 'Modal Title',
  content: 'Content or el.js element',
  size: 'medium', // small, medium, large, full
  dismissible: true,
  buttons: [
    { 
      text: 'Save', 
      variant: 'primary', // primary, secondary, outline
      onClick: () => {},
      closeOnClick: true 
    }
  ],
  footer: customFooterElement // Optional custom footer
});

layout.customModal({ /* same as modal */ });
layout.closeModal(); // Close modal

// Loading indicator
layout.showLoader();
layout.hideLoader();
```

### Navbar
```js
layout.setNavbarTitle('My App'); // Set navbar title
```

### Initialize
```js
layout.render(); // Must call after setup
```

## Page Configuration Options
```js
{
  path: '/path',
  component: () => el('div'), // Required: function returning el.js element
  roles: ['admin'], // Optional: restrict by role
  hideLayout: false, // Optional: hide navbar/sidebar (e.g., login page)
  fullWidthDesktop: false, // Optional: full width content (hide sidebar)
  pageContentPadding: '10px' // Optional: custom padding
}
```

## Menu Item Structure
```js
// Regular menu item
{
  name: 'Dashboard',
  nameKey: 'sidebar.dashboard', // Optional: i18n key (uses window.i18n.t)
  page: '/dashboard',
  icon: 'fas fa-home',
  roles: ['admin'] // Optional: RBAC restriction
}

// Dropdown menu item (with children)
{
  name: 'Settings',
  nameKey: 'sidebar.settings',
  icon: 'fas fa-cog',
  roles: ['admin'],
  children: [
    { name: 'General', page: '/settings/general' },
    { name: 'Security', page: '/settings/security' }
  ]
}
```

## Features

### 1. **Hash-Based Routing**
- Uses `window.location.hash` for routing
- Supports dynamic routes (`/customers/:id/history`)
- CRUD routes: `/resource/create`, `/resource/edit/:id`
- Triggers `window.triggerCrudCreate(resource)` and `window.triggerCrudEdit(resource, id)`

### 2. **Responsive Design**
- Mobile: ≤768px (hamburger menu, overlay sidebar)
- Desktop: >768px (persistent sidebar)
- Auto-detects on window resize

### 3. **Desktop Sidebar Hide Mode**
- Toggle switch in navbar (desktop only)
- Collapses sidebar to 4px strip
- Hover to reveal (floating overlay)
- Persists state in localStorage (`layoutDesktopHideMode`)
- Hidden on mobile automatically

### 4. **Theme System**
- 11 built-in themes with navbar + sidebar colors
- Custom theme support via `setCustomTheme()`
- Auto-detects light/dark themes for hover styles
- Updates all UI elements dynamically

### 5. **RBAC (Role-Based Access Control)**
- Role-restricted pages (`roles` in page config)
- Role-filtered menus (hidden if user doesn't have role)
- Automatic redirect to best allowed page
- Special handling for cashier role → `/kasir`

### 6. **Middleware Support**
- Async functions that run before page render
- Can block navigation and redirect
- Multiple middlewares run in sequence
- Error handling built-in

### 7. **Sidebar Dropdowns**
- Collapsible menu groups with chevron icon
- Auto-open when child is active
- Smooth chevron rotation animation
- Only one dropdown open at a time

### 8. **Notification System**
- Toast notifications (auto-dismiss with timer)
- Confirmation dialogs (OK/Cancel)
- Custom modals with multiple buttons
- Click outside to dismiss (if dismissible)
- Scrollable modal body for long content

## Internal Structure

### State Variables
- `pages` - Registered pages object
- `currentPage` - Current active page path
- `sideMenus` - Sidebar menu items array
- `navbarMenus` - Navbar menu items array
- `currentTheme` - Active theme name
- `navbarTitleText` - Navbar title text
- `openDropdowns` - Set of open sidebar dropdowns
- `currentRole` - Current user role (RBAC)
- `middlewares` - Middleware functions array
- `desktopHideMode` - Sidebar collapsed mode state
- `isMobile` - Mobile detection flag
- `sidebarVisible` - Mobile sidebar state
- `dropdownVisible` - User dropdown state

### Connector Object
The `connector` object stores references to DOM elements:
- `container` - Main layout container
- `navbar` - Navigation bar element
- `navbarTitle` - Title element
- `navbarActions` - Right side of navbar
- `navbarBackButton` - Back button (shown when sidebar hidden)
- `sidebar` - Sidebar element
- `sidebarHideSwitchSlot` - Toggle switch container
- `sidebarHideToggle` - Toggle track
- `sidebarHideToggleHandle` - Toggle handle
- `pagecontent` - Content area
- `content` - Content wrapper (sidebar + pagecontent)
- `userDropdown` - User menu container
- `userIcon` - User icon element
- `dropdownMenu` - Dropdown menu
- `menuToggle` - Hamburger menu button (mobile)

## CSS Layout System
Uses `cssLayouting` object with desktop/mobile configurations:

### Desktop Layout
- `container`: flex column, 100dvh height
- `navBar`: flex row, 50px height, space-between
- `content`: flex row (sidebar + pagecontent)
- `sidebar`: 250px width, block display
- `pagecontent`: flex 1, auto overflow
- `dropdownMenu`: absolute positioned, hidden
- `dropdownMenuOpen`: absolute positioned, visible

### Mobile Layout
- `container`: flex column, 100dvh height
- `navBar`: flex row, 50px height
- `content`: flex column (stacked)
- `sidebar`: fixed overlay, full screen, hidden by default
- `sidebarOpen`: fixed overlay, visible
- `pagecontent`: flex 1, auto overflow

## Built-in CSS Classes
```css
.sidebar-dropdown-menu { display: none/block }
.sidebar-dropdown-menu.open { display: block }
.sidebar-item { base style, :hover, .active }
.sidebar-dropdown-item { base style, :hover, .active }
.dropdown-item { base style, :hover, .active }
.sidebar-switch { toggle switch styles }
.sidebar-switch.active { active state }
```

## Event Handlers
- `hashchange` - Triggers page navigation
- `resize` - Updates responsive layout
- `click` (document) - Closes user dropdown
- `mouseenter` (sidebar) - Shows sidebar in hide mode
- `mouseleave` (sidebar) - Hides sidebar after delay

## Global Exposure
```js
window.addNavbar = layout.addNavbar;
window.setLayoutTheme = layout.setTheme;
window.setCustomTheme = layout.setCustomTheme;
```

## Dynamic Route Resolution
```js
// Matches /customers/123/history to /customers/:id/history
normalizePagePath(path) // Removes query params
resolvePageRoute(path) // Matches dynamic routes
```

## Color Utility
```js
isColorLight(color) // Determines if color is light or dark
// Used to adjust hover styles for themes
```

## Best Practices
1. Call `layout.render()` after all setup is complete
2. Register pages before navigating
3. Use `layout.navigate()` instead of manual hash changes
4. Set role with `layout.setRole()` before rendering menus
5. Use middleware for authentication/authorization checks
6. Handle async components (return Promises from component functions)
7. Use `nameKey` for i18n support (requires `window.i18n.t()`)
8. Always return el.js elements from page components
9. Use `.get()` on el.js elements before passing to layout
10. Configure `hideLayout: true` for pages like login/signup
11. Use `fullWidthDesktop: true` for content that needs full width
12. Close modals/dialogs with provided methods, not manual DOM manipulation

## Example: Complete Setup
```js
// 1. Add pages
layout.addPage({
  path: '/',
  component: () => el('div').text('Home')
});

layout.addPage({
  path: '/dashboard',
  component: () => el('div').text('Dashboard'),
  roles: ['admin', 'user']
});

layout.addPage({
  path: '/login',
  component: () => el('div').text('Login'),
  hideLayout: true
});

// 2. Add menus
layout.addSideMenu([
  { name: 'Dashboard', page: '/dashboard', icon: 'fas fa-home' }
]);

layout.addNavbar([
  { name: 'Dashboard', page: '/dashboard' }
]);

// 3. Set role
layout.setRole('admin');

// 4. Add middleware
layout.middleware((path, pageConfig) => {
  if (path === '/dashboard' && !isLoggedIn) {
    return { allowed: false, redirect: '/login' };
  }
  return { allowed: true };
});

// 5. Set theme
layout.setTheme('blue');

// 6. Set navbar title
layout.setNavbarTitle('My App');

// 7. Render
layout.render();
```

## Summary
`layout.js` is a complete application framework that provides:
- ✅ Hash-based routing with dynamic route support
- ✅ Responsive design (mobile/desktop)
- ✅ 11 built-in themes + custom theme support
- ✅ RBAC (Role-Based Access Control)
- ✅ Middleware support for auth/authorization
- ✅ Sidebar with dropdowns and hide mode
- ✅ Navbar with user dropdown
- ✅ Toast notifications
- ✅ Confirmation dialogs
- ✅ Custom modals with buttons
- ✅ Loading indicators
- ✅ Desktop sidebar hover reveal
- ✅ Persistent sidebar state (localStorage)
- ✅ i18n support via nameKey

Built on `el.js` and uses a connector pattern for DOM references. Perfect for SPAs with admin dashboards, CRMs, and complex web applications.
