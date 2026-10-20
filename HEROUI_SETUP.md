# 🎨 HeroUI Integration Guide - Quadra SaaS

## ✅ What's Been Done

### 1. **Dependencies Installed**
- HeroUI (@heroui/react, @heroui/theme)
- TailwindCSS for utility-first styling
- PostCSS & Autoprefixer for CSS processing
- Framer Motion for animations

### 2. **Configuration Files Created**
- `tailwind.config.js` - TailwindCSS configuration with HeroUI plugin
- `postcss.config.js` - PostCSS configuration for TailwindCSS
- `src/index.css` - Global styles with CSS variables for theming

### 3. **Components Updated to HeroUI**

#### Dashboard.jsx
- ✅ Navbar with HeroUI Navbar component
- ✅ Reconciliation counter using Chip component
- ✅ File upload section with Card components
- ✅ Results table using HeroUI Table
- ✅ Buttons with HeroUI Button component

#### Sidebar.jsx
- ✅ Complete redesign with HeroUI Button components
- ✅ Improved visual hierarchy
- ✅ Theme toggle functionality maintained
- ✅ Active state styling with gradient background

### 4. **Styling System**
- CSS variables for consistent theming
- Light/Dark mode support
- Responsive design with TailwindCSS
- Smooth animations and transitions

---

## 🚀 Next Steps

### Step 1: Start Development Server
```bash
cd frontend
npm run dev
```

### Step 2: Test the Current Updates
Visit http://localhost:5173 and verify:
- [ ] Navbar displays correctly
- [ ] Sidebar menu items work
- [ ] File upload section renders
- [ ] Dark mode toggle works
- [ ] Responsive design on mobile

### Step 3: Update Remaining Components

#### Components that need HeroUI updates:
1. **ControlPagos.jsx** - Add HeroUI Input, Card, Table
2. **LiquidacionSalarial.jsx** - Add HeroUI Form components
3. **VentaActivoFijo.jsx** - Add HeroUI Card, Input, Button
4. **ImportarDocumentos.jsx** - File upload improvements
5. **TodoDelDia.jsx** - List/Checkbox components
6. **MetasAnuales.jsx** - Progress indicators
7. **Cotizacion.jsx** - Table/Card improvements
8. **LeccionDelDia.jsx** - Card layout
9. **GestionClientes.jsx** - Table and form improvements
10. **ChangePassword.jsx** - Form inputs and modal

### Step 4: Component Update Template

When updating components, follow this pattern:

```jsx
// Add HeroUI imports
import { Card, CardBody, CardHeader, Button, Input, Table, ... } from '@heroui/react'

// Replace old HTML elements:
// Old: <div className="card">
// New: <Card><CardBody>...</CardBody></Card>

// Old: <button className="btn">
// New: <Button>...</Button>

// Old: <input type="text">
// New: <Input placeholder="..." />
```

### Step 5: Test Dark Mode
- Verify theme toggle works
- Check all colors in both light and dark modes
- Test on different screen sizes

---

## 📝 Color Palette

```css
--primary: #1B2A4A    (Navy Blue)
--accent: #6366F1     (Indigo)
--success: #10B981    (Green)
--error: #EF4444      (Red)
--warning: #F59E0B    (Amber)
```

---

## 🎯 HeroUI Components Used

- **Navbar** - Navigation bar with theme toggle
- **Card/CardBody/CardHeader** - Content containers
- **Button** - Action buttons with variants (primary, secondary, bordered)
- **Input** - Form inputs
- **Table/TableHeader/TableColumn/TableBody/TableRow/TableCell** - Data tables
- **Chip** - Labels and badges
- **Spinner** - Loading indicator
- **Modal/ModalContent/ModalHeader/ModalBody/ModalFooter** - Dialogs
- **Divider** - Visual separators

---

## 🔧 Common HeroUI Props

```jsx
// Buttons
<Button color="primary" size="lg" disabled={loading}>Click me</Button>
<Button variant="bordered" fullWidth>Bordered Button</Button>
<Button isIconOnly><Icon /></Button>

// Cards
<Card>
  <CardHeader>Title</CardHeader>
  <CardBody>Content</CardBody>
</Card>

// Input
<Input 
  label="Email" 
  placeholder="Enter email"
  type="email"
  isRequired
/>

// Table
<Table>
  <TableHeader>
    <TableColumn>Name</TableColumn>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Value</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

## 📚 Useful Resources

- HeroUI Docs: https://heroui.com/
- TailwindCSS Docs: https://tailwindcss.com/docs
- HeroUI Components: https://heroui.com/docs/guide/introduction

---

## ⚠️ Important Notes

1. **Tailwind classes are now available** - Use `className="flex gap-4 mb-4"` for styling
2. **CSS variables still work** - Use `color: var(--primary)` if needed
3. **Dark mode is automatic** - Use `dark:bg-slate-900` for dark-mode-specific styles
4. **Responsive design** - Use `md:`, `lg:`, `sm:` prefixes for responsive classes

---

## 🐛 Troubleshooting

### If components don't appear:
1. Clear node_modules: `rm -rf node_modules && npm install`
2. Clear browser cache (Ctrl+Shift+Delete)
3. Restart dev server

### If TailwindCSS classes aren't working:
1. Check `tailwind.config.js` includes all source files
2. Verify `index.css` is imported in `main.jsx`
3. Check for typos in class names

### If dark mode doesn't work:
1. Check that `html[data-theme="dark"]` CSS exists
2. Verify localStorage is being used to persist theme
3. Test with `document.documentElement.classList.toggle('dark')`

---

**Generated:** 2026-10-20  
**Status:** Ready for next component updates
